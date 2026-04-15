import { Knex } from 'knex';
export interface OptimizationStrategy {
    strategy: 'SPOT_PRICE_HEDGING' | 'LOAD_BALANCING';
    targetSoC: number;
    startTime: string;
}
/**
 * ChargerAgent - Ansvarar för att exekvera laddningsbeslut i depån.
 */
export declare class ChargerAgent {
    private db;
    constructor(db: Knex);
    /**
     * Schemalägger laddning baserat på en strategi från CFO-agenten.
     */
    applyOptimizationStrategy(strategy: OptimizationStrategy): Promise<{
        success: boolean;
        count: number;
    }>;
}
