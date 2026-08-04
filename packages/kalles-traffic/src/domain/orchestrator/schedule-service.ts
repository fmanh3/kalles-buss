import { Knex } from 'knex';
import { Logger, TimetableUpdatedSchema, PubSubClient, BlockValidationRequested } from '@kalles-buss/shared-utils';
import { v4 as uuidv4 } from 'uuid';
import { VspSolver, Trip } from '../planning/vsp-solver';
import { ResourceSolverService } from './resource-solver-service';

export class ScheduleService {
  private vspSolver: VspSolver;

  constructor(
    private db: Knex, 
    private resourceSolver: ResourceSolverService,
    private pubsub: PubSubClient
  ) {
    this.vspSolver = new VspSolver();
  }

  // Temporary holding ground for the heuristic bounds sent during seed
  private fleetHeuristics: { defaultRangeKm: number } = { defaultRangeKm: 300 };

  public setFleetHeuristics(fleet: any[]) {
     if (!fleet || fleet.length === 0) return;
     // Simple heuristic: Take the range of the first vehicle, or default to 300 if not provided
     const firstRange = fleet[0]?.max_range_km;
     this.fleetHeuristics.defaultRangeKm = firstRange || 300;
     Logger.info(`[Traffic Scheduler] Fleet heuristics updated. Default VSP max range: ${this.fleetHeuristics.defaultRangeKm} km`);
  }

  async processTimetableUpdate(eventData: any) {
    const timetable = TimetableUpdatedSchema.parse(eventData);
    Logger.info(`[Traffic Scheduler] Processing normalized timetable update for period ${timetable.validFrom} to ${timetable.validTo}`);

    const result = await this.db.transaction(async (trx) => {
      // 1. Clear old operational data
      await trx('journey_calls').del();
      await trx('service_journeys').del();
      await trx('scheduled_stop_points').del();
      await trx('lines').del();
      await trx('tours').del();
      await trx('blocks').del();

      for (const line of timetable.lines) {
        await trx('lines').insert({ id: line.id, public_code: line.publicCode, name: line.name });
      }
      for (const sp of timetable.stopPoints) {
        await trx('scheduled_stop_points').insert({ id: sp.id, name: sp.name, lat: sp.lat, lon: sp.lon });
      }

      const vspTrips: Trip[] = [];
      for (const journey of timetable.journeys) {
        await trx('service_journeys').insert({
          id: journey.id,
          line_id: journey.lineId,
          direction: journey.direction,
          day_type_ref: journey.dayTypeRef
        });

        for (const call of journey.calls) {
          await trx('journey_calls').insert({
            service_journey_id: journey.id,
            stop_point_id: call.stopPointId,
            stop_sequence: call.stopSequence,
            arrival_time: call.arrivalTime,
            departure_time: call.departureTime,
            for_boarding: call.forBoarding,
            for_alighting: call.forAlighting,
            is_timing_point: call.isTimingPoint
          });
        }

        const firstCall = journey.calls[0];
        const lastCall = journey.calls[journey.calls.length - 1];
        
        vspTrips.push({
          id: journey.id,
          startLoc: firstCall.stopPointId,
          endLoc: lastCall.stopPointId,
          startTimeMs: new Date(firstCall.departureTime).getTime(),
          endTimeMs: new Date(lastCall.arrivalTime).getTime()
        });
      }

      Logger.info(`[Traffic Scheduler] Static network and ${vspTrips.length} journeys persisted. Running VSP Solver...`);
      return this.runSolverAndSave(vspTrips, trx, timetable.journeys, this.fleetHeuristics.defaultRangeKm);
    });

    Logger.info(`[Traffic Scheduler] Successfully generated ${result.blocksGenerated} DRAFT Blocks. Requesting Depot Energy Validation...`);
    
    // Instead of auto-assigning vehicles immediately, we initiate the Negotiation Saga!
    for (const blockData of result.validationPayloads) {
      await this.pubsub.publish('traffic-events', blockData);
    }

    return { 
      status: 'PENDING_DEPOT_VALIDATION', 
      blocksGenerated: result.blocksGenerated
    };
  }

  /**
   * Extracted solver logic to allow re-running it for partial blocks (splits).
   */
  private async runSolverAndSave(vspTrips: Trip[], trx: Knex.Transaction, allJourneys: any[], maxRangeKm: number) {
    const garagePointId = 'GaragePoint:Norrtalje:GP1';
    const optimizedBlocks = this.vspSolver.solveSingleDepotDetailed(vspTrips, garagePointId, maxRangeKm);

    const validationPayloads: BlockValidationRequested[] = [];

    for (const block of optimizedBlocks) {
      await trx('blocks').insert({
        id: block.id,
        start_garage_point_id: block.startGaragePoint,
        end_garage_point_id: block.endGaragePoint,
        vehicle_type_requirement: 'ELECTRIC_BUS',
        accumulated_distance_km: block.accumulatedDistanceKm,
        validation_status: 'DRAFT'
      });

      let sequence = 1;
      const toursForValidation = [];

      for (const item of block.items) {
        const tourId = uuidv4();
        const lineId = item.type === 'SERVICE' ? (allJourneys.find(j => j.id === item.tripId)?.lineId || 'UNKNOWN') : 'DEAD-RUN';
        
        const tourData = {
          id: tourId,
          block_id_new: block.id,
          service_journey_id: item.type === 'SERVICE' ? item.tripId : null,
          line_id: lineId,
          journey_type: item.type,
          sequence_in_block: sequence++,
          planned_start: new Date(item.start).toISOString(),
          planned_end: new Date(item.end).toISOString(),
          status: 'DRAFT',
          start_depot_id: item.from, 
          end_depot_id: item.to,
          distance_km: item.distanceKm
        };

        await trx('tours').insert(tourData);

        toursForValidation.push({
          id: tourId,
          from: item.from,
          to: item.to,
          startTime: item.start,
          endTime: item.end,
          distanceKm: item.distanceKm,
          type: item.type
        });
      }

      validationPayloads.push({
        eventType: 'BlockValidationRequested',
        blockId: block.id,
        startingSocKwh: 650,
        tours: toursForValidation
      });
    }

    return { blocksGenerated: optimizedBlocks.length, validationPayloads };
  }

  /**
   * The Agent Negotiation Cut!
   * Splits an invalid block into smaller trips and replans them.
   */
  async splitBlockAtFailure(blockId: string, failingTourId: string) {
    Logger.info(`[Traffic Scheduler] Agent Negotiation: Splitting invalid block ${blockId} at tour ${failingTourId}`);
    
    // Fallback static array of journeys for the line mapping. (In a real system, we'd query the DB).
    const allJourneys = await this.db('service_journeys').select('id', 'line_id as lineId');

    const validationPayloads = await this.db.transaction(async (trx) => {
      // 1. Get all tours for the failing block
      const allTours = await trx('tours').where({ block_id_new: blockId }).orderBy('sequence_in_block', 'asc');
      
      const failIdx = allTours.findIndex(t => t.id === failingTourId);
      if (failIdx === -1) throw new Error(`Tour ${failingTourId} not found in block ${blockId}`);

      // 2. Extract only the SERVICE trips, discarding the old Dead-Runs
      const serviceTours1 = allTours.slice(0, failIdx).filter(t => t.journey_type === 'SERVICE');
      const serviceTours2 = allTours.slice(failIdx).filter(t => t.journey_type === 'SERVICE');

      const mapToVspTrip = (t: any): Trip => ({
        id: t.service_journey_id,
        startLoc: t.start_depot_id,
        endLoc: t.end_depot_id,
        startTimeMs: new Date(t.planned_start).getTime(),
        endTimeMs: new Date(t.planned_end).getTime()
      });

      // 3. Delete the invalid block (cascades tours)
      await trx('blocks').where({ id: blockId }).del();

      // 4. Re-run VSP Solver on the two halves
      let payloads: BlockValidationRequested[] = [];
      
      if (serviceTours1.length > 0) {
        const res1 = await this.runSolverAndSave(serviceTours1.map(mapToVspTrip), trx, allJourneys, this.fleetHeuristics.defaultRangeKm);
        payloads = payloads.concat(res1.validationPayloads);
      }
      
      if (serviceTours2.length > 0) {
        const res2 = await this.runSolverAndSave(serviceTours2.map(mapToVspTrip), trx, allJourneys, this.fleetHeuristics.defaultRangeKm);
        payloads = payloads.concat(res2.validationPayloads);
      }

      return payloads;
    });

    // 5. Publish the new blocks for Depot validation
    for (const blockData of validationPayloads) {
      await this.pubsub.publish('traffic-events', blockData);
    }
  }
}
