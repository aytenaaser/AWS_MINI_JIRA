import { Injectable } from '@nestjs/common';
import { DynamoDB } from 'aws-sdk';

@Injectable()
export class DynamoDBService {
    private client: DynamoDB.DocumentClient;

    constructor() {
        this.client = new DynamoDB.DocumentClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }

    async put(table: string, item: any) {
        return this.client.put({ TableName: table, Item: item }).promise();
    }

    async get(table: string, key: any) {
        const result = await this.client.get({ TableName: table, Key: key }).promise();
        return result.Item;
    }

    async query(params: DynamoDB.DocumentClient.QueryInput) {
        const result = await this.client.query(params).promise();
        return result.Items;
    }

    async queryByIndex(
        table: string,
        indexName: string,
        keyConditionExpression: string,
        expressionAttributeValues: any,
        filterExpression?: string,
        expressionAttributeNames?: any,
    ) {
        return this.query({
            TableName: table,
            IndexName: indexName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            FilterExpression: filterExpression,
            ExpressionAttributeNames: expressionAttributeNames,
        });
    }

    async update(
        table: string,
        key: any,
        updateExpression: string,
        expressionAttributeValues: any,
    ) {
        return this.client.update({
            TableName: table,
            Key: key,
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        }).promise();
    }

    async delete(table: string, key: any) {
        return this.client.delete({ TableName: table, Key: key }).promise();
    }

    async scan(table: string, filterExpression?: string, expressionAttributeValues?: any) {
        const result = await this.client.scan({
            TableName: table,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: expressionAttributeValues,
        }).promise();
        return result.Items;
    }
}