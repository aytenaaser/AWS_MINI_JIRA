import { AWSController } from './AWSController';
import { AwsService } from './AWSService'
import {Global, Module} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";
@Global()
@Module({
    controllers: [AWSController],
    providers: [AwsService,ConfigService],
    exports: [AwsService],
})
export class AWSModule {}