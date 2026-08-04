import type { Knex } from 'knex';
import { PubSubClient, Logger } from '@kalles-buss/shared-utils';

/**
 * CFO Agent - The voice of financial reason.
 */
export class CfoAgent {
  private pubsub: PubSubClient;

  constructor(private db: Knex) {
    this.pubsub = new PubSubClient();
  }

  async start() {
    Logger.info('[CfoAgent] Activating Financial Intelligence...');

    await this.pubsub.subscribe('finance-events', 'cfo-procurement-negotiation-sub', async (event: any) => {
      try {
        if (event.eventType === 'ProcurementLiquidityQuery') {
          await this.handleLiquidityQuery(event);
        }
      } catch (err: any) {
        Logger.error(`[CfoAgent] Error in negotiation: ${err.message}`);
      }
    });
  }

  private async handleLiquidityQuery(event: any) {
    const { requestId, amount, priority, category } = event;
    
    Logger.info(`[CfoAgent] Analyzing procurement request: ${amount} SEK for ${category} (Priority: ${priority})`);

    const balanceResult = await this.db('ledger_entries')
      .where({ account_code: '1930' })
      .select(this.db.raw('SUM(debit - credit) as balance'))
      .first();
    
    const currentBalance = parseFloat(balanceResult?.balance || '0');
    
    let approved = false;
    let rationale = '';

    if (priority === 'CRITICAL') {
      approved = currentBalance >= amount;
      rationale = approved ? 'Approved: Critical safety priority.' : 'REJECTED: Insufficient funds for critical item.';
    } else {
      const minReserve = 50000;
      approved = (currentBalance - amount >= minReserve);
      rationale = approved ? 'Approved: Normal procurement.' : `REJECTED: Preserving 50k buffer. Current: ${currentBalance.toLocaleString()} SEK.`;
    }

    await this.pubsub.publish('finance-events', {
      eventType: 'ProcurementLiquidityResponse',
      requestId,
      approved,
      rationale,
      timestamp: new Date()
    });

    Logger.warn(`[CfoAgent Decision] ${requestId}: ${approved ? 'APPROVED' : 'REJECTED'}. Rationale: ${rationale}`);
  }
}
