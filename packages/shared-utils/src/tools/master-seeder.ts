import axios from 'axios';
import { Logger } from '../observability';

const CONFIG = {
  HR: 'http://localhost:8082',
  PAYROLL: 'http://localhost:8083',
  FINANCE: 'http://localhost:8084',
  DEPOT: 'http://localhost:8081',
  PROCESS: 'http://localhost:8086',
  TRAFFIC: 'http://localhost:8085'
};

/**
 * The Master Seeder orchestrates a clean-state reset across all domains.
 * This is used for E2E testing and starting simulations from "Day Zero".
 */
export class MasterSeeder {
  static async resetAll() {
    Logger.info('🧹 --- GLOBAL SYSTEM RESET INITIATED ---');

    const domains = [
      { name: 'FINANCE', url: CONFIG.FINANCE },
      { name: 'HR', url: CONFIG.HR },
      { name: 'DEPOT', url: CONFIG.DEPOT },
      { name: 'PROCESS', url: CONFIG.PROCESS },
      { name: 'TRAFFIC', url: CONFIG.TRAFFIC }
    ];

    for (const domain of domains) {
      try {
        Logger.info(`[MasterSeeder] Resetting ${domain.name}...`);
        await axios.post(`${domain.url}/api/sandbox/reset`);
      } catch (err: any) {
        Logger.warn(`[MasterSeeder] Could not reset ${domain.name}: ${err.message}`);
      }
    }
  }

  static async seedEnterpriseBaseline() {
    Logger.info('🌱 --- SEEDING ENTERPRISE BASELINE ---');

    try {
      // 1. Finance starting capital
      await axios.post(`${CONFIG.FINANCE}/api/sandbox/seed`, { startingCashSek: 2000000 });
      
      // 2. Depot Fleet & Master Data
      // (Triggered via its own seed script for now, but should be API in real app)
      
      Logger.info('✅ Enterprise baseline seeded successfully.');
    } catch (err: any) {
      Logger.error(`❌ Global seeding failed: ${err.message}`);
    }
  }
}
