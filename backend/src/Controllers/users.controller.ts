import {Controller, ForbiddenException,Param,Delete, Get, UseGuards} from '@nestjs/common';
import {CognitoJwtGuard} from "../Auth/cognito-jwt.guard";
import {UsersService} from "../Services/users.service";
import {CurrentUser} from "../Auth/current-user.decorator";
import {DynamoDBService} from "../AWS/dynamodb.service";


@Controller('users')
@UseGuards(CognitoJwtGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly dynamoDBService: DynamoDBService,
) {}

    @Get()
    async getAll() {
        return this.usersService.getAllUsers();
    }
    @Delete(':id')
    @UseGuards(CognitoJwtGuard)
    async deleteUser(@Param('id') id: string, @CurrentUser() user: any) {
        if (user.role !== 'Manager') {
            throw new ForbiddenException('Only managers can delete users');
        }
        await this.usersService.deleteUser(id);
        return { message: 'User deleted successfully' };
    }
    @Get('me')
    async getMe(@CurrentUser() user: any) {
        const dbUser = await this.usersService.getUserById(user.userId);

        let teamName: string | null = null;
        if (user.teamId) {
            const team = await this.dynamoDBService.get(
                process.env.TABLE_TEAMS || 'Teams',
                { team_id: user.teamId }
            );
            teamName = team?.name || null;
        }

        return {
            userId: user.userId,
            email: user.email,
            role: user.role,
            teamId: user.teamId,
            teamName,
            name: dbUser?.name || user.email?.split('@')[0],
        };
    }


}
