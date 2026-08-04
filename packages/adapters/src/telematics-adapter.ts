import { Logger, PubSubClient, VehicleTelemetryUpdateSchema } from '@kalles-buss/shared-utils';
import axios from 'axios';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export class TelematicsAdapter {
  private isPolling = false;
  private timer: NodeJS.Timeout | null = null;
  private apiKey: string;
  private operatorUrl: string = 'https://opendata.samtrafiken.se/gtfs-rt/sl/VehiclePositions.pb';
  public currentMode: 'MOCK' | 'LIVE' | 'STOPPED' = 'STOPPED';

  constructor(private pubsub: PubSubClient) {
    this.apiKey = process.env.TRAFIKLAB_REALTIME_KEY || '';
  }

  startPolling(liveMode: boolean = false) {
    if (this.isPolling) return;
    this.isPolling = true;
    this.currentMode = liveMode ? 'LIVE' : 'MOCK';
    
    Logger.info(`[TelematicsAdapter] Starting polling cycle. LiveMode: ${liveMode}`);

    this.timer = setInterval(async () => {
      try {
        if (liveMode) {
          await this.pollLiveGtfsRt();
        } else {
          await this.generateMockTelemetry();
        }
      } catch (err: any) {
        Logger.error(`[TelematicsAdapter] Error in polling cycle: ${err.message}`);
      }
    }, 15000); // Poll every 15s (Trafiklab standard update frequency)
  }

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isPolling = false;
    this.currentMode = 'STOPPED';
    Logger.info(`[TelematicsAdapter] Stopped polling cycle.`);
  }

  private async pollLiveGtfsRt() {
    if (!this.apiKey) throw new Error("Missing TRAFIKLAB_REALTIME_KEY");

    Logger.info(`[TelematicsAdapter] Fetching real GTFS-RT VehiclePositions from Trafiklab...`);
    
    const response = await axios({
      method: 'GET',
      url: `${this.operatorUrl}?key=${this.apiKey}`,
      responseType: 'arraybuffer'
    });

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(response.data));
    let kallesBusesFound = 0;

    // Filter the massive stream of SL buses for our specific Line 676 or tracked vehicles
    for (const entity of feed.entity) {
      if (entity.vehicle && entity.vehicle.trip && entity.vehicle.trip.routeId === '676') {
        kallesBusesFound++;
        
        // Translate GTFS-RT into Kalles Buss internal format
        const telemetryEvent = {
          eventType: 'VehicleTelemetryUpdate',
          vehicleId: entity.vehicle.vehicle?.id || 'UNKNOWN-BUS',
          tripId: entity.vehicle.trip.tripId || undefined,
          routeId: entity.vehicle.trip.routeId || undefined,
          timestamp: new Date(Number(entity.vehicle.timestamp) * 1000).toISOString(),
          gps: {
            latitude: entity.vehicle.position?.latitude || 0,
            longitude: entity.vehicle.position?.longitude || 0
          },
          currentSOC: 75, // GTFS-RT does not contain battery, mocked
          speedKmh: (entity.vehicle.position?.speed || 0) * 3.6,
          odometerKm: entity.vehicle.position?.odometer || 12500 // Sometimes omitted in GTFS
        };

        // Validate and Publish
        const validated = VehicleTelemetryUpdateSchema.parse(telemetryEvent);
        await this.pubsub.publish('telematics-events', validated);
      }
    }

    Logger.info(`[TelematicsAdapter] Processed GTFS-RT Feed. Found ${kallesBusesFound} Kalles Buss vehicles on active duty.`);
  }

  private async generateMockTelemetry() {
    const telemetryEvent = {
      eventType: 'VehicleTelemetryUpdate',
      vehicleId: 'BUSS-101',
      timestamp: new Date().toISOString(),
      gps: {
        latitude: 59.758,
        longitude: 18.694
      },
      currentSOC: 85,
      speedKmh: 45,
      odometerKm: 15060 // Triggers the 15k maintenance rule in Depot Agent!
    };

    const validated = VehicleTelemetryUpdateSchema.parse(telemetryEvent);
    await this.pubsub.publish('telematics-events', validated);
  }
}
