import { PubSubClient } from '@kalles-buss/shared-utils';
import { BillingEngine } from './domain/billing/billing-engine';
import { BankGateway } from './domain/gateways/bank-gateway';
import { LiquidityService } from './domain/ledger/liquidity-service';
import knex from 'knex';
import config = require('../knexfile');
import express from 'express';

async function start() {
  const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
  const db = knex(dbConfig!);
  const billingEngine = new BillingEngine(db);
  const bankGateway = new BankGateway(db);
  const liquidityService = new LiquidityService(db);
  const pubsub = new PubSubClient();

  // Start a minimal heartbeat server for Cloud Run health checks and CFO API
  const app = express();
  app.use(express.json());
  const port = process.env.PORT || 8080;

  app.get('/', (req, res) => res.send('Kalles Finance Domain is live! 💰'));
  
  // CFO Vy: Likviditetsstatus
  app.get('/liquidity', async (req, res) => {
    try {
      const status = await liquidityService.getCurrentPosition();
      const forecast = await liquidityService.get30DayForecast();
      res.json({ status, forecast });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Simulator: Trigga inbetalning från Bankgirot (Yttre Ringen)
  app.post('/simulate/bankgiro', async (req, res) => {
    try {
      const { payments } = req.body; // Array av { amount, reference, paymentDate }
      await bankGateway.processIncomingPayments(payments);
      res.json({ message: 'Betalningar processade.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => console.log(`[Finance] API & Heartbeat listening on port ${port}`));

  console.log('--- KALLES FINANCE: CORE BILLING & LEDGER ---');
  
  const TOPIC_NAME = 'traffic-events'; 
  const SUB_NAME = 'finance-billing-sub';
  const APC_TOPIC = 'apc-events';
  const APC_SUB_NAME = 'finance-apc-sub';

  // Prenumerera på avslutade turer
  await pubsub.subscribe(TOPIC_NAME, SUB_NAME, async (event: any) => {
    try {
      if (event.status === 'COMPLETED' && event.distanceKm) {
        // Hämta passagerarstatistik för turen (i en riktig app skulle vi aggregera detta)
        const stats = await db('tour_passenger_stats').where({ tour_id: event.tourId }).first();
        const boardingCount = stats ? stats.total_boarding : 0;

        await billingEngine.processTourCompletion(
          { tourId: event.tourId, line: event.lineId, distanceKm: event.distanceKm },
          { totalBoarding: boardingCount }
        );
      }
    } catch (err) {
      console.error('[Finance] Fel vid hantering av Billing-händelse:', err);
    }
  });

  // Prenumerera på APC-händelser för att bygga underlag (som tidigare)
  await pubsub.subscribe(APC_TOPIC, APC_SUB_NAME, async (event: any) => {
    try {
      if (event.boarding !== undefined) {
        await db('tour_passenger_stats')
          .insert({ tour_id: event.tourId, total_boarding: event.boarding, total_alighting: event.alighting })
          .onConflict('tour_id')
          .merge({
            total_boarding: db.raw('tour_passenger_stats.total_boarding + ?', [event.boarding]),
            total_alighting: db.raw('tour_passenger_stats.total_alighting + ?', [event.alighting])
          });
      }
    } catch (err) {
      console.error('[Finance] Fel vid uppdatering av APC-underlag:', err);
    }
  });
}

start().catch(console.error);
