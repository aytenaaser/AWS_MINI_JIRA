import {Controller } from '@nestjs/common';
import { AwsService } from './AWSService'

@Controller('aws')
export class AWSController {
    constructor(private readonly awsService: AwsService) {}
}