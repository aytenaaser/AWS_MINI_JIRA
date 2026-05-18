import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {AWSModule} from "./AWS/AWSModule";
import {AuthModule} from "./Auth/auth.module";
import {ConfigModule} from "@nestjs/config";
import {TasksModule} from "./Modules/task.module";
import {ProjectsModule} from "./Modules/projects.module";
import {CommentsModule} from "./Modules/comments.module";
import {TeamsModule} from "./Modules/teams.module";
import {UsersModule} from "./Modules/users.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), // must be present
      AWSModule,
      AuthModule,
      TasksModule,
      ProjectsModule,
      CommentsModule,
      TeamsModule,
      UsersModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {

}

