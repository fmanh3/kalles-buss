import { PubSubClient, tracingMiddleware, Logger } from '@kalles-buss/shared-utils';
import { BillingEngine } from './domain/billing/billing-engine';
import { LiquidityService } from './domain/ledger/liquidity-service';
import { LedgerService } from './domain/ledger/ledger-service';
import { AccountsPayableService } from './domain/ledger/accounts-payable-service';
import { AccountsReceivableService } from './domain/ledger/accounts-receivable-service';
import { LiabilitiesAndDebtService } from './domain/ledger/liabilities-and-debt-service';
import { CfoAgent } from './domain/negotiator/cfo-agent';
import knex from 'knex';
import config from '../knexfile';
import express from 'express';

async function start() {
  const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
  const db = knex(dbConfig!);
  
  const ledgerService = new LedgerService(db);
  const billingEngine = new BillingEngine(db, ledgerService);
  const liquidityService = new LiquidityService(db);
  const apService = new AccountsPayableService(db, ledgerService);
  const arService = new AccountsReceivableService(db, ledgerService);
  const debtService = new LiabilitiesAndDebtService(db, ledgerService);
  const pubsub = new PubSubClient();

  await ledgerService.ensureBasAccounts();

  const app = express();
  app.use(express.json());
  app.use(tracingMiddleware);
  const port = process.env.PORT || 8080;

  app.get('/', (req, res) => res.json({ status: 'UP', service: 'kalles-finance', message: 'CFO Control Layer is live! 💰', revision: process.env.K_REVISION || 'local' }));

  // --- SANDBOX & TESTING ---
  app.post('/api/sandbox/reset', async (req, res) => {
    Logger.warn('[Finance] Sandbox Reset Triggered - PURGING DATA');
    try {
      await db('ledger_entries').del();
      await db('ledger_transactions').del();
      await db('accounts').del();
      await db('vendors').del();
      res.json({ message: 'Finance Domain Purged' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sandbox/seed', async (req, res) => {

    Logger.info('[Sandbox] Seeding Finance domain');
    const { startingCashSek } = req.body;

    try {
      await db.transaction(async (trx) => {
        // Clear tables correctly, but do NOT delete 'accounts' since they hold the BAS chart of accounts!
        await trx('ledger_entries').del();
        await trx('ledger_transactions').del();
        await trx('invoices').del();
        await trx('vendor_invoices').del();
        await trx('tour_passenger_stats').del();
        await trx('liabilities').del();
        await trx('accruals').del();

        // Ensure accounts exist (if they were somehow deleted)
        await ledgerService.ensureBasAccounts();

        // Inject initial cash into Bank (Account 1930)
        await ledgerService.recordTransactionWithTrx(trx, {
          description: 'Initial Scenario Funding',
          source_type: 'SCENARIO_SEED',
          entries: [
            { account_code: '1930', debit: startingCashSek, credit: 0 },
            { account_code: '2091', debit: 0, credit: startingCashSek } // Equity
          ]
        });
      });
      res.json({ status: 'SUCCESS', message: 'Finance state reset and funded' });
    } catch (err: any) {
      Logger.error(`[Sandbox] Seeding failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });
  
  app.get('/liquidity', async (req, res) => {
    try {
      const status = await liquidityService.getCurrentPosition();
      const forecast = await liquidityService.get30DayForecast();
      res.json({ status, forecast });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- CEO DASHBOARD API ---
  app.get('/api/ceo/status', async (req, res) => {
    try {
      const position = await liquidityService.getCurrentPosition();
      const overdueInvoices = await db('invoices').where('status', 'OVERDUE').count('id as cnt').first();
      
      let status = 'GREEN';
      if (overdueInvoices && Number(overdueInvoices.cnt) > 0) status = 'YELLOW';
      if (position.bankBalance < 50000) status = 'RED'; // Red if less than 50k SEK

      res.json({
        domain: 'FINANCE',
        status,
        metrics: {
          bankBalance: position.bankBalance,
          overdueInvoices: Number(overdueInvoices?.cnt || 0)
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/cfo/ap/invoice', async (req, res) => {
    try {
      const { vendorName, invoiceReference, amountTotal, amountVat, dueDate, category } = req.body;
      const result = await apService.recordVendorInvoice({ vendorName, invoiceReference, amountTotal, amountVat, dueDate: new Date(dueDate), category });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/cfo/ar/bankgirot-match', async (req, res) => {
    try {
      const { ocrNumber, amount } = req.body;
      const result = await arService.processBankgirotPayment(ocrNumber, amount);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/vendors', async (req, res) => {
    try {
      const vendors = await db('vendors').select('*');
      res.json(vendors);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/vendors', async (req, res) => {
    const { name, organizationNumber, bankgiro, contactEmail } = req.body;
    try {
      const [vendor] = await db('vendors').insert({
        name,
        organization_number: organizationNumber,
        bankgiro,
        contact_email: contactEmail
      }).returning('*');

      await pubsub.publish('finance-events', {
        eventType: 'VendorCreated',
        vendor: {
          id: vendor.id,
          name: vendor.name,
          isActive: vendor.is_active
        }
      });

      res.json(vendor);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => Logger.info(`[Finance] API listening on port ${port}`));

  // Pub/Sub Listeners
  await pubsub.subscribe('finance-events', 'finance-internal-sub', async (event: any) => {
    try {
      if (event.eventType === 'BankgirotPaymentReceived') {
        await arService.processBankgirotPayment(event.ocrNumber, event.amount);
      }
    } catch (err) {
      Logger.error('[Finance] Error processing finance event:', err);
    }
  });

  await pubsub.subscribe('traffic-events', 'finance-billing-sub', async (event: any) => {
    try {
      if (event.status === 'COMPLETED' && event.distanceKm) {
        const stats = await db('tour_passenger_stats').where({ tour_id: event.tourId }).first();
        await billingEngine.processTourCompletion(
          { tourId: event.tourId, line: event.lineId, distanceKm: event.distanceKm },
          { totalBoarding: stats ? stats.total_boarding : 0 }
        );
      }
    } catch (err) {
      Logger.error('[Finance] Error processing billing event:', err);
    }
  });

  await pubsub.subscribe('depot-events', 'finance-goods-receipt-sub', async (event: any) => {
    try {
      if (event.eventType === 'GoodsReceived') {
        Logger.info(`[Finance] Recording accrued liability for receipt ${event.receipt.reference}`);
        
        await db('accrued_liabilities').insert({
          vendor_id: event.receipt.vendorId,
          source_domain: 'DEPOT',
          source_reference_id: event.receipt.id,
          amount_estimated: event.receipt.quantity * event.receipt.unitCost,
          description: `Mottaget: ${event.receipt.sku} x ${event.receipt.quantity} (${event.receipt.reference})`
        }).onConflict(['source_domain', 'source_reference_id']).merge();
      }
    } catch (err) {
      Logger.error('[Finance] Error processing goods receipt:', err);
    }
  });

  // CFO Agent Procurement Negotiation
  await pubsub.subscribe('finance-events', 'finance-procurement-sub', async (event: any) => {
    try {
      if (event.eventType === 'ProcurementLiquidityQuery') {
        Logger.info(`[Finance] CFO Agent evaluating procurement for request ${event.requestId}`);
        // We'll let the cfoAgent class handle the logic, but we need the sub here or in the class.
        // The class already has a sub in its start() method, but it might be using the wrong topic/sub.
      }
    } catch (err) {
      Logger.error('[Finance] CFO Error:', err);
    }
  });

  // Payroll Integration
  await pubsub.subscribe('finance-events', 'finance-payroll-sub', async (event: any) => {
    try {
      if (event.eventType === 'PayrollPaymentRequested') {
        Logger.info(`[Finance] Received Payroll Payment Request for ${event.period}: ${event.totalAmount} SEK`);
        
        const totalNet = parseFloat(event.totalAmount);
        const totalTax = parseFloat(event.totalTax);

        // 1. Record the liability in the ledger
        await ledgerService.recordTransaction({
          description: `Payroll Accrual ${event.period}`,
          source_type: 'PAYROLL',
          entries: [
            { account_code: '7010', debit: totalNet + totalTax, credit: 0 }, // Personnel Costs
            { account_code: '2820', debit: 0, credit: totalNet },                // Net Salary Liability
            { account_code: '2710', debit: 0, credit: totalTax }                    // Tax Liability
          ]
        });

        // 2. Automated CFO Approval (Mock: Auto-approve if balance > 1.5x payroll)
        const balance = await liquidityService.getCurrentPosition();
        if (balance.bankBalance >= totalNet * 1.5) {
          Logger.warn(`[Finance] CFO AUTO-APPROVED Payroll for ${event.period}`);
          await pubsub.publish('finance-events', {
            eventType: 'PayrollApprovedByCFO',
            runId: event.runId
          });
        } else {
          Logger.error(`[Finance] CFO REJECTED Payroll for ${event.period}: Insufficient funds.`);
        }
      }
    } catch (err: any) {
      Logger.error(`[Finance] Error processing payroll request: ${err.message}`);
    }
  });
}

start().catch(console.error);
