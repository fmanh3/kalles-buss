import { PubSubClient, Logger } from '@kalles-buss/shared-utils';
import { Response } from 'express';

export class TelemetryStreamer {
  private pubsub: PubSubClient;
  private clients: Response[] = [];

  constructor(pubsub: PubSubClient) {
    this.pubsub = pubsub;
  }

  public async startListening() {
    Logger.info('[TelemetryStreamer] Starting to listen to all event horizons...');
    
    const subscriptions = [
      'telemetry-hr-sub',
      'telemetry-traffic-sub',
      'telemetry-finance-sub',
      'telemetry-weather-sub',
      'telemetry-telematics-sub'
    ];

    for (const subName of subscriptions) {
      try {
        const topicName = subName.replace('telemetry-', '').replace('-sub', '-events');
        this.pubsub.subscribe(topicName, subName, async (message: any) => {
          this.broadcast({
            topic: topicName,
            timestamp: new Date().toISOString(),
            payload: message,
            type: message.type || 'UNKNOWN_EVENT'
          });
        });
      } catch (err: any) {
        Logger.error(`[TelemetryStreamer] Failed to subscribe to ${subName}: ${err.message}`);
      }
    }
  }

  public addClient(req: any, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send initial handshake
    res.write(`data: ${JSON.stringify({ type: 'SYSTEM_READY', timestamp: new Date().toISOString(), payload: 'Event Horizon connected.' })}\n\n`);

    this.clients.push(res);

    // Keep-alive heartbeat every 15 seconds to prevent Cloud Run from killing idle connection
    const keepAlive = setInterval(() => {
       res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() })}\n\n`);
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      this.clients = this.clients.filter(client => client !== res);
    });
  }

  private broadcast(data: any) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach(client => {
      try {
        client.write(message);
      } catch (err) {
        // Assume client disconnected silently
      }
    });
  }
}
