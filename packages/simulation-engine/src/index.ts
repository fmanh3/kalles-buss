import express from 'express';
import cors from 'cors';
import { Logger, PubSubClient, tracingMiddleware } from '@kalles-buss/shared-utils';
import { KodaBacktester } from './engines/koda-backtester';
import { EventReplayer } from './engines/replayer';
import { ScenarioOrchestrator } from './engines/scenario-orchestrator';
import { TelemetryStreamer } from './engines/telemetry-streamer';
import { ChaosMonkey } from './npc/chaos-monkey';
import { CounterpartMocks } from './npc/counterpart-mocks';
import knex from 'knex';
import config from '../knexfile';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function start() {
  Logger.info('--- KALLES BUSS: THE WORLD ENGINE (SIMULATOR) STARTING ---');

  const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
  const db = knex(dbConfig!);

  try {
    Logger.info('Running database migrations...');
    await db.migrate.latest();
    Logger.info('Database migrations complete.');
  } catch (err) {
    Logger.error('Migration failed:', err);
    process.exit(1);
  }

  // Auto-seed Initial Assets and Scenario if empty
  const assetCount = await db('data_assets').count('id as cnt').first();
  if (Number(assetCount?.cnt) === 0) {
     Logger.info('[WorldEngine] Seeding initial Data Assets, Scenarios, and Folders to DB...');
     
     // 1. Seed Folders
     const schedulesFolderId = `fld-schedules`;
     const syntheticFolderId = `fld-synthetic`;
     const benchmarkFolderId = `fld-benchmarks`;

     // Only insert if table exists and is empty
     const folderCount = await db('folders').count('id as c').first().catch(() => ({ c: 1 }));
     if (Number(folderCount?.c) === 0) {
        await db('folders').insert([
          { id: schedulesFolderId, name: 'Schedules', tree_type: 'ASSET', parent_id: null },
          { id: syntheticFolderId, name: 'Synthetic', tree_type: 'ASSET', parent_id: schedulesFolderId },
          { id: benchmarkFolderId, name: 'Benchmarks', tree_type: 'SCENARIO', parent_id: null }
        ]);
     }

     // 2. Seed Assets & Scenarios
     await db('data_assets').insert([
       { id: 'asset-netex-latest', name: 'Trafiklab Latest', type: 'NETEX_ZIP', folder_id: schedulesFolderId, config: { filename: 'latest' } },
       { id: 'asset-synthetic-676', name: 'High-Freq 676', type: 'SYNTHETIC_PROFILE', folder_id: syntheticFolderId, config: { lines: ['676'] } }
     ]);
     await db('scenarios').insert({
       id: 'scenario-genesis',
       name: 'The Genesis',
       folder_id: benchmarkFolderId,
       description: 'Initial setup with Garages, Blocks, and qualified roster.',
       created_by: 'Platform Engineering',
       timetable_asset_id: 'asset-synthetic-676',
       initial_state: {
          finance: { startingCashSek: 500000 },
          hr: { roster: [] },
          fleet: []
       },
       stimuli: { weatherDate: '2026-05-01' }
     });
  }

  const app = express();
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());
  app.use(tracingMiddleware);

  // Debug middleware to log all incoming requests to the engine
  app.use((req, res, next) => {
    Logger.info(`[WorldEngine] Incoming ${req.method} ${req.url}`);
    next();
  });

  const pubsub = new PubSubClient();
  const koda = new KodaBacktester();
  const replayer = new EventReplayer(pubsub);
  const orchestrator = new ScenarioOrchestrator();
  const telemetryStreamer = new TelemetryStreamer(pubsub);
  telemetryStreamer.startListening();
  
  const counterpartMocks = new CounterpartMocks();
  const hrApiUrl = process.env.HR_API_URL || 'https://kalles-hr-625737625145.europe-west1.run.app';
  const chaosMonkey = new ChaosMonkey(pubsub, hrApiUrl);

  const port = process.env.PORT || 8080;

  app.get('/', (req, res) => res.json({ status: 'UP', service: 'kalles-simulation-engine', message: 'World Engine is active! 🌍', revision: process.env.K_REVISION || 'local' }));

  // =========================================================================
  // IDE TREE API (Folders, Assets, Scenarios)
  // =========================================================================

  app.get('/world/tree', async (req, res) => {
    try {
      const folders = await db('folders').select('*');
      const assets = await db('data_assets').select('*');
      
      const scenarios = await db('scenarios')
        .leftJoin('data_assets', 'scenarios.timetable_asset_id', 'data_assets.id')
        .select(
          'scenarios.id', 
          'scenarios.name', 
          'scenarios.description', 
          'scenarios.created_by as createdBy',
          'scenarios.folder_id as folderId',
          'scenarios.initial_state',
          'scenarios.timetable_asset_id as timetableAssetId',
          'data_assets.id as assetId',
          'data_assets.type as assetType', 
          'data_assets.config as assetConfig'
        );

      const formattedScenarios = scenarios.map(s => ({
        id: s.id,
        folderId: s.folderId,
        metadata: { name: s.name, description: s.description, createdBy: s.createdBy },
        assetInfo: s.assetId ? { id: s.assetId, type: s.assetType, config: s.assetConfig } : null,
        initialState: s.initial_state,
        timetableAssetId: s.timetableAssetId
      }));

      // Failsafe for frontend so parent_id is always strictly returned
      res.json({
        folders: folders.map(f => ({ ...f, parent_id: f.parent_id || null })),
        assets: assets.map(a => ({ ...a, folder_id: a.folder_id || null })),
        scenarios: formattedScenarios.map(s => ({ ...s, folderId: s.folderId || null }))
      });
    } catch (err: any) {
      Logger.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/world/folders', async (req, res) => {
    try {
      const { name, parent_id, tree_type } = req.body;
      const id = `fld-${Date.now()}`;
      await db('folders').insert({ id, name, parent_id, tree_type });
      res.json({ status: 'SUCCESS', id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/world/folders/:id/rename', async (req, res) => {
    try {
      await db('folders').where({ id: req.params.id }).update({ name: req.body.name });
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/world/folders/:id/move', async (req, res) => {
    try {
      const { parent_id } = req.body;
      await db('folders').where({ id: req.params.id }).update({ parent_id: parent_id || null });
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/world/folders/:id', async (req, res) => {
    try {
      // Check if folder has children (folders or items)
      const childFolders = await db('folders').where({ parent_id: req.params.id }).count('id as c').first();
      const childScenarios = await db('scenarios').where({ folder_id: req.params.id }).count('id as c').first();
      const childAssets = await db('data_assets').where({ folder_id: req.params.id }).count('id as c').first();

      if (Number(childFolders?.c) > 0 || Number(childScenarios?.c) > 0 || Number(childAssets?.c) > 0) {
        return res.status(400).json({ error: 'Folder is not empty. Cannot delete.' });
      }

      await db('folders').where({ id: req.params.id }).del();
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/world/scenarios', async (req, res) => {
    try {
      const { name, folder_id } = req.body;
      const id = `scenario-${Date.now()}`;
      await db('scenarios').insert({
        id,
        name: name || 'New Scenario',
        folder_id: folder_id || null,
        description: 'No description provided.',
        created_by: 'World Engine IDE',
        initial_state: { finance: { startingCashSek: 100000 }, hr: { roster: [] }, fleet: [] },
        stimuli: {}
      });
      res.json({ status: 'SUCCESS', id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/world/scenarios/:id/rename', async (req, res) => {
    try {
      await db('scenarios').where({ id: req.params.id }).update({ name: req.body.name });
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/world/scenarios/:id/move', async (req, res) => {
    try {
      const { folder_id } = req.body;
      await db('scenarios').where({ id: req.params.id }).update({ folder_id: folder_id || null });
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/world/scenarios/:id/config', async (req, res) => {
    try {
      const { timetable_asset_id, initial_state } = req.body;
      await db('scenarios').where({ id: req.params.id }).update({
         timetable_asset_id: timetable_asset_id || null,
         initial_state: initial_state || {}
      });
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/world/scenarios/:id', async (req, res) => {
    try {
      await db('scenarios').where({ id: req.params.id }).del();
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/world/assets', async (req, res) => {
    try {
      const { name, folder_id, type } = req.body;
      const id = `asset-${type.toLowerCase().replace('_', '-')}-${Date.now()}`;
      
      let defaultConfig = {};
      if (type === 'ROSTER_PROFILE') {
         defaultConfig = { explicit_staff: [], generators: [{ role: 'DRIVER', count: 5, base_salary_sek: 28000 }] };
      } else if (type === 'FLEET_PROFILE') {
         defaultConfig = { explicit_vehicles: [], generators: [{ type: 'ELECTRIC_12M', count: 3, battery_kwh: 350 }] };
      } else if (type === 'FINANCE_PROFILE') {
         defaultConfig = { startingCashSek: 1000000, creditLimit: 500000 };
      } else if (type === 'KODA_TAPE') {
         defaultConfig = { targetDate: new Date().toISOString().split('T')[0], targetLineId: '676', tapeName: null };
      } else {
         defaultConfig = { config: 'default' };
      }

      await db('data_assets').insert({
        id,
        name: name || `New ${type}`,
        folder_id: folder_id || null,
        type: type,
        config: defaultConfig
      });
      res.json({ status: 'SUCCESS', id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/world/assets/:id/config', async (req, res) => {
    try {
      await db('data_assets').where({ id: req.params.id }).update({ config: req.body.config });
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/world/assets/:id/rename', async (req, res) => {
    try {
      await db('data_assets').where({ id: req.params.id }).update({ name: req.body.name });
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/world/assets/:id/move', async (req, res) => {
    try {
      const { folder_id } = req.body;
      await db('data_assets').where({ id: req.params.id }).update({ folder_id: folder_id || null });
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/world/assets/:id', async (req, res) => {
    try {
      await db('data_assets').where({ id: req.params.id }).del();
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // EXECUTION API
  // =========================================================================

  app.get('/world/stream', (req, res) => {
    telemetryStreamer.addClient(req, res);
  });

  /**
   * Trigger a hard reset of all operational data across all domains.
   */
  app.post('/world/sandbox/reset', async (req, res) => {
    try {
      await orchestrator.hardReset();
      res.json({ status: 'SUCCESS', message: 'All domains purged.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Trigger a Scenario Setup (World Reset + Seeding)
   */
  app.post('/world/scenarios/:id/start', async (req, res) => {
    try {
      const scenarioId = req.params.id;
      const scenarioRow = await db('scenarios')
        .leftJoin('data_assets', 'scenarios.timetable_asset_id', 'data_assets.id')
        .select('scenarios.*', 'data_assets.type as assetType', 'data_assets.config as assetConfig')
        .where('scenarios.id', scenarioId).first();

      if (!scenarioRow) return res.status(404).json({ error: 'Scenario not found in DB' });

      // Lookup KODA tape if defined
      let kodaTapeName = null;
      let kodaTargetDate = null;
      let kodaTargetLineId = null;
      if (scenarioRow.initial_state?.koda_asset_id) {
         const kodaAsset = await db('data_assets').where({ id: scenarioRow.initial_state.koda_asset_id }).first();
         if (kodaAsset && kodaAsset.config) {
            kodaTapeName = kodaAsset.config.tapeName || `tape_${kodaAsset.config.targetLineId}_${kodaAsset.config.targetDate}.json`;
            kodaTargetDate = kodaAsset.config.targetDate;
            kodaTargetLineId = kodaAsset.config.targetLineId;
         }
      }

      // Transform DB row back to the legacy schema expected by Orchestrator
      const mappedScenario = {
        metadata: { name: scenarioRow.name },
        initialState: scenarioRow.initial_state,
        stimuli: scenarioRow.stimuli,
        assetInfo: scenarioRow.assetType ? { type: scenarioRow.assetType, config: scenarioRow.assetConfig } : null,
        kodaTapeName,
        kodaTargetDate,
        kodaTargetLineId
      };

      const result = await orchestrator.setupScenario(mappedScenario as any);
      res.json(result);
    } catch (err: any) {
      Logger.error(`Scenario Start failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Endpoint to retrieve the complete World State for the QA Mission Control Dashboard
   */
  app.get('/world/state', (req, res) => {
    res.json({
      npcs: chaosMonkey.getNPCs(),
      counterparts: counterpartMocks.getState(),
      environment: {
        currentWeatherRisk: 'LOW', // Future: Hook to WeatherAdapter mock
        activeTapes: [] // Future: Track currently replaying tapes
      }
    });
  });

  app.post('/world/counterpart/bankgiro/received', async (req, res) => {
    try {
      await counterpartMocks.receiveBankgiroFile(req.body);
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      Logger.error(`[WorldEngine] Error processing incoming Bankgirot file: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/world/counterpart/skatteverket/received', async (req, res) => {
    try {
      await counterpartMocks.receiveSkatteverketAgi(req.body);
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      Logger.error(`[WorldEngine] Error processing incoming Skatteverket AGI: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/world/counterpart/fora/received', async (req, res) => {
    try {
      await counterpartMocks.receiveForaReport(req.body);
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      Logger.error(`[WorldEngine] Error processing incoming FORA report: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Time Machine Endpoint: Download historical GTFS-RT from Trafiklab KoDa
   */
  app.post('/world/koda-download', async (req, res) => {
    const { targetDate, targetLineId } = req.body;
    try {
      const result = await koda.buildTapeFromHistory(targetDate, targetLineId);
      res.json(result);
    } catch (err: any) {
      Logger.error(`KoDa Download failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Endpoint to list all downloaded Golden Tapes
   */
  app.get('/world/tapes', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const tapeDir = path.join(__dirname, '../../src/tapes');
    
    if (!fs.existsSync(tapeDir)) {
      return res.json({ tapes: [] });
    }
    
    const files = fs.readdirSync(tapeDir)
                    .filter((f: string) => f.endsWith('.json'))
                    .map((f: string) => {
                      const stats = fs.statSync(path.join(tapeDir, f));
                      return { name: f, sizeMb: (stats.size / (1024*1024)).toFixed(2) };
                    });
                    
    res.json({ tapes: files });
  });

  /**
   * Endpoint to replay a Golden Tape
   */
  app.post('/world/replay', async (req, res) => {
    const { tapeName } = req.body;
    try {
      // Replay is async and long-running
      replayer.replay(`./src/tapes/${tapeName}`);
      res.json({ status: 'REPLAY_STARTED', tapeName });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Endpoint to unleash the Chaos Monkey
   */
  app.post('/world/chaos/inject', async (req, res) => {
    try {
      const { topic, event } = req.body;
      await pubsub.publish(topic, event);
      res.json({ status: 'SUCCESS', message: 'Chaos injected' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/world/chaos/start', (req, res) => {
    const { intervalMs } = req.body;
    chaosMonkey.start(intervalMs);
    res.json({ status: 'CHAOS_MONKEY_UNLEASHED' });
  });

  app.listen(port, () => Logger.info(`[WorldEngine] Simulator Control API listening on port ${port}`));
}

start().catch(console.error);
