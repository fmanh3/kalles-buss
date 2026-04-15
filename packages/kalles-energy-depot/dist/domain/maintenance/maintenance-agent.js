"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceAgent = void 0;
const pubsub_1 = require("@google-cloud/pubsub");
/**
 * MaintenanceAgent - Översätter skaderapporter till arbetsorder och reservdelsbehov.
 */
class MaintenanceAgent {
    db;
    pubsub;
    constructor(db) {
        this.db = db;
        this.pubsub = new pubsub_1.PubSub({ projectId: 'joakim-hansson-lab' });
    }
    /**
     * UC-DEPOT-01: Behandla skaderapport och skapa arbetsorder.
     */
    async processDamageReport(report) {
        console.log(`[MaintenanceAgent] Behandlar skaderapport för ${report.assetId}: ${report.description}`);
        // 1. Identifiera reservdel baserat på beskrivning (AI-simulering)
        let itemId = 'KB-GENERIC-PART';
        if (report.description.toLowerCase().includes('säte')) {
            itemId = 'KB-SEAT-04';
        }
        else if (report.description.toLowerCase().includes('filter')) {
            itemId = 'KB-FILTER-001';
        }
        // 2. Skapa Arbetsorder (Work Order)
        const [workOrder] = await this.db('work_orders').insert({
            vehicle_id: report.assetId,
            description: `Reparation: ${report.description}`,
            status: 'PLANNED'
        }).returning('*');
        // 3. Kontrollera lagernivå
        const item = await this.db('internal_items').where({ id: itemId }).first();
        console.log(`[MaintenanceAgent] Reservdel identifierad: ${itemId}. Lagersaldo: ${item?.stock_level || 0}`);
        // 4. Om lagret är lågt (eller noll): Trigga autonomt inköp (Milstolpe 9.5)
        if (!item || item.stock_level <= 0) {
            console.log(`[MaintenanceAgent] 📦 Lagret är tomt för ${itemId}. Initierar autonomt inköp...`);
            await this.triggerProcurement(itemId, report.assetId);
        }
        return {
            workOrderId: workOrder.id,
            requiredItem: itemId,
            stockStatus: item?.stock_level > 0 ? 'AVAILABLE' : 'ORDER_REQUIRED'
        };
    }
    /**
     * UC-DEPOT-02: Triggar inköpsprocessen genom att hitta bästa leverantör.
     * Väger pris mot ledtid baserat på hur akut bussen behövs.
     */
    async triggerProcurement(itemId, assetId) {
        // 1. Kontrollera hur akut bussen behövs (AI-simulering)
        // I en framtida version frågar vi SchedulingAgent om nästa planerade tur.
        const isUrgent = true; // Simulerar att bussen behövs inom 24h
        // 2. Hitta leverantörer
        const mappings = await this.db('item_supplier_mapping')
            .where({ internal_item_id: itemId });
        if (mappings.length === 0) {
            console.warn(`[MaintenanceAgent] Inga leverantörer hittade för ${itemId}`);
            return;
        }
        let bestDeal;
        if (isUrgent) {
            // Prioritera kortast ledtid
            console.log(`[MaintenanceAgent] ⚡ AKUT BEHOV: Prioriterar ledtid för ${assetId}`);
            bestDeal = mappings.sort((a, b) => a.lead_time_days - b.lead_time_days)[0];
        }
        else {
            // Prioritera lägst pris
            bestDeal = mappings.sort((a, b) => a.price - b.price)[0];
        }
        if (bestDeal) {
            console.log(`[MaintenanceAgent] Valt alternativ: Vendor ${bestDeal.vendor_id}, Ledtid: ${bestDeal.lead_time_days} dagar, Pris: ${bestDeal.price} SEK`);
            const [po] = await this.db('purchase_orders').insert({
                vendor_id: bestDeal.vendor_id,
                total_amount: bestDeal.price,
                status: 'CREATED'
            }).returning('*');
            // Publicera event till Finance (Leverantörsreskontran)
            const poEvent = {
                type: 'PURCHASE_ORDER_CREATED',
                poId: po.id,
                vendorId: bestDeal.vendor_id,
                itemId: itemId,
                amount: bestDeal.price,
                reference: `REPAIR-${assetId}`
            };
            const dataBuffer = Buffer.from(JSON.stringify(poEvent));
            await this.pubsub.topic('finance-events').publishMessage({ data: dataBuffer });
        }
    }
}
exports.MaintenanceAgent = MaintenanceAgent;
//# sourceMappingURL=maintenance-agent.js.map