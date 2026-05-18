import { IsString } from 'class-validator';

export class AddUserToTeamDto {
    @IsString()
    user_id: string;

    @IsString()
    team_id: string;
}