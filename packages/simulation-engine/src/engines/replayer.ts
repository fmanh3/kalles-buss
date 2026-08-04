import * as fs from 'fs';
import { Logger, PubSubClient } from '@kalles-buss/shared-utils';

export class EventReplayer {
  constructor(private pubsub: PubSubClient) {}

  /**
   * Replays a Golden Tape 1:1 in real-time.
   */
  async replay(tapePath: string) {
    if (!fs.existsSync(tapePath)) throw new Error(`Tape not found at ${tapePath}`);

    const rawData = fs.readFileSync(tapePath, 'utf8');
    const events = JSON.parse(rawData);

    Logger.info(`[Replayer] Commencing replay of ${events.length} events from ${tapePath}...`);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Calculate delay based on timestamp difference between events
      if (i > 0) {
        const prevEvent = events[i - 1];
        const delay = new Date(event.timestamp).getTime() - new Date(prevEvent.timestamp).getTime();
        
        if (delay > 0) {
          // Logger.info(`[Replayer] Waiting ${delay/1000}s for next event...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Map to internal Telemetry format
      const telemetryEvent = {
        eventType: 'VehicleTelemetryUpdate',
        vehicleId: event.vehicleId,
        tripId: event.tripId,
        routeId: event.routeId,
        timestamp: new Date().toISOString(), // Use current wall clock as discussed
        gps: event.gps,
        currentSOC: event.currentSOC || 75, // Simulated
        speedKmh: event.speedKmh || 60,
        odometerKm: event.odometerKm || 12500
      };

      await this.pubsub.publish('telematics-events', telemetryEvent);
      Logger.info(`[Replayer] Replayed event for ${event.vehicleId} at ${event.gps.latitude}, ${event.gps.longitude}`);
    }

    Logger.info(`[Replayer] Replay of ${tapePath} completed!`);
  }
}
