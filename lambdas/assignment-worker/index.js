const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const cloudwatch = new AWS.CloudWatch();
const { v4: uuidv4 } = require('uuid');

const AUDIT_TABLE = process.env.AUDIT_TABLE || 'Audit_Log';
const CLOUDWATCH_NAMESPACE = 'MiniJira';
const METRIC_NAME = 'TasksAssignedPerTeam';

exports.handler = async (event) => {
    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);
            const snsMessage = JSON.parse(body.Message);

            const logItem = {
                log_id: uuidv4(),
                task_id: snsMessage.task_id,
                changed_by: snsMessage.assigned_by,
                old_status: 'N/A',
                new_status: `Assigned to ${snsMessage.assignee_id}`,
                timestamp: new Date().toISOString(),
            };
            await dynamo.put({ TableName: AUDIT_TABLE, Item: logItem }).promise();

            await cloudwatch.putMetricData({
                Namespace: CLOUDWATCH_NAMESPACE,
                MetricData: [{
                    MetricName: METRIC_NAME,
                    Dimensions: [{ Name: 'Team', Value: snsMessage.team_id }],
                    Value: 1,
                    Unit: 'Count',
                    Timestamp: new Date(),
                }],
            }).promise();

            console.log(`Processed assignment for task ${snsMessage.task_id}`);
        } catch (err) {
            console.error('Error processing record:', err);
        }
    }
};