import { IsString, IsOptional } from 'class-validator';

export class CreateProjectDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsString()
    team_id: string;   // team this project belongs to
}