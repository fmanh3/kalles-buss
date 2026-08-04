import type { Knex } from 'knex';
import { Logger } from '@kalles-buss/shared-utils';

export class MaintenanceService {
  constructor(private db: Knex) {}

  /**
   * Responds to a critical safety failure from Traffic.
   */
  async handleSafetyCheckFail(vehicleId: string, reportedBy: string, reason: string) {
    return this.db.transaction(async (trx) => {
      const asset = await trx('vehicles').where({ vehicle_id: vehicleId }).first();
      if (!asset) throw new Error(`Asset for vehicle ${vehicleId} not found.`);

      // 1. Ground the asset
      await trx('vehicles')
        .where({ id: asset.id })
        .update({ operational_status: 'IN_REPAIR' });

      // 2. Create Defect
      const [defect] = await trx('defects').insert({
        vehicle_id: vehicleId,
        reported_by: reportedBy,
        description: `SAFETY FAIL: ${reason}`,
        category: 'SAFETY_CRITICAL',
        severity_level: 3 // Highest
      }).returning('*');

      // 3. Auto-generate Work Order
      const [workOrder] = await trx('work_orders').insert({
        defect_id: defect.id,
        vehicle_id_internal: asset.id,
        vehicle_id: vehicleId,
        description: `EMERGENCY REPAIR: ${reason}`,
        status: 'PLANNED'
      }).returning('*');

      Logger.error(`[SAFETY] Asset ${asset.id} (${vehicleId}) grounded. Work Order ${workOrder.id} generated.`);

      // Typically, an event like 'FleetCapacityReduced' is published here to notify Traffic.
      return { asset_id: asset.id, defect_id: defect.id, work_order_id: workOrder.id };
    });
  }
}
