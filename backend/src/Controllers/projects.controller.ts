import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import {CognitoJwtGuard} from "../Auth/cognito-jwt.guard";
import {ProjectsService} from "../Services/projects.service";
import {CreateProjectDto} from "../DTOs/Projects/create-project.dto";
import {CurrentUser} from "../Auth/current-user.decorator";
import {UpdateProjectDto} from "../DTOs/Projects/update-project.dto";


@Controller('projects')
@UseGuards(CognitoJwtGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Post()
    async create(@Body() dto: CreateProjectDto, @CurrentUser() user: any) {
        return this.projectsService.createProject(dto, user.userId);
    }

    @Get()
    async findAll(@CurrentUser() user: any) {
        return this.projectsService.getProjects(user);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @CurrentUser() user: any) {
        return this.projectsService.getProjectById(id, user);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateProjectDto,
        @CurrentUser() user: any,
    ) {
        return this.projectsService.updateProject(id, dto, user);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.projectsService.deleteProject(id, user);
    }
}