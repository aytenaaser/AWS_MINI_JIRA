import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './Auth/public.decorator';
import { AwsService } from './AWS/AWSService';
import { CognitoAuthGuard } from './Auth/cognito.guard';
import { CurrentUser } from './Auth/current-user.decorator';
import {CognitoJwtGuard} from "./Auth/cognito-jwt.guard";

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly AwsService: AwsService,
    ) {}

    @Get('hello')
    getHello(): string {
       return 'Hello World!';
    }
    @Get('health')
    getHealth(): string {
        return 'OK';
    }
    @Public()
    @Get('aws-test')
    async testAwsConnection() {
        return this.AwsService.testConnection();
    }

    // @Get('protected')
    // @UseGuards(CognitoAuthGuard)
    // getProtected(@CurrentUser() user: any) {
    //     return {
    //         message: 'Authenticated!',
    //         user,
    //     };
    // }
    @Get('protected')
    @UseGuards(CognitoJwtGuard)
    getProtected(@CurrentUser() user: any) {
        return {
            message: 'Authenticated!',
            user,
        };
    }
}