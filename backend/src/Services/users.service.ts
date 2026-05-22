import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../AWS/dynamodb.service';
import * as AWS from 'aws-sdk';

@Injectable()
export class UsersService {
    private tableName = process.env.TABLE_USERS || 'Users';

    constructor(private readonly dynamoDBService: DynamoDBService) {}

    async getAllUsers() {
        return this.dynamoDBService.scan(this.tableName);
    }
    async getUserById(userId: string) {
        return this.dynamoDBService.get(this.tableName, { user_id: userId });
    }
    async deleteUser(userId: string): Promise<void> {
        // 1. Fetch the user
        const user = await this.dynamoDBService.get(this.tableName, { user_id: userId });
        if (!user) throw new Error('User not found');

        const oldTeamId: string = user.team_id || null;

        // 2. Remove user from old team's members list
        if (oldTeamId) {
            const team = await this.dynamoDBService.get(
                process.env.TABLE_TEAMS || 'Teams',
                { team_id: oldTeamId }
            );
            if (team) {
                let members: string[] = [];
                if (team.members) {
                    members = Array.isArray(team.members)
                        ? team.members
                        : Array.from(team.members.values());
                }
                const updatedMembers = members.filter(m => m !== userId);
                await this.dynamoDBService.update(
                    process.env.TABLE_TEAMS || 'Teams',
                    { team_id: oldTeamId },
                    'SET members = :members',
                    { ':members': updatedMembers }
                );
            }
        }

        // 3. Delete all tasks assigned to this user
        const tasks = await this.dynamoDBService.scan(
            process.env.TABLE_TASKS || 'Tasks',
            'assignee_id = :uid',
            { ':uid': userId }
        );
        if (tasks) {
            for (const task of tasks) {
                await this.dynamoDBService.delete(
                    process.env.TABLE_TASKS || 'Tasks',
                    { task_id: task.task_id }
                );
            }
        }

        // 4. Delete the user from DynamoDB
        await this.dynamoDBService.delete(this.tableName, { user_id: userId });

        // 5. Clear Cognito custom:team_id (so they have no team if they log in again)
        try {
            const cognito = new AWS.CognitoIdentityServiceProvider({
                region: process.env.COGNITO_REGION || 'us-east-1',
            });
            await cognito.adminUpdateUserAttributes({
                UserPoolId: process.env.COGNITO_USER_POOL_ID as string,
                Username: userId,
                UserAttributes: [{ Name: 'custom:team_id', Value: '' }],
            }).promise();
        } catch (err) {
            console.error('Cognito update error:', err);
        }
    }
}