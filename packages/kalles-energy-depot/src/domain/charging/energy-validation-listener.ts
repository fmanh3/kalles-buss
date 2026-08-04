import { Logger, PubSubClient, BlockValidationRequestedSchema, BlockValidationResult } from '@kalles-buss/shared-utils';
import { OppChargeSimulator } from './oppcharge-simulator';

export class EnergyValidationListener {
  constructor(
    private pubsub: PubSubClient,
    private oppChargeSimulator: OppChargeSimulator
  ) {}

  async startListening() {
    Logger.info('[EnergyValidationListener] Starting to listen for BlockValidationRequested events...');

    await this.pubsub.subscribe('traffic-events', 'depot-block-validation-sub', async (eventData: any) => {
      try {
        if (eventData.eventType === 'BlockValidationRequested') {
          const parsed = BlockValidationRequestedSchema.parse(eventData);
          Logger.info(`[EnergyValidationListener] Validating block ${parsed.blockId}...`);

          const result = this.oppChargeSimulator.simulateBlock(parsed.blockId, parsed.tours, parsed.startingSocKwh);

          const responseEvent: BlockValidationResult = {
            eventType: 'BlockValidationResult',
            blockId: parsed.blockId,
            isValid: result.isValid,
            failurePoint: result.failurePoint
          };

          await this.pubsub.publish('depot-events', responseEvent);
          Logger.info(`[EnergyValidationListener] Validation complete for ${parsed.blockId}. Result: ${result.isValid}. Published to depot-events.`);
        }
      } catch (err: any) {
        Logger.error(`[EnergyValidationListener] Validation failed: ${err.message}`);
      }
    });
  }
}
