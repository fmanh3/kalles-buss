import { Knex } from 'knex';
export interface DamageReport {
    assetId: string;
    description: string;
    reportedBy: string;
}
/**
 * MaintenanceAgent - Översätter skaderapporter till arbetsorder och reservdelsbehov.
 */
export declare class MaintenanceAgent {
    private db;
    private pubsub;
    constructor(db: Knex);
    /**
     * UC-DEPOT-01: Behandla skaderapport och skapa arbetsorder.
     */
    processDamageReport(report: DamageReport): Promise<{
        workOrderId: any;
        requiredItem: string;
        stockStatus: string;
    }>;
    /**
     * UC-DEPOT-02: Triggar inköpsprocessen genom att hitta bästa leverantör.
     * Väger pris mot ledtid baserat på hur akut bussen behövs.
     */
    private triggerProcurement;
}
