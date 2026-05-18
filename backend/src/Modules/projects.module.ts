import { Module } from '@nestjs/common';
import { ProjectsController } from '../Controllers/projects.controller';
import { ProjectsService } from '../Services/projects.service';
import { DynamoDBService } from '../AWS/dynamodb.service';

@Module({
    controllers: [ProjectsController],
    providers: [ProjectsService, DynamoDBService],
})
export class ProjectsModule {}