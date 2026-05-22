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
        const teams = await this.dynamoDBService.scan(this.tableName);
        if (!teams) return [];
        return teams.map((team: any) => ({
            ...team,
            members: this.normaliseMembers(team.members),
        }));
    }

    async addUserToTeam(dto: AddUserToTeamDto, requestingUser: any): Promise<any> {
        if (requestingUser.role !== 'Manager') {
            throw new ForbiddenException('Only managers can add users to teams');
        }

        // 1. Fetch the current user record from DynamoDB
        const currentUser = await this.dynamoDBService.get(
            this.usersTable,
            { user_id: dto.user_id },
        );
        const oldTeamId: string = currentUser?.team_id || null;

        // 2. If the user already belongs to a team AND it’s different from the new one,
        //    remove them from the old team's members list
        if (oldTeamId && oldTeamId !== dto.team_id) {
            const oldTeam = await this.dynamoDBService.get(
                this.tableName,
                { team_id: oldTeamId },
            );
            if (oldTeam) {
                const oldMembers = this.normaliseMembers(oldTeam.members);
                const updatedMembers = oldMembers.filter(m => m !== dto.user_id);
                await this.dynamoDBService.update(
                    this.tableName,
                    { team_id: oldTeamId },
                    'SET members = :members',
                    { ':members': updatedMembers },
                );
            }
        }

        // 3. Update the Users table with the new team_id
        await this.dynamoDBService.update(
            this.usersTable,
            { user_id: dto.user_id },
            'SET team_id = :teamId',
            { ':teamId': dto.team_id },
        );

        // 4. Add user to the new team's members list (avoid duplicates)
        const newTeam = await this.dynamoDBService.get(
            this.tableName,
            { team_id: dto.team_id },
        );
        if (!newTeam) throw new Error('Team not found');

        const newMembers = this.normaliseMembers(newTeam.members);
        if (!newMembers.includes(dto.user_id)) {
            newMembers.push(dto.user_id);
            await this.dynamoDBService.update(
                this.tableName,
                { team_id: dto.team_id },
                'SET members = :members',
                { ':members': newMembers },
            );
        }

        // 5. Update Cognito custom:team_id
        const cognito = new AWS.CognitoIdentityServiceProvider({
            region: this.cognitoRegion,
        });
        await cognito.adminUpdateUserAttributes({
            UserPoolId: this.userPoolId,
            Username: dto.user_id,
            UserAttributes: [
                { Name: 'custom:team_id', Value: dto.team_id },
            ],
        }).promise();

        return { message: 'User assigned to team successfully' };
    }
    private normaliseMembers(members: any): string[] {
        if (!members) return [];
        if (Array.isArray(members)) return members;
        // If it's a DynamoDB Set (SS type), it has a .values() method
        if (typeof members.values === 'function') return Array.from(members.values());
        // If it's a corrupted nested list of {S: "..."} maps, extract them
        if (typeof members === 'object') {
            const extracted: string[] = [];
            const recursiveExtract = (obj: any) => {
                if (Array.isArray(obj)) obj.forEach(recursiveExtract);
                else if (obj && typeof obj === 'object') {
                    if (obj.S) extracted.push(obj.S);
                    else Object.values(obj).forEach(recursiveExtract);
                }
            };
            recursiveExtract(members);
            if (extracted.length > 0) return extracted;
        }
        // Fallback: if it's a single string
        if (typeof members === 'string') return [members];
        return [];
    }

    async getTeamById(teamId: string): Promise<any> {
        const team = await this.dynamoDBService.get(this.tableName, { team_id: teamId });
        if (team) {
            team.members = this.normaliseMembers(team.members);
        }
        return team;
    }
    async deleteTeam(teamId: string, requestingUser: any): Promise<any> {
        if (requestingUser.role !== 'Manager') {
            throw new ForbiddenException('Only managers can delete teams');
        }

        // 1. Unassign all users who belong to this team
        const teamMembers = await this.dynamoDBService.scan(
            this.usersTable,
            'team_id = :teamId',
            { ':teamId': teamId }
        );
        if (teamMembers) {
            for (const user of teamMembers) {
                // Update DynamoDB
                await this.dynamoDBService.update(
                    this.usersTable,
                    { user_id: user.user_id },
                    'SET team_id = :empty',
                    { ':empty': '' }
                );
                // Clear Cognito custom:team_id
                try {
                    const cognito = new AWS.CognitoIdentityServiceProvider({
                        region: this.cognitoRegion,
                    });
                    await cognito.adminUpdateUserAttributes({
                        UserPoolId: this.userPoolId,
                        Username: user.user_id,
                        UserAttributes: [{ Name: 'custom:team_id', Value: '' }],
                    }).promise();
                } catch (err) {
                    console.error('Cognito update error:', err);
                }
            }
        }

        // 2. Remove team from all projects that include it
        const allProjects = await this.dynamoDBService.scan(
            process.env.TABLE_PROJECTS || 'Projects'
        );
        if (allProjects) {
            for (const project of allProjects) {
                if (project.teams && Array.isArray(project.teams) && project.teams.includes(teamId)) {
                    const updatedTeams = project.teams.filter((id: string) => id !== teamId);
                    await this.dynamoDBService.update(
                        process.env.TABLE_PROJECTS || 'Projects',
                        { project_id: project.project_id },
                        'SET teams = :teams',
                        { ':teams': updatedTeams }
                    );
                }
            }
        }

        // 3. Delete the team itself
        await this.dynamoDBService.delete(this.tableName, { team_id: teamId });

        return { message: 'Team deleted successfully' };
    }
}