import { MasterSeeder } from './master-seeder';
import { Logger } from '../observability';

/**
 * CLI utility to perform a full system reset and baseline seed.
 * Usage: npx ts-node system-reset.ts
 */
async function main() {
  try {
    await MasterSeeder.resetAll();
    await MasterSeeder.seedEnterpriseBaseline();
    Logger.info('✨ SYSTEM READY FOR TESTING OR SIMULATION');
    process.exit(0);
  } catch (err: any) {
    Logger.error(`❌ System reset failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
