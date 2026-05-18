import { IsString } from 'class-validator';

export class CreateCommentDto {
    @IsString()
    task_id: string;

    @IsString()
    text: string;
}