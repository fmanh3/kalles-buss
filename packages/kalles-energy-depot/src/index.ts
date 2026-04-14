import express from 'express';
import Knex from 'knex';
import config from '../knexfile.cjs';
import { PubSub } from '@google-cloud/pubsub';
import { ChargerAgent } from './domain/charging/charger-agent.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function start() {
  const db = Knex(config.development!);
  const chargerAgent = new ChargerAgent(db);
  const pubsub = new PubSub({ projectId: process.env.GOOGLE_CLOUD_PROJECT || 'joakim-hansson-lab' });

  const app = express();
  app.use(express.json());
  const port = process.env.PORT || 8080;

  app.get('/', (req, res) => res.send('Kalles Energy Depot Domain is live! 🔋'));
  
  // Endpoint för att se aktuella laddningssessioner
  app.get('/sessions', async (req, res) => {
    const sessions = await db('charging_sessions').orderBy('start_time', 'desc').limit(10);
    res.json(sessions);
  });

  app.listen(port, () => console.log(`[Energy-Depot] API listening on port ${port}`));

  // Prenumerera på optimeringsorder från CFO (Milstolpe 9)
  const topicName = 'energy-optimization';
  const subscriptionName = 'depot-optimization-sub';
  const topic = pubsub.topic(topicName);
  const [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });

  console.log(`[Energy-Depot] Lyssnar på ${topicName}...`);

  subscription.on('message', async (message) => {
    try {
      const strategy = JSON.parse(message.data.toString());
      await chargerAgent.applyOptimizationStrategy(strategy);
      message.ack();
    } catch (err) {
      console.error('[Energy-Depot] Fel vid hantering av optimeringsorder:', err);
    }
  });
}

start().catch(console.error);
