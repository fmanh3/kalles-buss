import { Knex } from 'knex';
import { Logger } from '@kalles-buss/shared-utils';

export class ResourceSolverService {
  constructor(private db: Knex, private hrApiUrl: string) {}
/**
 * Automatically assigns available vehicles from the Depot to the generated blocks.
 * Note: Driver assignment (Crew Scheduling) is handled in a separate phase
 * according to public transport industry standards.
 */
async autoAssignVehicles() {
  Logger.info('[ResourceSolver] Starting auto-assignment of vehicles to unassigned blocks.');

  const unassignedBlocks = await this.db('blocks').whereNull('assigned_vehicle_id');
  const availableVehicles = await this.db('vehicles').select('*'); // Simplified for now

  let vehicleIdx = 0;

  for (const block of unassignedBlocks) {
    if (vehicleIdx >= availableVehicles.length) {
      Logger.error(`[ResourceSolver] Fleet Deficit! Could not fulfill block ${block.id}.`);
      continue;
    }

    const vehicle = availableVehicles[vehicleIdx++];

    Logger.info(`[ResourceSolver] Assigning Block ${block.id} -> Vehicle ${vehicle.id}`);

    await this.db.transaction(async (trx) => {
      // Assign to Block
      await trx('blocks').where({ id: block.id }).update({ assigned_vehicle_id: vehicle.id });

      // Propagate to all tours in the block
      await trx('tours').where({ block_id_new: block.id }).update({ 
        assigned_vehicle_id: vehicle.id,
        status: 'SCHEDULED'
      });
    });
  }

  return { status: 'VEHICLE_ASSIGNMENT_COMPLETE', unassignedCount: unassignedBlocks.length - Math.min(vehicleIdx, unassignedBlocks.length) };
}
/**
 * Evaluates if a driver can be assigned to a tour.
...
   * Enforces the hard rule: Must have valid certifications AND line knowledge.
   */
  async assignDriverToTour(tourId: string, driverId: string, requiredVehicleType: string) {
    const tour = await this.db('tours').where({ id: tourId }).first();
    if (!tour) throw new Error('Tour not found');

    // 1. Check Competence via HR API (Simulated local fetch for now to avoid cross-service HTTP in Skeleton)
    // In a real microservice environment, this would be an HTTP call to the HR domain API.
    // e.g., fetch(`${this.hrApiUrl}/api/traffic/drivers/${driverId}/competence?vehicleType=${requiredVehicleType}`)
    
    Logger.info(`[ResourceSolver] Verifying competence for ${driverId} on ${requiredVehicleType}`);
    
    // We simulate the API check. We will assume we get this back:
    const hrCheckResult = await this.simulateHrCheck(driverId, requiredVehicleType, tour.line_id);

    if (!hrCheckResult.is_authorized) {
      Logger.warn(`[CERT STOP] Driver ${driverId} denied assignment to tour ${tourId}. Reason: ${hrCheckResult.reason}`);
      throw new Error(`Assignment rejected: ${hrCheckResult.reason}`);
    }

    // 2. Perform assignment
    await this.db('tours').where({ id: tourId }).update({ assigned_driver_id: driverId });
    Logger.info(`[ResourceSolver] Driver ${driverId} successfully assigned to tour ${tourId}`);
    return { success: true, driverId, tourId };
  }

  /**
   * Internal simulation of the HR response.
   */
  private async simulateHrCheck(driverId: string, vehicleType: string, lineId: string) {
    if (driverId === 'UNQUALIFIED_DRIVER') {
      return { is_authorized: false, reason: 'Missing valid YKB' };
    }
    if (driverId === 'NO_LINE_KNOWLEDGE') {
      return { is_authorized: false, reason: `No line knowledge for ${lineId}` };
    }
    return { is_authorized: true };
  }

  /**
   * Assigns a vehicle to a tour.
   * Validates Depot match and capacity.
   */
  async assignVehicleToTour(tourId: string, vehicleId: string) {
    const tour = await this.db('tours').where({ id: tourId }).first();
    const vehicle = await this.db('vehicles').where({ id: vehicleId }).first();

    if (!tour || !vehicle) throw new Error('Tour or Vehicle not found');

    if (tour.start_depot_id !== vehicle.current_depot_id) {
      Logger.warn(`[CAPACITY MISMATCH] Vehicle ${vehicleId} is not located at the start depot.`);
      throw new Error('Vehicle must be at the same depot as the tour start.');
    }

    // Example logic: if the line requires high capacity, ensure the vehicle is an articulated bus
    if (tour.line_id === '676' && vehicle.type !== 'ARTICULATED') {
        Logger.warn(`[CAPACITY WARNING] Assigning non-articulated bus to heavy line 676.`);
        // Allow it for now, but log a warning.
    }

    await this.db('tours').where({ id: tourId }).update({ assigned_vehicle_id: vehicleId });
    Logger.info(`[ResourceSolver] Vehicle ${vehicleId} assigned to tour ${tourId}`);
    return { success: true, vehicleId, tourId };
  }

  /**
   * Triggered by a FleetMigration event from the Depot domain.
   */
  async handleFleetMigration(vehicleId: string, newDepotName: string) {
    const depot = await this.db('depots').where({ name: newDepotName }).first();
    if (!depot) throw new Error(`Depot ${newDepotName} not found`);

    await this.db('vehicles').where({ id: vehicleId }).update({ current_depot_id: depot.id });
    Logger.info(`[ResourceSolver] Fleet Migration: Vehicle ${vehicleId} is now available at ${newDepotName}`);
  }

  /**
   * Triggered by a Pre-departure safety check fail.
   * Auto-searches for a replacement bus.
   */
  async handleSafetyCheckFail(tourId: string, failedVehicleId: string) {
    Logger.warn(`[SAFETY FAIL] Tour ${tourId} failed pre-departure check on vehicle ${failedVehicleId}.`);
    
    // Unassign the broken vehicle
    await this.db('tours').where({ id: tourId }).update({ assigned_vehicle_id: null });

    const tour = await this.db('tours').where({ id: tourId }).first();

    // Find a replacement bus at the same depot that is not currently assigned
    const availableVehicles = await this.db('vehicles')
      .where({ current_depot_id: tour.start_depot_id })
      .whereNotIn('id', this.db('tours').select('assigned_vehicle_id').whereNotNull('assigned_vehicle_id'));

    if (availableVehicles.length > 0) {
      const replacement = availableVehicles[0];
      Logger.info(`[AUTO RECOVERY] Found replacement vehicle ${replacement.id}. Re-assigning...`);
      await this.assignVehicleToTour(tourId, replacement.id);
      return { status: 'RECOVERED', replacementVehicleId: replacement.id };
    } else {
      Logger.error(`[CRITICAL] No replacement vehicles available at depot! Tour ${tourId} must be cancelled or delayed.`);
      await this.db('tours').where({ id: tourId }).update({ status: 'DELAYED' });
      return { status: 'DELAYED', reason: 'No vehicles available' };
    }
  }

  /**
   * Triggered by a WeatherAlert event.
   */
  async handleExtremeColdWeather() {
    Logger.warn('[WEATHER] EXTREME COLD detected. Initiating Dynamic Range Recovery.');
    
    // Increase estimated consumption by 30% for all scheduled tours
    await this.db.raw(`
      UPDATE tours 
      SET estimated_consumption_kwh = estimated_consumption_kwh * 1.3 
      WHERE status = 'SCHEDULED'
    `);
    
    Logger.info('[WEATHER] All active tour energy estimations updated.');
  }
}
