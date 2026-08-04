import { Logger, PubSubClient, BlockValidationResultSchema } from '@kalles-buss/shared-utils';
import { ScheduleService } from './schedule-service';
import { ResourceSolverService } from './resource-solver-service';
import { Knex } from 'knex';

export class EnergyNegotiationListener {
  constructor(
    private pubsub: PubSubClient,
    private scheduleService: ScheduleService,
    private resourceSolver: ResourceSolverService,
    private db: Knex
  ) {}

  async startListening() {
    Logger.info('[EnergyNegotiationListener] Listening for Depot BlockValidationResult events...');

    await this.pubsub.subscribe('depot-events', 'traffic-block-validation-sub', async (eventData: any) => {
      try {
        if (eventData.eventType === 'BlockValidationResult') {
          const result = BlockValidationResultSchema.parse(eventData);

          if (result.isValid) {
            Logger.info(`[EnergyNegotiationListener] Block ${result.blockId} APPROVED by Depot.`);
            await this.db('blocks').where({ id: result.blockId }).update({ validation_status: 'VALIDATED' });

            // Check if all blocks are validated
            const draftCount = await this.db('blocks').where({ validation_status: 'DRAFT' }).count('id as cnt').first();
            if (Number(draftCount?.cnt) === 0) {
               Logger.info(`[EnergyNegotiationListener] All blocks are now VALIDATED! Triggering vehicle assignment...`);
               await this.resourceSolver.autoAssignVehicles();
            }

          } else {
            Logger.warn(`[EnergyNegotiationListener] Block ${result.blockId} REJECTED by Depot. Failed at tour ${result.failurePoint}. Initiating Block Split...`);
            if (!result.failurePoint) throw new Error("Missing failurePoint in invalid block result");
            
            await this.scheduleService.splitBlockAtFailure(result.blockId, result.failurePoint);
          }
        }
      } catch (err: any) {
        Logger.error(`[EnergyNegotiationListener] Failed to process validation result: ${err.message}`);
      }
    });
  }
}
