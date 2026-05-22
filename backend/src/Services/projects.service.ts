import { Injectable, ForbiddenException } from '@nestjs/common';
import { DynamoDBService } from '../AWS/dynamodb.service';
import { CreateProjectDto } from '../DTOs/Projects/create-project.dto';
import { UpdateProjectDto } from '../DTOs/Projects/update-project.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectsService {
    private tableName = process.env.TABLE_PROJECTS || 'Projects';

    constructor(private readonly dynamoDBService: DynamoDBService) {}

    async createProject(dto: CreateProjectDto, creatorUserId: string) {
        const project = {
            project_id: uuidv4(),
            name: dto.name,
            description: dto.description,
            teams: dto.teams || [],
            created_by: creatorUserId,
            created_at: new Date().toISOString(),
        };
        await this.dynamoDBService.put(this.tableName, project);
        return project;
    }

    private normaliseTeams(project: any): string[] {
        if (!project || !project.teams) return [];
        if (Array.isArray(project.teams)) return project.teams;
        // DynamoDB returns a Set – convert to array
        return Array.from(project.teams.values());
    }

    async getProjects(user: any) {
        if (user.role === 'Manager') {
            return this.dynamoDBService.scan(this.tableName);
        }
        const allProjects = await this.dynamoDBService.scan(this.tableName);
        if (!allProjects) return [];

        return allProjects.filter((project: any) => {
            const teams = this.normaliseTeams(project);
            return teams.includes(user.teamId);
        });
    }

    async getProjectById(projectId: string, user?: any) {
        const project = await this.dynamoDBService.get(this.tableName, { project_id: projectId });
        if (!project) return null;

        if (user && user.role !== 'Manager') {
            const teams = this.normaliseTeams(project);
            if (!teams.includes(user.teamId)) {
                throw new ForbiddenException('Access denied');
            }
        }
        return project;
    }
    async updateProject(projectId: string, dto: UpdateProjectDto, user: any) {
        if (user.role !== 'Manager') {
            throw new ForbiddenException('Only managers can update projects');
        }
        const project = await this.getProjectById(projectId);
        if (!project) throw new Error('Project not found');

        let updateExpression = 'SET';
        const expressionAttributeValues: any = {};
        const expressionAttributeNames: any = {};
        const updates: string[] = [];

        for (const key of Object.keys(dto)) {
            if (dto[key] !== undefined) {
                // Handle reserved keywords
                if (key === 'name') {
                    expressionAttributeNames['#name'] = 'name';
                    updates.push(`#name = :${key}`);
                } else {
                    updates.push(`${key} = :${key}`);
                }
                expressionAttributeValues[`:${key}`] = dto[key];
            }
        }

        if (updates.length === 0) return project;

        updates.push('updated_at = :updated_at');
        expressionAttributeValues[':updated_at'] = new Date().toISOString();
        updateExpression += ' ' + updates.join(', ');

        const result = await this.dynamoDBService.update(
            this.tableName,
            { project_id: projectId },
            updateExpression,
            expressionAttributeValues,
            Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        );
        return result.Attributes;
    }

    async deleteProject(projectId: string, user: any) {
        if (user.role !== 'Manager') {
            throw new ForbiddenException('Only managers can delete projects');
        }
        await this.dynamoDBService.delete(this.tableName, { project_id: projectId });
        return { message: 'Project deleted' };
    }
}