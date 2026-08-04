import axios from 'axios';
import { Logger, Scenario } from '@kalles-buss/shared-utils';
import { KodaBacktester } from './koda-backtester';
import * as fs from 'fs';
import * as path from 'path';

export class ScenarioOrchestrator {
  private hrUrl = process.env.HR_SERVICE_URL || 'http://localhost:8082';
  private financeUrl = process.env.FINANCE_SERVICE_URL || 'http://localhost:8084';
  private trafficUrl = process.env.TRAFFIC_SERVICE_URL || 'http://localhost:8088';
  private depotUrl = process.env.DEPOT_SERVICE_URL || 'http://localhost:8081';
  private bffUrl = process.env.BFF_SERVICE_URL || 'http://localhost:8080';
  private kodaBacktester = new KodaBacktester();

  /**
   * Triggers an empty seed across all domains, which results in a complete operational data purge.
   */
  async hardReset() {
    Logger.info(`--- HARD RESET: PURGING ALL DOMAIN DATA ---`);
    await Promise.all([
      axios.post(`${this.financeUrl}/api/sandbox/seed`, { startingCashSek: 0 }),
      axios.post(`${this.hrUrl}/api/sandbox/seed`, { roster: [] }),
      axios.post(`${this.depotUrl}/api/sandbox/seed`, { fleet: [], garages: [] }),
      axios.post(`${this.trafficUrl}/api/sandbox/seed`, {})
    ]);
  }

  /**
   * Resets the entire sandbox world and seeds it with the scenario's initial state.
   */
  async setupScenario(scenario: Scenario) {
    Logger.info(`--- SETTING UP SCENARIO: ${scenario.metadata.name} ---`);

    try {
      // 1. Seed HR
      await axios.post(`${this.hrUrl}/api/sandbox/seed`, { roster: scenario.initialState.hr.roster });
      Logger.info('[Orchestrator] HR seeded.');

      // 2. Seed Finance
      await axios.post(`${this.financeUrl}/api/sandbox/seed`, { startingCashSek: scenario.initialState.finance.startingCashSek });
      Logger.info('[Orchestrator] Finance seeded.');

      // 3. Seed Depot
      await axios.post(`${this.depotUrl}/api/sandbox/seed`, { fleet: scenario.initialState.fleet });
      Logger.info('[Orchestrator] Depot seeded.');

      // 4. Seed Traffic
      await axios.post(`${this.trafficUrl}/api/sandbox/seed`, { fleet: scenario.initialState.fleet });
      Logger.info('[Orchestrator] Traffic reset with fleet constraints.');

      // 5. Trigger NeTEx/Synthetic sync via BFF based on bound asset (Milestone 12)
      if (scenario.assetInfo) {
        Logger.info(`[Orchestrator] Triggering data asset ingestion: ${scenario.assetInfo.type}...`);
        if (scenario.assetInfo.type === 'NETEX_ZIP') {
          // Future: Download from Trafiklab if missing, but for now we assume local/cached
          await axios.post(`${this.bffUrl}/api/qa/netex/parse`, { 
            filename: scenario.assetInfo.config.filename, 
            lines: scenario.assetInfo.config.lines || ['676']
          });
        } else if (scenario.assetInfo.type === 'SYNTHETIC_PROFILE') {
          // The adapter currently handles 'latest' as a trigger for synthetic generation
          await axios.post(`${this.bffUrl}/api/qa/netex/parse`, { 
            filename: 'latest', 
            lines: scenario.assetInfo.config.lines || ['676']
          });
        }
      }

      // 6. Fetch SMHI Weather (Simulated for now, real SMHI fetch below)
      const weather = await this.fetchHistoricalWeather(scenario.stimuli.weatherDate);
      Logger.info(`[Orchestrator] Weather for ${scenario.stimuli.weatherDate} loaded: ${weather.temp}°C, ${weather.risk} risk.`);

      // 7. Trigger Telemetry Replay if a tape was selected
      if ((scenario as any).kodaTapeName) {
        let tapeName = (scenario as any).kodaTapeName;
        const tapePath = path.join(__dirname, '../../src/tapes', tapeName);
        
        // JIT Download/Generation if the file doesn't exist locally
        if (!fs.existsSync(tapePath)) {
           if ((scenario as any).kodaTargetDate && (scenario as any).kodaTargetLineId) {
              Logger.info(`[Orchestrator] Tape ${tapeName} not found locally. Initiating JIT download...`);
              const result = await this.kodaBacktester.buildTapeFromHistory((scenario as any).kodaTargetDate, (scenario as any).kodaTargetLineId);
              tapeName = result.tapeName;
           } else {
              throw new Error(`Tape ${tapeName} is missing and no Target Date/Line provided to regenerate it.`);
           }
        }

        Logger.info(`[Orchestrator] Triggering KoDa Tape replay: ${tapeName}...`);
        // Note: Replay runs asynchronously via the BFF (or we could just run it directly if preferred, but BFF is fine)
        axios.post(`${this.bffUrl}/api/qa/replay-tape`, { tapeName })
             .catch(e => Logger.error(`[Orchestrator] Failed to start replay: ${e.message}`));
      }

      return { status: 'WORLD_READY', runId: `RUN-${Date.now()}` };
    } catch (err: any) {
      Logger.error(`[Orchestrator] Scenario setup failed: ${err.message}`);
      throw err;
    }
  }

  private async fetchHistoricalWeather(date: string) {
    // In production, we'd call: https://opendata-download-metobs.smhi.se/api/...
    // For now, return a deterministic weather based on the date
    const isCold = date.includes('-01-') || date.includes('-02-');
    return {
      temp: isCold ? -15 : 18,
      risk: isCold ? 'HIGH' : 'LOW',
      description: isCold ? 'Severe Snowstorm' : 'Clear Skies'
    };
  }
}
