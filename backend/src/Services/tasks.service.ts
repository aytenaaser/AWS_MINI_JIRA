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
    private sns = new AWS.SNS({ region: process.env.AWS_REGION || 'us-east-1' });
    private snsTopicArn = process.env.SNS_TOPIC_ARN;
    private cloudwatch = new AWS.CloudWatch({ region: process.env.AWS_REGION || 'us-east-1' });

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
        await this.publishAssignmentEvent(task);
        if (task.assignee_id) {
            const assigneeUser = await this.dynamoDBService.get('Users', { user_id: task.assignee_id });
            const assigneeEmail = assigneeUser?.email || '';
            await this.subscribeAssigneeToTopic(assigneeEmail);
            await this.publishAssignmentEvent(task, assigneeEmail);   // <-- pass email here
        }
        // Audit log entry for creation
        await this.addAuditLog(task.task_id, creatorUserId, '', 'To Do');

        // Publish CloudWatch metric for tasks created per day
        try {
            await this.cloudwatch.putMetricData({
                Namespace: 'MiniJira',
                MetricData: [{
                    MetricName: 'TasksCreatedPerDay',
                    Dimensions: [{ Name: 'Team', Value: task.team_id }],
                    Value: 1,
                    Unit: 'Count',
                    Timestamp: new Date(),
                }],
            }).promise();
        } catch (err) {
            console.error('Metric error:', err);
        }

        return task;
    }

    async getTasks(user: any) {
        if (user.role === 'Manager') {
            // Manager sees all tasks
            return this.dynamoDBService.scan(this.tableName);
        } else {
            if (!user.teamId) {
                // No team assigned – return empty array to avoid invalid query
                return [];
            }
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
            // Employee must belong to the same team as the task
            if (task.team_id !== user.teamId) {
                throw new ForbiddenException('You can only update tasks in your own team');
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
        const expressionAttributeNames: any = {};
        const updates: string[] = [];

        for (const key of Object.keys(updateTaskDto)) {
            if ((updateTaskDto as any)[key] !== undefined) {
                // Handle reserved keyword 'status' by using #status placeholder
                if (key === 'status') {
                    expressionAttributeNames['#status'] = 'status';
                    updates.push(`#status = :${key}`);
                } else {
                    updates.push(`${key} = :${key}`);
                }
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
            Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        );

        // ----- Assignee change: publish and auto-subscribe -----
        if (updateTaskDto.assignee_id && updateTaskDto.assignee_id !== task.assignee_id) {
            const updatedTask = { ...task, ...updateTaskDto };

            // Subscribe the new assignee and get their email
            try {
                const newAssignee = await this.dynamoDBService.get('Users', { user_id: updateTaskDto.assignee_id });
                const newEmail = newAssignee?.email || '';
                if (newEmail) {
                    await this.subscribeAssigneeToTopic(newEmail);
                }
                // Pass the email to the publish method so the message attribute is set
                await this.publishAssignmentEvent(updatedTask, newEmail);
            } catch (err) {
                console.error('Failed to process assignee change:', err);
            }
        }

        // ----- CloudWatch metric when task is closed -----
        if (updateTaskDto.status === 'Done' && task.status !== 'Done') {
            try {
                await this.cloudwatch.putMetricData({
                    Namespace: 'MiniJira',
                    MetricData: [{
                        MetricName: 'TasksClosedPerTeam',
                        Dimensions: [{ Name: 'Team', Value: task.team_id }],
                        Value: 1,
                        Unit: 'Count',
                        Timestamp: new Date(),
                    }],
                }).promise();
            } catch (err) {
                console.error('CloudWatch metric error:', err);
            }
        }

        return result.Attributes;
    }
    async generateViewUrl(taskId: string, user: any): Promise<string> {
        const task = await this.getTaskById(taskId, user);
        if (!task || !task.image_key) throw new Error('No image attached');

        const url = await this.s3.getSignedUrlPromise('getObject', {
            Bucket: this.originalsBucket,
            Key: task.image_key,
            Expires: 60, // seconds
        });
        return url;
    }
    private async subscribeAssigneeToTopic(email: string) {
        if (!email || !this.snsTopicArn) return;
        try {
            const subs = await this.sns.listSubscriptionsByTopic({
                TopicArn: this.snsTopicArn as string,
            }).promise();
            const alreadySubscribed = subs.Subscriptions?.some(
                s => s.Protocol === 'email' && s.Endpoint === email
            );
            if (alreadySubscribed) return;

            await this.sns.subscribe({
                TopicArn: this.snsTopicArn as string,
                Protocol: 'email',
                Endpoint: email,
                Attributes: {
                    FilterPolicy: JSON.stringify({
                        assignee_email: [email],
                    }),
                },
            }).promise();
            console.log(`Subscribed ${email} with filter policy – pending confirmation`);
        } catch (err) {
            console.error('SNS subscription error:', err);
        }
    }
    async deleteTask(taskId: string, user: any) {
        const task = await this.getTaskById(taskId, user);
        if (!task) throw new Error('Task not found');
        if (user.role !== 'Manager') {
            throw new ForbiddenException('Only managers can delete tasks');
        }

        // Delete the attached image (original + resized) from S3
        if (task.image_key) {
            try {
                await this.s3.deleteObject({
                    Bucket: this.originalsBucket,
                    Key: task.image_key,
                }).promise();

                await this.s3.deleteObject({
                    Bucket: process.env.S3_BUCKET_RESIZED || 'my-minijira-resized-bucket',
                    Key: task.image_key,   // same key in both buckets
                }).promise();
            } catch (err) {
                console.error('Failed to delete S3 images:', err);
            }
        }

        // Delete the task from DynamoDB
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
            Expires: 60,                      // URL expires in 60 seconds
            ContentType: 'image/jpeg',        // restrict to JPEG
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

    private async publishAssignmentEvent(task: any, assigneeEmail: string = '') {
        if (!task.assignee_id) return;
        const message = {
            event: 'task_assigned',
            task_id: task.task_id,
            title: task.title,
            assignee_id: task.assignee_id,
            team_id: task.team_id,
            priority: task.priority,
            deadline: task.deadline,
            assigned_by: task.created_by,
            timestamp: new Date().toISOString(),
        };
        try {
            await this.sns.publish({
                TopicArn: this.snsTopicArn,
                Subject: `Task Assigned: ${task.title}`,
                Message: JSON.stringify(message),
                MessageAttributes: {
                    assignee_id: { DataType: 'String', StringValue: task.assignee_id },
                    team_id: { DataType: 'String', StringValue: task.team_id },
                    ...(assigneeEmail && {
                        assignee_email: { DataType: 'String', StringValue: assigneeEmail },
                    }),
                },
            }).promise();
        } catch (err) {
            console.error('SNS publish error:', err);
        }
    }

}