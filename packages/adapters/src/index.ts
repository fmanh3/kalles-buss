import { PubSubClient, Logger } from '@kalles-buss/shared-utils';
import { BankGateway } from './bank-gateway';
import { TelematicsAdapter } from './telematics-adapter';
import { WeatherAdapter } from './weather-adapter';
import { NeTExAdapter } from './netex-adapter';
import { PayrollAdapter } from './payroll-adapter';
import express from 'express';

async function start() {
  Logger.info('--- KALLES BUSS: ADAPTERS (ACL) STARTING ---');
  
  const pubsub = new PubSubClient();
  const bankGateway = new BankGateway(pubsub);
  const telematicsAdapter = new TelematicsAdapter(pubsub);
  const weatherAdapter = new WeatherAdapter(pubsub);
  const netexAdapter = new NeTExAdapter(pubsub);
  
  const payrollAdapter = new PayrollAdapter(pubsub);
  payrollAdapter.start();

  // Expose HTTP endpoints for webhooks/simulation
  const app = express();
  app.use(express.json());
  const port = process.env.PORT || 8080;

  app.get('/', (req, res) => res.json({ status: 'UP', service: 'kalles-adapters', message: 'Adapters (ACL) is live! 🔌', revision: process.env.K_REVISION || 'local' }));

  app.get('/api/adapters/status', (req, res) => {
    res.json({
      telematicsMode: telematicsAdapter.currentMode,
      netexArchives: netexAdapter.listArchives()
    });
  });

  app.post('/api/adapters/telematics/live', (req, res) => {
    const { enable } = req.body;
    Logger.info(`Manual trigger: Switching Telematics to Live Mode = ${enable}`);
    try {
      telematicsAdapter.stopPolling();
      telematicsAdapter.startPolling(enable);
      res.json({ status: 'SUCCESS', liveMode: enable });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- NETEX MANAGEMENT ENDPOINTS ---

  app.post('/api/adapters/netex/download', async (req, res) => {
    const { operatorId } = req.body;
    Logger.info(`Manual trigger: Download NeTEx archive for ${operatorId || 'sl'}`);
    try {
      const result = await netexAdapter.downloadArchive(operatorId || 'sl');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/adapters/netex/parse', async (req, res) => {
    const { filename, lines } = req.body;
    Logger.info(`Manual trigger: Parse NeTEx archive ${filename}`);
    try {
      const result = await netexAdapter.parseArchive(filename, lines || ['676']);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/adapters/netex/archives/:filename', (req, res) => {
    const { filename } = req.params;
    Logger.info(`Manual trigger: Delete NeTEx archive ${filename}`);
    try {
      const result = netexAdapter.deleteArchive(filename);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Simulator: Trigger incoming Bankgirot batch
  app.post('/simulate/bankgiro', async (req, res) => {
    Logger.info('Simulating incoming Bankgirot batch');
    try {
      const { payments } = req.body;
      await bankGateway.processIncomingPayments(payments);
      res.json({ message: 'Payments translated to events and published.' });
    } catch (err: any) {
      Logger.error(`Bankgirot Simulation Error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => Logger.info(`[Adapters] API & Simulator listening on port ${port}`));
}

start().catch(console.error);
