import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {AWSModule} from "./AWS/AWSModule";

@Module({
  imports: [AWSModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {

}
