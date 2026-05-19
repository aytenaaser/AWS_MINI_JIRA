const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();
const cloudwatch = new AWS.CloudWatch();

const TASKS_TABLE = process.env.TABLE_TASKS || 'Tasks';
const TOPIC_ARN   = process.env.SNS_TOPIC_ARN;

exports.handler = async (event) => {
    const today = new Date().toISOString().slice(0, 10);

    try {
        // -- Digest for tasks due today --
        const result = await dynamo.scan({
            TableName: TASKS_TABLE,
            FilterExpression: 'deadline = :today AND #st <> :done',
            ExpressionAttributeValues: { ':today': today, ':done': 'Done' },
            ExpressionAttributeNames: { '#st': 'status' },
        }).promise();

        const tasksDue = result.Items || [];
        if (tasksDue.length > 0) {
            const byAssignee = {};
            tasksDue.forEach(task => {
                if (!task.assignee_id) return;
                if (!byAssignee[task.assignee_id]) byAssignee[task.assignee_id] = [];
                byAssignee[task.assignee_id].push(task);
            });

            for (const [assigneeId, tasks] of Object.entries(byAssignee)) {
                const taskList = tasks.map(t => `- ${t.title} (${t.status}), priority: ${t.priority}`).join('\n');
                const message = `Daily Task Digest – ${today}\n\nYou have the following tasks due today:\n\n${taskList}`;
                await sns.publish({
                    TopicArn: TOPIC_ARN,
                    Subject: `Daily Digest – ${today}`,
                    Message: message,
                    MessageAttributes: { assignee_id: { DataType: 'String', StringValue: assigneeId } },
                }).promise();
                console.log(`Sent digest to assignee ${assigneeId} for ${tasks.length} task(s).`);
            }
        } else {
            console.log('No tasks due today.');
        }

        // -- Overdue tasks metric (deadline < today and not Done) --
        const overdueResult = await dynamo.scan({
            TableName: TASKS_TABLE,
            FilterExpression: 'deadline < :today AND #st <> :done',
            ExpressionAttributeValues: { ':today': today, ':done': 'Done' },
            ExpressionAttributeNames: { '#st': 'status' },
        }).promise();

        const overdueCount = overdueResult.Items ? overdueResult.Items.length : 0;
        if (overdueCount > 0) {
            await cloudwatch.putMetricData({
                Namespace: 'MiniJira',
                MetricData: [{
                    MetricName: 'OverdueTasks',
                    Value: overdueCount,
                    Unit: 'Count',
                    Timestamp: new Date(),
                }],
            }).promise();
            console.log(`Published OverdueTasks metric: ${overdueCount}`);
        }

    } catch (err) {
        console.error('Error in daily digest:', err);
        throw err;
    }
};