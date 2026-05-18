import { Module } from '@nestjs/common';
import { CognitoJwtStrategy } from './cognito.strategy';
import { CognitoAuthGuard } from './cognito.guard';
import {CognitoJwtGuard} from "./cognito-jwt.guard";

@Module({
    providers: [CognitoJwtStrategy, CognitoAuthGuard,CognitoJwtGuard],
    exports: [CognitoAuthGuard,CognitoJwtGuard]
})
export class AuthModule {}