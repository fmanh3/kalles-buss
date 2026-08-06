import { PubSubClient, tracingMiddleware, Logger } from '@kalles-buss/shared-utils';
import express from 'express';
import knex from 'knex';
import config from '../knexfile';
import { v4 as uuidv4 } from 'uuid';

async function start() {
  const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
  const db = knex(dbConfig!);
  const pubsub = new PubSubClient();

  const app = express();
  app.use(express.json());
  app.use(tracingMiddleware);
  
  const port = process.env.PORT || 8083;

  app.get('/', (req, res) => res.json({ status: 'UP', service: 'kalles-payroll', message: 'Disbursement Engine is live! 💸' }));

  // --- PAYROLL EXECUTION ---

  app.get('/api/payroll/runs', async (req, res) => {
    try {
      const runs = await db('payroll_runs').select('*').orderBy('period_year', 'desc').orderBy('period_month', 'desc');
      res.json(runs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/payroll/runs/:id/records', async (req, res) => {
    try {
      const records = await db('payroll_records').where({ run_id: req.params.id });
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Triggers a payment run for a specific period.
   * In a real system, this would be an automated process.
   */
  app.post('/api/payroll/runs/:id/execute', async (req, res) => {
    try {
      const run = await db('payroll_runs').where({ id: req.params.id }).first();
      if (!run) return res.status(404).json({ error: 'Run not found' });

      // Request approval from Finance (CFO Agent)
      await pubsub.publish('finance-events', {
        eventType: 'PayrollPaymentRequested',
        runId: run.id,
        period: `${run.period_year}-${run.period_month}`,
        totalAmount: run.total_net,
        totalTax: run.total_tax
      });

      await db('payroll_runs').where({ id: run.id }).update({ status: 'PENDING_CFO' });
      res.json({ message: 'Payment request sent to Finance' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => Logger.info(`[Payroll] Service listening on port ${port}`));

  // --- Pub/Sub Listeners ---

  // 0. Sync Employees from HR
  await pubsub.subscribe('hr-events', 'payroll-staff-sync-sub', async (event: any) => {
    try {
      if (event.eventType === 'StaffCreated') {
        Logger.info(`[Payroll] Syncing staff member from HR: ${event.staff.id}`);
        await db('payroll_employees').insert({
          id: event.staff.id,
          is_active: true
        }).onConflict('id').ignore();
      }
    } catch (err: any) {
      Logger.error(`[Payroll] Error syncing staff: ${err.message}`);
    }
  });

  // 1. Listen for HR Compensation results
  await pubsub.subscribe('hr-events', 'payroll-compensation-sub', async (event: any) => {
    try {
      if (event.eventType === 'CompensationApproved') {
        const { employee_id, period_year, period_month, gross_amount } = event.payload;
        
        Logger.info(`[Payroll] Processing approved compensation for employee ${employee_id}`);

        await db.transaction(async (trx) => {
          // Find or create the run
          let run = await trx('payroll_runs').where({ period_year, period_month }).first();
          if (!run) {
            [run] = await trx('payroll_runs').insert({
              period_year,
              period_month,
              status: 'DRAFT'
            }).returning('*');
          }

          // Simple Tax Calculation (Mock)
          const taxRate = 0.30;
          const taxAmount = gross_amount * taxRate;
          const netAmount = gross_amount - taxAmount;
          const empContributions = gross_amount * 0.3142; // Swedish standard

          await trx('payroll_records').insert({
            run_id: run.id,
            employee_id: employee_id,
            gross_amount,
            net_amount: netAmount,
            tax_amount: taxAmount,
            employer_contributions: empContributions
          }).onConflict(['run_id', 'employee_id']).merge();

          // Update Run totals
          const totals = await trx('payroll_records')
            .where({ run_id: run.id })
            .select(
              trx.raw('SUM(gross_amount) as gross'),
              trx.raw('SUM(net_amount) as net'),
              trx.raw('SUM(tax_amount) as tax'),
              trx.raw('SUM(employer_contributions) as cont')
            ).first();

          await trx('payroll_runs').where({ id: run.id }).update({
            total_gross: totals.gross,
            total_net: totals.net,
            total_tax: totals.tax,
            total_employer_contributions: totals.cont
          });
        });
      }
    } catch (err: any) {
      Logger.error(`[Payroll] Error processing compensation: ${err.message}`);
    }
  });

  // 2. Listen for CFO approval
  await pubsub.subscribe('finance-events', 'payroll-cfo-approval-sub', async (event: any) => {
    try {
      if (event.eventType === 'PayrollApprovedByCFO') {
        const { runId } = event;
        Logger.info(`[Payroll] Run ${runId} approved by CFO. Initiating bank transfer via Outer Ring.`);
        
        // Mock call to Bank Adapter
        await pubsub.publish('integration-events', {
          eventType: 'ExecuteBankPayment',
          source: 'PAYROLL',
          reference: runId,
          // In a real system, we'd fetch all individual bank accounts and amounts here
        });

        await db('payroll_runs').where({ id: runId }).update({ status: 'PAID', paid_at: new Date() });
      }
    } catch (err: any) {
      Logger.error(`[Payroll] Error processing CFO approval: ${err.message}`);
    }
  });
}

start().catch(console.error);
