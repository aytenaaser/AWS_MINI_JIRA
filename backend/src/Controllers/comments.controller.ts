import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {CognitoJwtGuard} from "../Auth/cognito-jwt.guard";
import {CommentsService} from "../Services/comments.service";
import {CreateCommentDto} from "../DTOs/Comments/create-comment.dto";
import {CurrentUser} from "../Auth/current-user.decorator";


@Controller('comments')
@UseGuards(CognitoJwtGuard)
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) {}

    @Post()
    async create(@Body() dto: CreateCommentDto, @CurrentUser() user: any) {
        return this.commentsService.addComment(dto, user.userId, user);
    }

    @Get(':taskId')
    async getByTask(@Param('taskId') taskId: string, @CurrentUser() user: any) {
        return this.commentsService.getCommentsByTask(taskId, user);
    }
}