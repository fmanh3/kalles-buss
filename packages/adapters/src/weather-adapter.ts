import { PubSubClient, Logger } from '@kalles-buss/shared-utils';
import { v4 as uuidv4 } from 'uuid';

export class WeatherAdapter {
  constructor(private pubsub: PubSubClient) {}

  /**
   * Simulates polling data from SMHI.
   */
  startPolling() {
    Logger.info('--- ADAPTER: WEATHER (SMHI) POLLING STARTED ---');

    setInterval(async () => {
      // Simulate extreme weather alert periodically
      const weatherAlertEvent = {
        eventType: 'WeatherAlert',
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        alertType: 'EXTREME_COLD',
        affectedArea: 'Norrtälje',
        operationalRiskLevel: 'HIGH'
      };

      await this.pubsub.publish('weather-events', weatherAlertEvent);
      // Logger.info(`[WeatherAdapter] Published WeatherAlert for ${weatherAlertEvent.affectedArea}`);
    }, 60000); // Poll every 60s
  }
}
