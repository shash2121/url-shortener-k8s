import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import pino from 'pino';
import { recordVisit } from '../db/visits';

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function startConsumer(logger?: any) {
  const log = logger || pino({ level: process.env.LOG_LEVEL || 'info' });
  const queueUrl = process.env.SQS_VISIT_QUEUE_URL;

  if (!queueUrl) throw new Error('SQS_VISIT_QUEUE_URL is not set');

  log.info({ component: 'consumer', queueUrl }, 'Analytics consumer starting SQS polling');

  const poll = async () => {
    while (true) {
      try {
        const response = await sqs.send(new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 30,
        }));

        if (!response.Messages || response.Messages.length === 0) continue;

        for (const message of response.Messages) {
          try {
            const data = JSON.parse(message.Body!);
            log.info({ shortCode: data.short_code, visitedAt: data.visited_at, component: 'consumer' }, 'Visit event received from SQS');
            await recordVisit(data.short_code, data.visited_at, data.referrer, data.user_agent);
            log.info({ shortCode: data.short_code, component: 'consumer' }, 'Visit recorded in database');

            await sqs.send(new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: message.ReceiptHandle!,
            }));
          } catch (err) {
            log.error({ err, component: 'consumer' }, 'Failed to process visit event - message will retry');
          }
        }
      } catch (err) {
        log.error({ err, component: 'consumer' }, 'SQS polling error, retrying in 5s');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  };

  poll();
}
