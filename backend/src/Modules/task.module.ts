import { Module } from '@nestjs/common';

import { DynamoDBService } from '../AWS/dynamodb.service';
import {TasksService} from "../Services/tasks.service";
import {TasksController} from "../Controllers/tasks.controller";

@Module({
    controllers: [TasksController],
    providers: [TasksService, DynamoDBService],
})
export class TasksModule {}