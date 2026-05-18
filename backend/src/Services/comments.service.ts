import { Injectable, ForbiddenException } from '@nestjs/common';
import { DynamoDBService } from '../AWS/dynamodb.service';
import { CreateCommentDto } from '../DTOs/Comments/create-comment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CommentsService {
    private tableName = process.env.TABLE_COMMENTS || 'Comments';
    private tasksTable = process.env.TABLE_TASKS || 'Tasks';

    constructor(private readonly dynamoDBService: DynamoDBService) {}

    async addComment(dto: CreateCommentDto, userId: string, user: any) {
        // Verify task exists and user has access
        const task = await this.dynamoDBService.get(this.tasksTable, { task_id: dto.task_id });
        if (!task) throw new Error('Task not found');
        if (user.role !== 'Manager' && task.team_id !== user.teamId) {
            throw new ForbiddenException('Access denied');
        }

        const comment = {
            comment_id: uuidv4(),
            task_id: dto.task_id,
            user_id: userId,
            text: dto.text,
            created_at: new Date().toISOString(),
        };
        await this.dynamoDBService.put(this.tableName, comment);
        return comment;
    }

    async getCommentsByTask(taskId: string, user: any) {
        // Verify task access
        const task = await this.dynamoDBService.get(this.tasksTable, { task_id: taskId });
        if (!task) throw new Error('Task not found');
        if (user.role !== 'Manager' && task.team_id !== user.teamId) {
            throw new ForbiddenException('Access denied');
        }

        // Scan with filter (you may later add a GSI on task_id)
        const comments = await this.dynamoDBService.scan(
            this.tableName,
            'task_id = :taskId',
            { ':taskId': taskId },
        );
        return comments;
    }
}