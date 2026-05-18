import { Module } from '@nestjs/common';
import { CommentsController } from '../Controllers/comments.controller';
import { CommentsService } from '../Services/comments.service';
import { DynamoDBService } from '../AWS/dynamodb.service';

@Module({
    controllers: [CommentsController],
    providers: [CommentsService, DynamoDBService],
})
export class CommentsModule {}