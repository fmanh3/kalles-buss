"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChargerAgent = void 0;
/**
 * ChargerAgent - Ansvarar för att exekvera laddningsbeslut i depån.
 */
class ChargerAgent {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Schemalägger laddning baserat på en strategi från CFO-agenten.
     */
    async applyOptimizationStrategy(strategy) {
        console.log(`[ChargerAgent] Tillämpar strategi: ${strategy.strategy}. Mål SoC: ${strategy.targetSoC}% vid ${strategy.startTime}`);
        // 1. Hitta alla fordon som är anslutna till en laddare just nu
        const connectedVehicles = await this.db('vehicle_depot_status')
            .whereNotNull('connected_station_id');
        console.log(`[ChargerAgent] Hittade ${connectedVehicles.length} anslutna fordon.`);
        for (const vehicle of connectedVehicles) {
            // 2. Skapa en planerad laddningssession
            await this.db('charging_sessions').insert({
                station_id: vehicle.connected_station_id,
                vehicle_id: vehicle.vehicle_id,
                start_time: new Date(strategy.startTime),
                start_soc: vehicle.current_soc,
                optimization_strategy: strategy.strategy
            });
            console.log(`[ChargerAgent] ✅ Laddning schemalagd för ${vehicle.vehicle_id} vid ${strategy.startTime}`);
        }
        return { success: true, count: connectedVehicles.length };
    }
}
exports.ChargerAgent = ChargerAgent;
//# sourceMappingURL=charger-agent.js.map