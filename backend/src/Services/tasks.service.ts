import { Injectable, ForbiddenException } from '@nestjs/common';
import { DynamoDBService } from '../AWS/dynamodb.service';
import { CreateTaskDto } from '../DTOs/Tasks/create-task.dto';
import { UpdateTaskDto } from '../DTOs/Tasks/update-task.dto';
import { v4 as uuidv4 } from 'uuid';
import * as AWS from 'aws-sdk';

@Injectable()
export class TasksService {
    private tableName = process.env.TABLE_TASKS || 'Tasks';
    private auditTable = process.env.TABLE_ACTIVITY_LOG || 'Audit_Log';
    private s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
    private originalsBucket = process.env.S3_BUCKET_ORIGINALS || 'my-minijira-originals-bucket';

    constructor(private readonly dynamoDBService: DynamoDBService) {}

    async createTask(createTaskDto: CreateTaskDto, creatorUserId: string) {
        const task = {
            task_id: uuidv4(),
            ...createTaskDto,
            status: 'To Do',
            created_by: creatorUserId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        await this.dynamoDBService.put(this.tableName, task);
        // Audit log entry for creation
        await this.addAuditLog(task.task_id, creatorUserId, '', 'To Do');
        return task;
    }

    async getTasks(user: any) {
        if (user.role === 'Manager') {
            // Manager sees all tasks
            return this.dynamoDBService.scan(this.tableName);
        } else {
            // Employee sees only tasks of their team, using the teamId-index GSI
            return this.dynamoDBService.queryByIndex(
                this.tableName,
                'teamId-index',
                'team_id = :teamId',
                { ':teamId': user.teamId },
            );
        }
    }

    async getTaskById(taskId: string, user: any) {
        const task = await this.dynamoDBService.get(this.tableName, { task_id: taskId });
        if (!task) return null;
        if (user.role !== 'Manager' && task.team_id !== user.teamId) {
            throw new ForbiddenException('Access denied');
        }
        return task;
    }

    async updateTask(taskId: string, updateTaskDto: UpdateTaskDto, user: any) {
        const task = await this.getTaskById(taskId, user);
        if (!task) throw new Error('Task not found');

        // Permission checks based on role
        if (user.role === 'Employee') {
            if (task.assignee_id !== user.userId) {
                throw new ForbiddenException('You can only update your own tasks');
            }
            // Employees can update status and attach files (image_key)
            const allowedFields = ['status', 'image_key'];
            const attemptedFields = Object.keys(updateTaskDto).filter(
                k => (updateTaskDto as any)[k] !== undefined,
            );
            const forbiddenFields = attemptedFields.filter(f => !allowedFields.includes(f));
            if (forbiddenFields.length > 0) {
                throw new ForbiddenException('Employees can only update status and attach files');
            }

            // Audit only if status changed
            if (updateTaskDto.status && updateTaskDto.status !== task.status) {
                await this.addAuditLog(taskId, user.userId, task.status, updateTaskDto.status);
            }
        } else if (user.role === 'Manager') {
            // Manager can update any field
            if (updateTaskDto.status && updateTaskDto.status !== task.status) {
                await this.addAuditLog(taskId, user.userId, task.status, updateTaskDto.status);
            }
        }

        // Build dynamic update expression
        let updateExpression = 'SET';
        const expressionAttributeValues: any = {};
        const updates: string[] = [];

        for (const key of Object.keys(updateTaskDto)) {
            if ((updateTaskDto as any)[key] !== undefined) {
                updates.push(`${key} = :${key}`);
                expressionAttributeValues[`:${key}`] = (updateTaskDto as any)[key];
            }
        }
        if (updates.length === 0) return task;
        updates.push('updated_at = :updated_at');
        expressionAttributeValues[':updated_at'] = new Date().toISOString();
        updateExpression += ' ' + updates.join(', ');

        const result = await this.dynamoDBService.update(
            this.tableName,
            { task_id: taskId },
            updateExpression,
            expressionAttributeValues,
        );
        return result.Attributes;
    }

    async deleteTask(taskId: string, user: any) {
        const task = await this.getTaskById(taskId, user);
        if (!task) throw new Error('Task not found');
        if (user.role !== 'Manager') {
            throw new ForbiddenException('Only managers can delete tasks');
        }
        await this.dynamoDBService.delete(this.tableName, { task_id: taskId });
        return { message: 'Task deleted' };
    }

    /**
     * Generate a pre-signed PUT URL for direct S3 upload.
     * Only the task's assignee or a manager can request an upload URL.
     */
    async generateUploadUrl(taskId: string, user: any): Promise<{ uploadUrl: string; imageKey: string }> {
        const task = await this.getTaskById(taskId, user);
        if (!task) throw new Error('Task not found');

        // Permission: either manager or the assignee
        if (user.role !== 'Manager' && task.assignee_id !== user.userId) {
            throw new ForbiddenException('You can only upload files to your own tasks');
        }

        // Create a unique object key (versioning automatically keeps old files)
        const imageKey = `tasks/${taskId}/${uuidv4()}.jpg`;

        const uploadUrl = await this.s3.getSignedUrlPromise('putObject', {
            Bucket: this.originalsBucket,
            Key: imageKey,
            Expires: 900,                      // URL expires in 60 seconds
            ContentType: 'image/jpeg',        // adjust if needed, or allow other types
        });

        return { uploadUrl, imageKey };
    }

    private async addAuditLog(taskId: string, changedBy: string, oldStatus: string, newStatus: string) {
        const logItem = {
            log_id: uuidv4(),
            task_id: taskId,
            changed_by: changedBy,
            old_status: oldStatus,
            new_status: newStatus,
            timestamp: new Date().toISOString(),
        };
        await this.dynamoDBService.put(this.auditTable, logItem);
    }
}