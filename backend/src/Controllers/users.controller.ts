import { Controller, Get, UseGuards } from '@nestjs/common';
import {CognitoJwtGuard} from "../Auth/cognito-jwt.guard";
import {UsersService} from "../Services/users.service";


@Controller('users')
@UseGuards(CognitoJwtGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    async getAll() {
        return this.usersService.getAllUsers();
    }
}