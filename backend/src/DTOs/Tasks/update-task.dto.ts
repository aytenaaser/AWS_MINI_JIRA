import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @IsIn(['Low', 'Medium', 'High', 'Critical'])
    priority?: string;

    @IsOptional()
    @IsString()
    deadline?: string;

    @IsOptional()
    @IsString()
    assignee_id?: string;

    @IsOptional()
    @IsString()
    team_id?: string;

    @IsOptional()
    @IsString()
    project_id?: string;

    @IsOptional()
    @IsString()
    @IsIn(['To Do', 'In Progress', 'In Review', 'Done'])
    status?: string;

    @IsOptional()
    @IsString()
    image_key?: string;
}