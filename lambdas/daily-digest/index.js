import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({});

const TASKS_TABLE = process.env.TABLE_TASKS || 'Tasks';
const USERS_TABLE = process.env.USERS_TABLE || 'Users';
const TOPIC_ARN   = process.env.SNS_TOPIC_ARN;

export const handler = async (event) => {
    const today = new Date().toISOString().slice(0, 10);

    try {
        // Scan tasks where deadline = today and status != Done
        const result = await docClient.send(new ScanCommand({
            TableName: TASKS_TABLE,
            FilterExpression: 'deadline = :today AND #st <> :done',
            ExpressionAttributeValues: { ':today': today, ':done': 'Done' },
            ExpressionAttributeNames: { '#st': 'status' },
        }));

        const tasksDue = result.Items || [];
        if (tasksDue.length === 0) {
            console.log('No tasks due today.');
            return;
        }

        // Group tasks by assignee_id
        const byAssignee = {};
        tasksDue.forEach(task => {
            if (!task.assignee_id) return;
            if (!byAssignee[task.assignee_id]) byAssignee[task.assignee_id] = [];
            byAssignee[task.assignee_id].push(task);
        });

        // Send one digest email per assignee, with assignee_email attribute
        for (const [assigneeId, tasks] of Object.entries(byAssignee)) {
            const taskList = tasks.map(t => `- ${t.title} (${t.status}), priority: ${t.priority}`).join('\n');
            const message = `Daily Task Digest – ${today}\n\nYou have the following tasks due today:\n\n${taskList}`;

            // Fetch assignee's email from Users table
            let assigneeEmail = '';
            try {
                const userResult = await docClient.send(new GetCommand({
                    TableName: USERS_TABLE,
                    Key: { user_id: assigneeId },
                }));
                assigneeEmail = userResult.Item?.email || '';
            } catch (err) {
                console.warn(`Could not fetch email for assignee ${assigneeId}`, err);
            }

            // Publish with assignee_email attribute so filter policy allows delivery
            await snsClient.send(new PublishCommand({
                TopicArn: TOPIC_ARN,
                Subject: `Daily Digest – ${today}`,
                Message: message,
                MessageAttributes: {
                    assignee_id: { DataType: 'String', StringValue: assigneeId },
                    assignee_email: { DataType: 'String', StringValue: assigneeEmail },
                },
            }));

            console.log(`Sent digest to assignee ${assigneeId} (${assigneeEmail}) for ${tasks.length} task(s).`);
        }
    } catch (err) {
        console.error('Error in daily digest:', err);
        throw err;
    }
};