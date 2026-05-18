import { Module } from '@nestjs/common';
import { TeamsController } from '../Controllers/teams.controller';
import { TeamsService } from '../Services/teams.service';
import { DynamoDBService } from '../AWS/dynamodb.service';

@Module({
    controllers: [TeamsController],
    providers: [TeamsService, DynamoDBService],
})
export class TeamsModule {}