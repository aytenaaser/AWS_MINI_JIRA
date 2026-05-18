import { Injectable, ForbiddenException } from '@nestjs/common';
import { DynamoDBService } from '../AWS/dynamodb.service';
import { CreateTeamDto } from '../DTOs/Teams/create-team.dto';
import { AddUserToTeamDto } from '../DTOs/Teams/add-user-to-team.dto';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TeamsService {
    private tableName = process.env.TABLE_TEAMS || 'Teams';
    private usersTable = process.env.TABLE_USERS || 'Users';
    private cognitoRegion = process.env.COGNITO_REGION || 'us-east-1';
    private userPoolId = process.env.COGNITO_USER_POOL_ID as string;

    constructor(private readonly dynamoDBService: DynamoDBService) {}

    async createTeam(dto: CreateTeamDto): Promise<any> {
        const teamId = uuidv4();
        const team = {
            team_id: teamId,
            name: dto.name,
            members: [],
        };
        await this.dynamoDBService.put(this.tableName, team);
        return team;
    }

    async getAllTeams(): Promise<any[]> {
        const items = await this.dynamoDBService.scan(this.tableName);
        return items || [];
    }

    async addUserToTeam(dto: AddUserToTeamDto, requestingUser: any): Promise<any> {
        if (requestingUser.role !== 'Manager') {
            throw new ForbiddenException('Only managers can add users to teams');
        }

        // 1. Update the Users table
        await this.dynamoDBService.update(
            this.usersTable,
            { user_id: dto.user_id },
            'SET team_id = :teamId',
            { ':teamId': dto.team_id },
        );

        // 2. Add user to the team's members list (avoid duplicates)
        const team = await this.dynamoDBService.get(this.tableName, { team_id: dto.team_id });
        if (!team) throw new Error('Team not found');
        const members: string[] = team.members || [];
        if (!members.includes(dto.user_id)) {
            members.push(dto.user_id);
            await this.dynamoDBService.update(
                this.tableName,
                { team_id: dto.team_id },
                'SET members = :members',
                { ':members': members },
            );
        }

        // 3. Update Cognito custom:team_id
        const cognito = new AWS.CognitoIdentityServiceProvider({ region: this.cognitoRegion });
        await cognito.adminUpdateUserAttributes({
            UserPoolId: this.userPoolId,
            Username: dto.user_id,
            UserAttributes: [
                { Name: 'custom:team_id', Value: dto.team_id },
            ],
        }).promise();

        return { message: 'User added to team successfully' };
    }

    async getTeamById(teamId: string): Promise<any> {
        return this.dynamoDBService.get(this.tableName, { team_id: teamId });
    }

    async deleteTeam(teamId: string, requestingUser: any): Promise<any> {
        if (requestingUser.role !== 'Manager') {
            throw new ForbiddenException('Only managers can delete teams');
        }
        await this.dynamoDBService.delete(this.tableName, { team_id: teamId });
        return { message: 'Team deleted' };
    }
}