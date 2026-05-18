import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import {CognitoJwtGuard} from "../Auth/cognito-jwt.guard";
import {TeamsService} from "../Services/teams.service";
import {CreateTeamDto} from "../DTOs/Teams/create-team.dto";
import {AddUserToTeamDto} from "../DTOs/Teams/add-user-to-team.dto";
import {CurrentUser} from "../Auth/current-user.decorator";

@Controller('teams')
@UseGuards(CognitoJwtGuard)
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) {}

    @Post()
    async create(@Body() dto: CreateTeamDto) {
        return this.teamsService.createTeam(dto);
    }

    @Get()
    async getAll() {
        return this.teamsService.getAllTeams();
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.teamsService.getTeamById(id);
    }

    @Post('add-user')
    async addUser(@Body() dto: AddUserToTeamDto, @CurrentUser() user: any) {
        return this.teamsService.addUserToTeam(dto, user);
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @CurrentUser() user: any) {
        return this.teamsService.deleteTeam(id, user);
    }
}