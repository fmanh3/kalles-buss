import type { Knex } from 'knex';
import { Logger } from '@kalles-buss/shared-utils';
import { InventoryService } from '../inventory/inventory-service';

export class RepairNegotiatorAgent {
  constructor(private db: Knex, private inventory: InventoryService) {}

  /**
   * Evaluates a defect and negotiates the best repair path.
   * Implements "The Windshield Principle".
   */
  async negotiateRepairStrategy(defectId: string, depotId: string, requiredPartId: string) {
    Logger.info(`[RepairNegotiator] Commencing cross-domain negotiation for defect ${defectId}`);

    // 1. Check physical reality (Inventory & Supply Chain)
    const part = await this.inventory.getPartAvailability(depotId, requiredPartId);
    
    // Base Internal Labor Cost
    const internalLaborCost = 2000;
    
    // Internal Repair Calculation 1: Expedited (Fastest) Supply Chain
    const internalFastTotalCost = part.fastestOption.cost + internalLaborCost;
    const internalFastDaysOffline = part.availableNow ? 1 : part.fastestOption.days + 1;
    
    // Internal Repair Calculation 2: Standard (Cheapest) Supply Chain
    const internalCheapTotalCost = part.cheapestOption.cost + internalLaborCost;
    const internalCheapDaysOffline = part.availableNow ? 1 : part.cheapestOption.days + 1;

    // External Repair Calculation (Mocked Quote from Ryds Bilglas etc)
    // Assume external partner has their own stock and charges a 150% premium on the cheapest part cost, plus higher labor
    const externalTotalCost = part.cheapestOption.cost * 2.5 + 4000; 
    const externalDaysOffline = 1; // Immediate fix

    // 2. Query Traffic Agent (Simulated)
    // "What is the penalty cost if this bus is grounded for X days?"
    const penaltyPerDay = await this.simulateTrafficImpact(depotId);
    const internalFastPenaltyLoss = penaltyPerDay * internalFastDaysOffline;
    const internalCheapPenaltyLoss = penaltyPerDay * internalCheapDaysOffline;
    const externalPenaltyLoss = penaltyPerDay * externalDaysOffline;

    // 3. Query CFO Agent (Simulated)
    // "Do we have liquidity for the external repair?"
    const hasLiquidityForExternal = await this.simulateCfoLiquidityCheck(externalTotalCost);

    // 4. Decision Algorithm (Minimize Total Negative Impact)
    const internalFastTotalLoss = internalFastTotalCost + internalFastPenaltyLoss;
    const internalCheapTotalLoss = internalCheapTotalCost + internalCheapPenaltyLoss;
    const externalTotalLoss = externalTotalCost + externalPenaltyLoss;

    let decision: 'USE_INTERNAL_MECHANIC_STANDARD' | 'USE_INTERNAL_MECHANIC_EXPEDITE' | 'USE_EXTERNAL_PARTNER' = 'USE_INTERNAL_MECHANIC_STANDARD';
    let rationale = '';

    // Compare the three options
    if (externalTotalLoss <= internalFastTotalLoss && externalTotalLoss <= internalCheapTotalLoss && hasLiquidityForExternal) {
      decision = 'USE_EXTERNAL_PARTNER';
      rationale = `External is cheapest overall (Loss: ${externalTotalLoss} SEK). High Traffic penalties (${penaltyPerDay}/day) offset the high external invoice. Liquidity approved.`;
    } 
    else if (internalFastTotalLoss < internalCheapTotalLoss) {
      decision = 'USE_INTERNAL_MECHANIC_EXPEDITE';
      rationale = `Expedited internal repair is optimal (Loss: ${internalFastTotalLoss} SEK). Saving ${part.cheapestOption.days - part.fastestOption.days} days of traffic penalties justifies the higher part cost.`;
    } 
    else {
      decision = 'USE_INTERNAL_MECHANIC_STANDARD';
      rationale = `Standard internal repair is optimal (Loss: ${internalCheapTotalLoss} SEK). Low traffic penalties mean we can afford to wait ${internalCheapDaysOffline} days for the cheapest part.`;
    }

    // 5. Audit Logging (Decision Record)
    // In a full EAM, this decision would instantly spawn a Work Order.
    // We mock that generation here and log the rationale as the WO description.
    
    // Fetch the defect to get the asset_id
    const defect = await this.db('defects').where({ id: defectId }).first();
    
    if (defect) {
       await this.db('work_orders').insert({
         asset_id: defect.asset_id,
         depot_id: depotId,
         defect_id: defectId,
         title: `Repair Strategy: ${decision}`,
         description: rationale,
         status: 'PLANNED',
         priority: 'HIGH'
       });
       Logger.warn(`[Decision Logged] Work Order created based on Agent strategy for ${defectId}: ${decision}. Rationale: ${rationale}`);
    } else {
       Logger.warn(`[Decision Logged] Repair strategy for ${defectId}: ${decision}. Rationale: ${rationale}`);
    }

    return { decision, rationale };
  }

  // --- Mocks for Cross-Domain Communication ---

  private async simulateTrafficImpact(depotId: string): Promise<number> {
    // If Norrtälje has a shortage, the daily penalty for a broken bus is 15,000 SEK.
    // If Tekniska has spare buses, the penalty is 0 SEK.
    return depotId === 'DEPOT-NTA' ? 15000 : 0;
  }

  private async simulateCfoLiquidityCheck(requiredAmount: number): Promise<boolean> {
    // Simulate CFO rejecting expenses over 50k if cashflow is tight
    return requiredAmount < 50000;
  }
}
