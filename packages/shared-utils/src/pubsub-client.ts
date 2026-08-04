import { PubSub } from '@google-cloud/pubsub';
import { Logger, tracingContext } from './observability';

export class PubSubClient {
  private pubsub: PubSub;

  constructor() {
    if (process.env.NODE_ENV !== 'production' && process.env.PUBSUB_EMULATOR_HOST) {
      Logger.info(`[PubSub] Ansluter till emulator på ${process.env.PUBSUB_EMULATOR_HOST}`);
      this.pubsub = new PubSub({
        projectId: process.env.PUBSUB_PROJECT_ID || 'kalles-buss-local',
        apiEndpoint: process.env.PUBSUB_EMULATOR_HOST
      });
    } else {
      this.pubsub = new PubSub();
    }
  }

  async ensureTopic(topicName: string) {
    if (process.env.NODE_ENV === 'production') return;

    const [exists] = await this.pubsub.topic(topicName).exists();
    if (!exists) {
      Logger.info(`[PubSub] Skapar topic: ${topicName}`);
      await this.pubsub.createTopic(topicName);
    }
  }

  async publish(topicName: string, data: any) {
    await this.ensureTopic(topicName);
    const topic = this.pubsub.topic(topicName);
    const dataBuffer = Buffer.from(JSON.stringify(data));
    
    const traceData = tracingContext.getStore();
    const traceId = traceData?.correlationId || 'no-trace';
    const runId = traceData?.runId || '';
    
    try {
      const messageId = await topic.publishMessage({ 
        data: dataBuffer,
        attributes: { 
          'x-correlation-id': traceId,
          ...(runId && { 'x-simulation-run-id': runId })
        }
      });
      Logger.info(`[PubSub] Meddelande publicerat till ${topicName}. ID: ${messageId}`);
      return messageId;
    } catch (error) {
      Logger.error(`[PubSub] Fel vid publicering till ${topicName}:`, error);
      throw error;
    }
  }

  /**
   * Skapar en PULL-prenumeration och kör den oavsett om vi är i prod eller lokalt.
   * "Always On" CPU i Cloud Run krävs för att denna Node.js loop inte ska dö.
   */
  async subscribe(topicName: string, subscriptionName: string, handler: (data: any) => Promise<void>) {
    if (process.env.NODE_ENV !== 'production') {
      await this.ensureTopic(topicName);
      const [subExists] = await this.pubsub.subscription(subscriptionName).exists();
      
      if (!subExists) {
        Logger.info(`[PubSub] Skapar prenumeration: ${subscriptionName}`);
        await this.pubsub.topic(topicName).createSubscription(subscriptionName);
      }
    }

    const subscription = this.pubsub.subscription(subscriptionName);
    
    Logger.info(`[PubSub] Startar PULL prenumeration på ${subscriptionName}`);
    
    subscription.on('message', async (message) => {
      const traceId = message.attributes?.['x-correlation-id'] || 'no-trace';
      const runId = message.attributes?.['x-simulation-run-id'];
      
      tracingContext.run({ correlationId: traceId, runId }, async () => {
        try {
          const parsedData = JSON.parse(message.data.toString());
          await handler(parsedData);
        } catch (error) {
          Logger.error('Kunde inte parsa Pub/Sub meddelande:', error);
        }
        message.ack();
      });
    });

    subscription.on('error', (error) => {
      Logger.error(`[PubSub] Stream Error on ${subscriptionName}:`, error);
    });
  }
}