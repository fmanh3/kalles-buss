import { PubSubClient, Logger, VehicleTelemetryUpdateSchema } from '@kalles-buss/shared-utils';
import { MaintenanceService } from './maintenance-service';
import type { Knex } from 'knex';

export class TelematicsListener {
  constructor(
    private pubsub: PubSubClient,
    private db: Knex,
    private maintenanceService: MaintenanceService
  ) {}

  async startListening() {
    Logger.info('--- KALLES DEPOT: TELEMATICS LISTENER STARTING ---');
    
    await this.pubsub.subscribe('telematics-events', 'depot-telematics-sub', async (eventData: any) => {
      try {
        if (eventData.eventType === 'VehicleTelemetryUpdate') {
          const telemetry = VehicleTelemetryUpdateSchema.parse(eventData);
          await this.processTelemetry(telemetry);
        }
      } catch (error) {
        Logger.error('[Depot TelematicsListener] Error processing event:', error);
      }
    });
  }

  private async processTelemetry(telemetry: any) {
    return this.db.transaction(async (trx) => {
      const asset = await trx('vehicles').where({ vehicle_id: telemetry.vehicleId }).first();
      
      if (!asset) return; // Not our asset

      // Only update if odometer moved forward significantly (e.g. > 10km) to avoid too many DB writes
      if (telemetry.odometerKm > asset.odometer_km + 10) {
        await trx('vehicles')
          .where({ id: asset.id })
          .update({ odometer_km: telemetry.odometerKm });

        // Check for preventive maintenance interval (15,000 km)
        const kmSinceLastService = telemetry.odometerKm - asset.last_service_odometer_km;
        
        if (kmSinceLastService >= 15000 && asset.operational_status !== 'AWAITING_MAINTENANCE') {
          Logger.warn(`[Proactive Maintenance] Asset ${asset.id} exceeded 15,000km interval. Grounding for service.`);
          
          await trx('vehicles')
            .where({ id: asset.id })
            .update({ operational_status: 'AWAITING_MAINTENANCE' });

          await trx('work_orders').insert({
            vehicle_id_internal: asset.id,
            vehicle_id: asset.vehicle_id,
            description: 'Preventive Maintenance: 15k Service',
            status: 'PLANNED'
          });

          // In reality, emit FleetCapacityReduced to Traffic here.
        }
      }
    });
  }
}
