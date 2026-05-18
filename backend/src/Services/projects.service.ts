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
            created_by: creatorUserId,
            created_at: new Date().toISOString(),
        };
        await this.dynamoDBService.put(this.tableName, project);
        return project;
    }

    async getProjects(user: any) {
        // All authenticated users (both manager and employee) can see every project.
        // Team isolation only applies to tasks, not projects.
        return this.dynamoDBService.scan(this.tableName);
    }

    async getProjectById(projectId: string) {
        return this.dynamoDBService.get(this.tableName, { project_id: projectId });
    }

    async updateProject(projectId: string, dto: UpdateProjectDto, user: any) {
        if (user.role !== 'Manager') {
            throw new ForbiddenException('Only managers can update projects');
        }
        const project = await this.getProjectById(projectId);
        if (!project) throw new Error('Project not found');

        let updateExpression = 'SET';
        const expressionAttributeValues: any = {};
        const updates: string[] = [];
        for (const key of Object.keys(dto)) {
            if (dto[key] !== undefined) {
                updates.push(`${key} = :${key}`);
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