import type { Knex } from 'knex';
import { Logger } from '@kalles-buss/shared-utils';

export class InventoryService {
  constructor(private db: Knex) {}

  /**
   * Consumes a part from inventory for a specific WO line. Auto-procures if below reorder point.
   */
  async consumePart(locationId: string, partId: string, quantity: number, woLineId: string, userId: string) {
    return this.db.transaction(async (trx) => {
      // 1. Check current balance from the View
      const balance = await trx('current_inventory_balances')
        .where({ location_id: locationId, part_id: partId })
        .first();

      const currentQty = balance ? Number(balance.current_quantity) : 0;

      if (currentQty < quantity) {
        throw new Error(`Insufficient stock for Part ${partId} at location ${locationId}. Have ${currentQty}, need ${quantity}.`);
      }

      // 2. We need the current unit cost for the snapshot.
      // EAM Best Practice: Get the last received cost, or a moving average. We'll use the last known cost from the ledger.
      const lastTransaction = await trx('inventory_transactions')
        .where({ part_id: partId })
        .whereNotNull('unit_cost')
        .orderBy('created_at', 'desc')
        .first();
        
      const unitCost = lastTransaction ? lastTransaction.unit_cost : 0;

      // 3. Write to the Ledger (decreases balance via multiplier -1)
      await trx('inventory_transactions').insert({
        part_id: partId,
        location_id: locationId,
        transaction_type: 'WO_ISSUE',
        quantity: quantity,
        unit_cost: unitCost,
        work_order_id: woLineId, // Simplified: tying it directly to the WO in the ledger
        created_by: userId
      });

      // 4. Update the Work Order Parts consumption record
      // We look for an existing line to update, or create one if this is unplanned consumption
      const woPart = await trx('work_order_parts')
        .where({ wo_line_id: woLineId, part_id: partId })
        .first();

      if (woPart) {
         await trx('work_order_parts')
           .where({ id: woPart.id })
           .update({ 
              quantity_used: Number(woPart.quantity_used) + quantity,
              unit_cost: unitCost,
              is_issued: true
           });
      } else {
         await trx('work_order_parts').insert({
            wo_line_id: woLineId,
            part_id: partId,
            quantity_required: quantity, // Unplanned, so required = used
            quantity_used: quantity,
            unit_cost: unitCost,
            is_issued: true
         });
      }

      const newQuantity = currentQty - quantity;
      Logger.info(`[Inventory] Consumed ${quantity}x ${partId} at ${locationId} for WO Line ${woLineId}. Remaining: ${newQuantity}`);

      // 5. Auto-Procurement check
      // We check the stock rules for this location to see if we dropped below min_stock
      const stockRule = await trx('inventory_stock_rules')
        .where({ location_id: locationId, part_id: partId })
        .first();

      if (stockRule && newQuantity <= stockRule.min_stock_level) {
        // Find the depot for this location to link the PO correctly
        const loc = await trx('inventory_locations').where({ id: locationId }).first();
        if (loc) {
          const orderQty = stockRule.max_stock_level ? (stockRule.max_stock_level - newQuantity) : stockRule.standard_reorder_qty;
          await this.autoProcure(trx, loc.depot_id, partId, orderQty);
        }
      }

      return { partId, remaining: newQuantity };
    });
  }

  /**
   * Generates a Purchase Order (Mocked for now in CMMS) for a specific part.
   */
  async autoProcure(trx: Knex.Transaction, depotId: string, partId: string, orderQuantity: number, expedite: boolean = false) {
    const part = await trx('parts').where({ id: partId }).first();
    if (!part) return;

    // Select the best supplier from part_vendors
    const bestSupplierOption = await trx('part_vendors')
      .where({ part_id: partId })
      .orderBy(expedite ? 'lead_time_days' : 'id', 'asc') // Fallback order if cost is missing
      .first();

    if (!bestSupplierOption) {
      Logger.error(`[Auto-Procurement] No vendor found for Part ${partId}. Cannot procure!`);
      return;
    }

    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + (bestSupplierOption.lead_time_days || 3));

    // PO table is temporarily mocked out of the CMMS DB schema, but the agent logs the intent.
    Logger.warn(`[Auto-Procurement] Procurement Agent triggered for ${partId}. Vendor: ${bestSupplierOption.vendor_id}. Lead time: ${bestSupplierOption.lead_time_days} days.`);
  }

  /**
   * IN-TRANSIT LOGISTICS: Ships a part from one location to another.
   */
  async shipTransfer(fromLocationId: string, toLocationId: string, partId: string, quantity: number, userId: string) {
    return this.db.transaction(async (trx) => {
      // 1. Verify stock
      const balance = await trx('current_inventory_balances')
        .where({ location_id: fromLocationId, part_id: partId })
        .first();

      if (!balance || Number(balance.current_quantity) < quantity) {
        throw new Error(`Cannot ship: Insufficient stock at origin location.`);
      }

      // 2. Get Unit Cost
      const lastTransaction = await trx('inventory_transactions')
        .where({ part_id: partId }).whereNotNull('unit_cost').orderBy('created_at', 'desc').first();
      const unitCost = lastTransaction ? lastTransaction.unit_cost : 0;

      // 3. Create Transfer Record
      const transferNumber = `TRF-${Date.now()}`;
      const [transfer] = await trx('inventory_transfers').insert({
        transfer_number: transferNumber,
        part_id: partId,
        quantity: quantity,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        status: 'IN_TRANSIT',
        shipped_by: userId
      }).returning('*');

      // 4. Write to Ledger: Deduct from origin (TRANSFER_OUT is multiplier -1)
      await trx('inventory_transactions').insert({
        part_id: partId,
        location_id: fromLocationId,
        transaction_type: 'TRANSFER_OUT',
        quantity: quantity,
        unit_cost: unitCost,
        reference_document: transferNumber,
        created_by: userId
      });

      // 5. In an advanced EAM, we would now INSERT into a virtual "In Transit" bin (TRANSFER_IN).
      // For this implementation, the inventory is simply deducted from the origin and "disappears"
      // until it is received at the destination. The 'inventory_transfers' table acts as the ledger 
      // of what is currently floating in cyberspace.

      Logger.info(`[Logistics] Shipped ${quantity}x ${partId} from ${fromLocationId} to ${toLocationId}. Transfer: ${transferNumber}`);
      return transfer;
    });
  }

  /**
   * IN-TRANSIT LOGISTICS: Receives a shipped part at its destination.
   */
  async receiveTransfer(transferId: string, userId: string) {
    return this.db.transaction(async (trx) => {
      const transfer = await trx('inventory_transfers').where({ id: transferId }).first();
      
      if (!transfer) throw new Error(`Transfer ${transferId} not found.`);
      if (transfer.status !== 'IN_TRANSIT') throw new Error(`Transfer ${transferId} is already ${transfer.status}.`);

      // 1. Get Unit Cost from the origin transaction
      const originTx = await trx('inventory_transactions')
        .where({ reference_document: transfer.transfer_number, transaction_type: 'TRANSFER_OUT' })
        .first();
      const unitCost = originTx ? originTx.unit_cost : 0;

      // 2. Write to Ledger: Add to destination (TRANSFER_IN is multiplier 1)
      await trx('inventory_transactions').insert({
        part_id: transfer.part_id,
        location_id: transfer.to_location_id,
        transaction_type: 'TRANSFER_IN',
        quantity: transfer.quantity,
        unit_cost: unitCost,
        reference_document: transfer.transfer_number,
        created_by: userId
      });

      // 3. Update Transfer Status
      const [updatedTransfer] = await trx('inventory_transfers')
        .where({ id: transferId })
        .update({
           status: 'COMPLETED',
           received_by: userId,
           received_at: this.db.fn.now()
        }).returning('*');

      Logger.info(`[Logistics] Received transfer ${transfer.transfer_number} at destination ${transfer.to_location_id}.`);
      return updatedTransfer;
    });
  }

  /**
   * Used by The Negotiator. Finds the fastest and the cheapest available option.
   */
  async getPartAvailability(depotId: string, partId: string): Promise<{ 
    availableNow: boolean, 
    fastestOption: { days: number, cost: number },
    cheapestOption: { days: number, cost: number } 
  }> {
    // 1. Get location for this depot
    const location = await this.db('inventory_locations').where({ depot_id: depotId }).first();
    let hasStock = false;

    if (location) {
        // Read from the new View
        const balance = await this.db('current_inventory_balances')
            .where({ location_id: location.id, part_id: partId })
            .first();
        hasStock = balance && Number(balance.current_quantity) > 0;
    }

    // Get supplier options
    const suppliers = await this.db('part_vendors').where({ part_id: partId }).orderBy('lead_time_days', 'asc');
    
    // Fallback mocks if no vendors configured
    if (!suppliers || suppliers.length === 0) {
       return {
          availableNow: hasStock,
          fastestOption: { days: 1, cost: 2000 },
          cheapestOption: { days: 3, cost: 1000 }
       };
    }

    const fastestSupplier = suppliers[0];
    const cheapestSupplier = suppliers[suppliers.length - 1]; // Mocking cheapest as last for now

    return {
      availableNow: hasStock,
      fastestOption: {
        days: fastestSupplier.lead_time_days || 1,
        cost: 2000 // Mocked cost since part_vendors unit_price wasn't requested, we'd normally join parts or vendor catalogs here
      },
      cheapestOption: {
        days: cheapestSupplier.lead_time_days || 3,
        cost: 1000 // Mocked cost
      }
    };
  }
}
