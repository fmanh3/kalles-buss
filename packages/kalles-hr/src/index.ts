import { PubSubClient } from '../../kalles-traffic/src/infrastructure/messaging/pubsub-client';
import express from 'express';
import Knex from 'knex';
import config from '../knexfile';
import { ShiftAssignmentRequestedSchema, type ShiftAssignmentRequested } from './domain/events/shift-events';
import { DailyRestPolicy } from './domain/policies/daily-rest-policy';

async function start() {
  const db = Knex(config.development!);
  const pubsub = new PubSubClient();

  // Auto-seed DRIVER-007 for stable testing
  try {
    await db('drivers').insert({ id: 'DRIVER-007', name: 'Kalle Karlsson', hourly_rate: 185.00 }).onConflict('id').ignore();
    const today = new Date(); today.setHours(8, 0, 0, 0);
    const endToday = new Date(today); endToday.setHours(16, 0, 0, 0);
    await db('shifts').insert({
      driver_id: 'DRIVER-007',
      planned_start_time: today.toISOString(),
      planned_end_time: endToday.toISOString(),
      pickup_location: 'Norrtälje RC',
      line_id: '676',
      status: 'SCHEDULED'
    }).onConflict(['driver_id', 'planned_start_time']).ignore();
    console.log('[HR] Test driver DRIVER-007 seeded.');
  } catch (e) {
    console.warn('[HR] Auto-seed failed:', e);
  }

  // Start a minimal heartbeat server for Cloud Run health checks
  const app = express();
  app.use(express.json());
  const port = process.env.PORT || 8080;

  app.get('/', (req, res) => res.send('Kalles HR Domain is live! 👥'));

  // Hämta förarens schema (kalendervy)
  app.get('/drivers/:id/schedule', async (req, res) => {
    try {
      const { id } = req.params;
      const shifts = await db('shifts')
        .where({ driver_id: id })
        .orderBy('planned_start_time', 'asc');
      res.json({ driverId: id, shifts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Hämta/Skapa ledighetsansökningar
  app.get('/drivers/:id/leave-requests', async (req, res) => {
    try {
      const requests = await db('leave_requests').where({ driver_id: req.params.id });
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/drivers/:id/leave-requests', async (req, res) => {
    try {
      const { startDate, endDate, type, comment } = req.body;
      const [newRequest] = await db('leave_requests').insert({
        driver_id: req.params.id,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        leave_type: type,
        comment
      }).returning('*');
      res.status(201).json(newRequest);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Simulator: Sjukanmälan (Yttre Ringen)
  app.post('/simulate/sick-leave', async (req, res) => {
    try {
      const { driverId } = req.body;
      console.log(`[HR Simulator] Sjukanmälan mottagen för ${driverId}`);
      
      // Markera aktiva pass som SICK
      await db('shifts')
        .where({ driver_id: driverId, status: 'SCHEDULED' })
        .update({ status: 'SICK', updated_at: new Date() });

      res.json({ message: `Sjukanmälan registrerad för ${driverId}. Pass har avbokats.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => console.log(`[HR] API & Heartbeat listening on port ${port}`));

  const HR_TOPIC = 'hr-events';
  const SUB_NAME = 'hr-guardrails-sub';

  console.log('--- KALLES HR: GUARDRAILS & POLICIES ---');

  await pubsub.subscribe(HR_TOPIC, SUB_NAME, async (event: ShiftAssignmentRequested) => {
    try {
      // Validera inkommande event
      const parsedEvent = ShiftAssignmentRequestedSchema.parse(event);
      console.log(`\n[HR Guardrail] Tar emot begäran om pass-tilldelning för ${parsedEvent.driverId}...`);

      // Hämta förarens senaste avslutade pass från riktiga databasen
      const lastShift = await db('shifts')
        .where({ driver_id: parsedEvent.driverId, status: 'COMPLETED' })
        .orderBy('planned_end_time', 'desc')
        .first();

      if (!lastShift) {
         console.log(`[HR Guardrail] Ingen historik hittad i databasen för ${parsedEvent.driverId}. Tilldelning godkänd.`);
         return;
      }

      // Kör vår Policy (Guardrail)
      console.log(`[HR Guardrail] Utvärderar DailyRestPolicy (Min 11h vila). Förare slutade senast: ${new Date(lastShift.planned_end_time).toLocaleString()}`);
      
      const lastEndTime = new Date(lastShift.planned_end_time);
      const proposedStartTime = new Date(parsedEvent.proposedStartTime);
      
      try {
          DailyRestPolicy.evaluate(lastEndTime, proposedStartTime);
          console.log(`[HR Guardrail] ✅ Policy uppfylld. Godkänner tilldelning.`);
          
          // Spara det nya passet som SCHEDULED i databasen
          await db('shifts').insert({
            driver_id: parsedEvent.driverId,
            planned_start_time: proposedStartTime,
            planned_end_time: new Date(proposedStartTime.getTime() + 8 * 60 * 60 * 1000), // Standard 8h pass
            status: 'SCHEDULED'
          });

      } catch (policyError: any) {
          console.error(`[HR Guardrail] ❌ Policy Violation Blocked! ${policyError.message}`);
      }

    } catch (err) {
      console.error('[HR] Fel vid validering/hantering av HR-händelse:', err);
    }
  });
}

start().catch(console.error);
