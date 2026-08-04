import type { Knex } from 'knex';
import { PubSubClient, Logger } from '@kalles-buss/shared-utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Inventory Agent - The strategist for parts and supply chain.
 */
export class InventoryAgent {
  private pubsub: PubSubClient;
  private pendingNegotiations: Map<string, (result: any) => void> = new Map();

  constructor(private db: Knex) {
    this.pubsub = new PubSubClient();
  }

  async start() {
    Logger.info('[InventoryAgent] Activating Supply Chain Intelligence...');

    // Use a unique sub name to avoid clashes
    await this.pubsub.subscribe('finance-events', 'inventory-agent-negotiation-sub', async (event: any) => {
      Logger.info(`[InventoryAgent] Received event: ${event.eventType}`);
      if (event.eventType === 'ProcurementLiquidityResponse') {
        const resolve = this.pendingNegotiations.get(event.requestId);
        if (resolve) {
          Logger.info(`[InventoryAgent] Resolving negotiation ${event.requestId}`);
          resolve(event);
          this.pendingNegotiations.delete(event.requestId);
        }
      }
    });
  }

  async negotiateReplenishment(partId: string, locationId: string) {
    Logger.info(`[InventoryAgent] Evaluating replenishment for Part ${partId} at ${locationId}`);

    const part = await this.db('parts').where({ id: partId }).first();
    if (!part) throw new Error('Part not found');

    const expressCost = 3000;
    const requestId = uuidv4();
    
    Logger.info(`[InventoryAgent] Negotiation started: ${requestId}. Querying CFO.`);

    // Wait for CFO decision
    const cfoDecisionPromise = new Promise((resolve) => {
      this.pendingNegotiations.set(requestId, resolve);
      
      this.pubsub.publish('finance-events', {
        eventType: 'ProcurementLiquidityQuery',
        requestId,
        amount: expressCost,
        priority: 'NORMAL',
        category: 'MAINTENANCE_PARTS',
        item: part.description
      });
    });

    try {
      const cfoDecision: any = await Promise.race([
        cfoDecisionPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('CFO Timeout')), 30000)) // 30s timeout
      ]);

      let finalDecision = cfoDecision.approved ? 'EXPRESS' : 'STANDARD';
      
      await this.pubsub.publish('depot-events', {
        eventType: 'ProcurementDecision',
        partId,
        locationId,
        strategy: finalDecision,
        rationale: cfoDecision.rationale
      });

      return { strategy: finalDecision, rationale: cfoDecision.rationale };
    } catch (err: any) {
      Logger.error(`[InventoryAgent] Negotiation failed: ${err.message}`);
      throw err;
    }
  }
}
