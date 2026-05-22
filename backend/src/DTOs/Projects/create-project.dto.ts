import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateProjectDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    teams?: string[];
}