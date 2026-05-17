import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './Auth/public.decorator';
import {AwsService} from "./AWS/AWSService";

@Controller()
export class AppController {
  constructor(
      private readonly appService: AppService,
    private readonly AwsService: AwsService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
    @Public()
    @Get('aws-test')
    async testAwsConnection() {
        return this.AwsService.testConnection();
    }
}
