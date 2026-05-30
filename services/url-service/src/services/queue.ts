import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function publishVisitEvent(data: {
  short_code: string;
  visited_at: string;
  referrer: string;
  user_agent: string;
  ip: string;
}) {
  const queueUrl = process.env.SQS_VISIT_QUEUE_URL;
  if (!queueUrl) throw new Error('SQS_VISIT_QUEUE_URL is not set');

  await sqs.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(data),
  }));
}
