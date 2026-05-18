import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../AWS/dynamodb.service';

@Injectable()
export class UsersService {
    private tableName = process.env.TABLE_USERS || 'Users';

    constructor(private readonly dynamoDBService: DynamoDBService) {}

    async getAllUsers() {
        return this.dynamoDBService.scan(this.tableName);
    }
}