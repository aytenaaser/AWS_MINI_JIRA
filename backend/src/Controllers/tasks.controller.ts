import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';

import { CognitoJwtGuard } from '../Auth/cognito-jwt.guard';
import { CurrentUser } from '../Auth/current-user.decorator';
import {TasksService} from "../Services/tasks.service";
import {CreateTaskDto} from "../DTOs/Tasks/create-task.dto";
import {UpdateTaskDto} from "../DTOs/Tasks/update-task.dto";

@Controller('tasks')
@UseGuards(CognitoJwtGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() dto: CreateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.createTask(dto, user.userId);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.tasksService.getTasks(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.getTaskById(id, user);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.updateTask(id, dto, user);
  }
    @Get(':id/image-url')
    async getImageUrl(@Param('id') id: string, @CurrentUser() user: any) {
        const url = await this.tasksService.generateViewUrl(id, user);
        return { url };
    }
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.deleteTask(id, user);
  }
    @Get(':id/upload-url')
    async getUploadUrl(@Param('id') id: string, @CurrentUser() user: any) {
        return this.tasksService.generateUploadUrl(id, user);
    }
}