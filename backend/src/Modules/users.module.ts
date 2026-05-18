import { Module } from '@nestjs/common';
import { UsersController } from '../Controllers/users.controller';
import { UsersService } from '../Services/users.service';
import { DynamoDBService } from '../AWS/dynamodb.service';

@Module({
    controllers: [UsersController],
    providers: [UsersService, DynamoDBService],
})
export class UsersModule {}