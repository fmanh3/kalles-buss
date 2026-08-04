import { Logger, VehicleTelemetryUpdate } from '@kalles-buss/shared-utils';
import { Knex } from 'knex';

export interface LiveVehicleState {
  vehicleId: string;
  tripId?: string;
  routeId?: string;
  lat: number;
  lon: number;
  speedKmh: number;
  currentSOC: number;
  lastUpdated: string;
  status: 'ON_TIME' | 'DELAYED' | 'EARLY' | 'UNKNOWN';
  delaySeconds: number;
  nextStopId?: string;
}

export class TrackingService {
  private activeVehicles: Map<string, LiveVehicleState> = new Map();

  constructor(private db: Knex) {}

  public async processTelemetry(telemetry: VehicleTelemetryUpdate) {
    const currentState = this.activeVehicles.get(telemetry.vehicleId);
    
    const newState: LiveVehicleState = {
      vehicleId: telemetry.vehicleId,
      tripId: telemetry.tripId,
      routeId: telemetry.routeId,
      lat: telemetry.gps.latitude,
      lon: telemetry.gps.longitude,
      speedKmh: telemetry.speedKmh,
      currentSOC: telemetry.currentSOC,
      lastUpdated: telemetry.timestamp,
      status: currentState?.status || 'UNKNOWN',
      delaySeconds: currentState?.delaySeconds || 0,
      nextStopId: currentState?.nextStopId
    };

    // Calculate tactical status (Delay / Next Stop) if we have a tripId
    if (telemetry.tripId) {
      await this.calculateAdherence(newState);
    }

    this.activeVehicles.set(telemetry.vehicleId, newState);
  }

  private async calculateAdherence(state: LiveVehicleState) {
    // Simple tactical algorithm:
    // Find the next unvisited stop for this trip based on current time and sequence
    if (!state.tripId) return;

    try {
      const stops = await this.db('journey_calls')
        .join('scheduled_stop_points', 'journey_calls.stop_point_id', '=', 'scheduled_stop_points.id')
        .where({ service_journey_id: state.tripId })
        .select('journey_calls.stop_point_id', 'journey_calls.arrival_time', 'scheduled_stop_points.lat', 'scheduled_stop_points.lon')
        .orderBy('stop_sequence', 'asc');

      const now = new Date(state.lastUpdated).getTime();
      let nextStop = null;

      for (const stop of stops) {
        const arrivalTimeMs = new Date(stop.arrival_time).getTime();
        // If the stop's arrival time is in the future, or we are reasonably close to it, it's the next stop
        // Very basic mock logic for tactical matching
        if (arrivalTimeMs >= now) {
          nextStop = stop;
          break;
        }
      }

      if (nextStop) {
        state.nextStopId = nextStop.stop_point_id;
        const expectedArrivalMs = new Date(nextStop.arrival_time).getTime();
        const diffSeconds = Math.floor((now - expectedArrivalMs) / 1000);
        
        // If we are past the expected time, we are delayed
        state.delaySeconds = diffSeconds > 0 ? diffSeconds : 0;
        state.status = state.delaySeconds > 120 ? 'DELAYED' : 'ON_TIME';
      } else {
         state.status = 'UNKNOWN';
         state.delaySeconds = 0;
      }
    } catch (err) {
      Logger.error(`[TrackingService] Failed to calculate adherence for ${state.vehicleId}: ${err}`);
    }
  }

  public getLiveMapData() {
    return Array.from(this.activeVehicles.values());
  }
}
