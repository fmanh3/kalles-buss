import { 
  PubSubClient, 
  tracingMiddleware, 
  Logger, 
  PassengerLoadUpdateSchema, 
  CriticalFaultDetectedSchema,
  WeatherAlertSchema
} from '@kalles-buss/shared-utils';
import express from 'express';
import knex from 'knex';
import config from '../knexfile';
import { ResourceSolverService } from './domain/orchestrator/resource-solver-service';
import { EcoTrackerService } from './domain/orchestrator/eco-tracker-service';
import { ScheduleService } from './domain/orchestrator/schedule-service';
import { EnergyNegotiationListener } from './domain/orchestrator/energy-negotiation-listener';
import { TrackingService } from './domain/orchestrator/tracking-service';

async function start() {
  const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
  const db = knex(dbConfig!);
  const pubsub = new PubSubClient();

  const hrApiUrl = process.env.HR_API_URL || 'http://localhost:8081'; 
  const resourceSolver = new ResourceSolverService(db, hrApiUrl);
  const ecoTracker = new EcoTrackerService(db);
  const scheduleService = new ScheduleService(db, resourceSolver, pubsub);
  const energyNegotiationListener = new EnergyNegotiationListener(pubsub, scheduleService, resourceSolver, db);
  const trackingService = new TrackingService(db);

  const app = express();
  app.use(express.json());
  app.use(tracingMiddleware);

  const port = process.env.PORT || 8080;
  
  await energyNegotiationListener.startListening();

  app.get('/', (req, res) => res.json({ status: 'UP', service: 'kalles-traffic', message: 'Core Orchestrator is live! 🚌', revision: process.env.K_REVISION || 'local' }));

  // --- TACTICAL DASHBOARD API ---
  app.get('/api/tactical/live-map', (req, res) => {
    try {
      const liveData = trackingService.getLiveMapData();
      res.json(liveData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- SANDBOX / SIMULATION SEEDING ---
  app.post('/api/sandbox/seed', async (req, res) => {
    Logger.info('[Sandbox] Seeding Traffic domain');
    try {
      const { fleet } = req.body;
      if (fleet) {
         scheduleService.setFleetHeuristics(fleet);
      }

      await db('eco_driving_stats').del();
      await db('tours').del();
      await db('blocks').del();
      await db('journey_calls').del();
      await db('service_journeys').del();
      await db('scheduled_stop_points').del();
      await db('lines').del();
      res.json({ status: 'SUCCESS', message: 'Traffic plans and static network cleared' });
    } catch (err: any) {
      Logger.error(`[Sandbox] Seeding failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // --- CEO DASHBOARD API ---
  app.get('/api/ceo/status', async (req, res) => {
    try {
      // 1. Get Block Coverage
      const blocks = await db('blocks').select('*');
      const totalBlocks = blocks.length;
      const assignedBlocks = blocks.filter(b => b.assigned_vehicle_id !== null).length;
      const unassignedBlocks = totalBlocks - assignedBlocks;

      // 2. Fetch the detailed tours for the drill-down view
      for (const block of blocks) {
        block.tours = await db('tours').where({ block_id_new: block.id }).orderBy('sequence_in_block', 'asc');
      }

      // 3. Determine Status
      let status = 'GREEN';
      if (unassignedBlocks > 0) status = 'RED'; // Red if we have tours without buses

      // The "Fleet Deficit" is implicitly unassignedBlocks, meaning we need X more buses to fulfill the schedule.
      res.json({
        domain: 'TRAFFIC',
        status,
        metrics: {
          totalBlocks,
          assignedBlocks,
          unassignedBlocks,
          deficit: unassignedBlocks
        },
        drilldown: blocks
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- INTERNAL DOMAIN LISTENERS ---
  await pubsub.subscribe('traffic-events', 'traffic-scheduler-internal-sub', async (eventData: any) => {
    try {
      if (eventData.eventType === 'TimetableUpdated') {
        await scheduleService.processTimetableUpdate(eventData);
      }
    } catch (error) {
      Logger.error('[Traffic] Error processing timetable update:', error);
    }
  });

  await pubsub.subscribe('telematics-events', 'traffic-telematics-internal-sub', async (eventData: any) => {
    try {
      if (eventData.eventType === 'VehicleTelemetryUpdate') {
        // Call TrackingService to update the progress of the journey
        await trackingService.processTelemetry(eventData);
      }

      if (eventData.eventType === 'PassengerLoadUpdate') {
        const loadData = PassengerLoadUpdateSchema.parse(eventData);
        if (loadData.isLoadAlert) Logger.warn(`[Traffic] LOAD ALERT for ${loadData.vehicleId}`);
      }
      
      if (eventData.eventType === 'CriticalFaultDetected') {
        const faultData = CriticalFaultDetectedSchema.parse(eventData);
        if (faultData.severity === 'CRITICAL') {
           const tour = await db('tours').where({ assigned_vehicle_id: faultData.vehicleId, status: 'IN_PROGRESS' }).first();
           if (tour) await resourceSolver.handleSafetyCheckFail(tour.id, faultData.vehicleId);
        }
      }
    } catch (error) {
      Logger.error('[Traffic] Error processing telematics event:', error);
    }
  });

  await pubsub.subscribe('weather-events', 'traffic-weather-internal-sub', async (eventData: any) => {
    try {
      if (eventData.eventType === 'WeatherAlert') {
        const alert = WeatherAlertSchema.parse(eventData);
        if (alert.alertType === 'EXTREME_COLD') await resourceSolver.handleExtremeColdWeather();
      }
    } catch (error) {
      Logger.error('[Traffic] Error processing weather event:', error);
    }
  });

  // --- REST API ---
  app.post('/api/orchestrator/tours/:id/assign-driver', async (req, res) => {
    try {
      const { driverId, requiredVehicleType } = req.body;
      const result = await resourceSolver.assignDriverToTour(req.params.id, driverId, requiredVehicleType);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/orchestrator/tours/:id/finalize', async (req, res) => {
    try {
      const { energyConsumedKwh, regeneratedKwh } = req.body;
      const result = await ecoTracker.finalizeTourAndCalculateEcoScore(req.params.id, energyConsumedKwh, regeneratedKwh);
      await db('tours').where({ id: req.params.id }).update({ status: 'COMPLETED' });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => Logger.info(`[Traffic] API listening on port ${port}`));
}

start().catch(console.error);
