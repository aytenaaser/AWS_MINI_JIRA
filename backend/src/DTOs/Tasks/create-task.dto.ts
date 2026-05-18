import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateTaskDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsString()
    @IsIn(['Low', 'Medium', 'High', 'Critical'])
    priority: string;

    @IsString()
    deadline: string;

    @IsString()
    assignee_id: string;

    @IsString()
    team_id: string;

    @IsString()
    project_id: string;

    @IsOptional()
    @IsString()
    image_key?: string;
}