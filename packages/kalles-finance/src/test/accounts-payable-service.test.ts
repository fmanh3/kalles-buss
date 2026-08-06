import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import knex, { Knex } from 'knex';
import { AccountsPayableService } from '../domain/ledger/accounts-payable-service';
import { LedgerService } from '../domain/ledger/ledger-service';

describe('AccountsPayableService', () => {
  let db: Knex;
  let ledgerService: LedgerService;
  let service: AccountsPayableService;

  beforeEach(async () => {
    // Set up rapid in-memory SQLite3 db for isolated unit and integration testing
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true
    });

    // Create minimal required tables for AP and Ledger
    await db.schema.createTable('vendor_invoices', (table) => {
      table.increments('id').primary();
      table.string('vendor_name');
      table.string('invoice_reference');
      table.decimal('amount_total');
      table.decimal('amount_vat');
      table.date('due_date');
      table.string('category');
      table.string('status');
    });

    await db.schema.createTable('accounts', (table) => {
      table.string('code').primary();
      table.string('name');
      table.string('type');
      table.string('balance_side');
      table.string('vat_code');
      table.boolean('is_active');
    });

    await db.schema.createTable('ledger_transactions', (table) => {
      table.uuid('id').primary();
      table.string('description');
      table.string('source_type');
      table.string('source_reference');
    });

    await db.schema.createTable('ledger_entries', (table) => {
      table.uuid('id').primary();
      table.uuid('transaction_id').references('id').inTable('ledger_transactions');
      table.string('account_code');
      table.decimal('debit');
      table.decimal('credit');
      table.string('cost_center');
      table.string('project_code');
    });

    ledgerService = new LedgerService(db);
    service = new AccountsPayableService(db, ledgerService);

    // Seed mandatory BAS accounts into our mock ledger
    await ledgerService.createAccount({
      code: '2440', name: 'Leverantörsskulder', type: 'LIABILITY', balance_side: 'CREDIT', is_active: true
    });
    await ledgerService.createAccount({
      code: '2641', name: 'Ingående moms', type: 'ASSET', balance_side: 'DEBIT', is_active: true
    });
    await ledgerService.createAccount({
      code: '4010', name: 'Inköp El / Energi', type: 'EXPENSE', balance_side: 'DEBIT', is_active: true
    });
    await ledgerService.createAccount({
      code: '4020', name: 'Inköp Reparation / Underhåll', type: 'EXPENSE', balance_side: 'DEBIT', is_active: true
    });
    await ledgerService.createAccount({
      code: '4000', name: 'Inköp Övrigt', type: 'EXPENSE', balance_side: 'DEBIT', is_active: true
    });
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('should successfully record a vendor invoice and book it in the general ledger (Double-Entry)', async () => {
    const dueDate = new Date('2026-05-15');
    const invoiceRequest = {
      vendorName: 'Vattenfall Eldistribution AB',
      invoiceReference: 'FACT-90998',
      amountTotal: 12500, // 10000 Excl VAT + 2500 VAT (25% Standard)
      amountVat: 2500,
      dueDate: dueDate,
      category: 'Operating Costs - Energy'
    };

    const result = await service.recordVendorInvoice(invoiceRequest);

    // 1. Verify response properties
    expect(result.invoiceId).toBeDefined();
    expect(result.analysis.category).toBe('Operating Costs - Energy');
    expect(result.analysis.vatRecorded).toBe(2500);

    // 2. Verify invoice was persisted in vendor_invoices table
    const dbInvoice = await db('vendor_invoices').where({ id: result.invoiceId }).first();
    expect(dbInvoice).toBeDefined();
    expect(dbInvoice.vendor_name).toBe('Vattenfall Eldistribution AB');
    expect(dbInvoice.invoice_reference).toBe('FACT-90998');
    expect(dbInvoice.status).toBe('PENDING');

    // 3. Verify double-entry ledger entries exist and balance perfectly (Debet = Kredit)
    const transaction = await db('ledger_transactions').where({ source_reference: result.invoiceId }).first();
    expect(transaction).toBeDefined();
    expect(transaction.description).toContain('Leverantörsfaktura FACT-90998');

    const entries = await db('ledger_entries').where({ transaction_id: transaction.id });
    expect(entries).toHaveLength(3);

    // Debit operating cost 4010 (10 000 SEK)
    const expenseEntry = entries.find(e => e.account_code === '4010');
    expect(expenseEntry).toBeDefined();
    expect(Number(expenseEntry.debit)).toBe(10000);
    expect(Number(expenseEntry.credit)).toBe(0);

    // Debit input VAT 2641 (2 500 SEK)
    const vatEntry = entries.find(e => e.account_code === '2641');
    expect(vatEntry).toBeDefined();
    expect(Number(vatEntry.debit)).toBe(2500);
    expect(Number(vatEntry.credit)).toBe(0);

    // Credit liabilities 2440 (12 500 SEK)
    const liabilityEntry = entries.find(e => e.account_code === '2440');
    expect(liabilityEntry).toBeDefined();
    expect(Number(liabilityEntry.debit)).toBe(0);
    expect(Number(liabilityEntry.credit)).toBe(12500);
  });

  it('should categorize expenses into account 4020 if category includes Maintenance', async () => {
    const invoiceRequest = {
      vendorName: 'Scania Verkstad Norrtälje',
      invoiceReference: 'MRO-5541',
      amountTotal: 5000,
      amountVat: 1000,
      dueDate: new Date('2026-05-20'),
      category: 'Fleet Maintenance - Parts'
    };

    const result = await service.recordVendorInvoice(invoiceRequest);

    const transaction = await db('ledger_transactions').where({ source_reference: result.invoiceId }).first();
    const expenseEntry = await db('ledger_entries')
      .where({ transaction_id: transaction.id, account_code: '4020' })
      .first();

    expect(expenseEntry).toBeDefined();
    expect(Number(expenseEntry.debit)).toBe(4000);
  });

  it('should propose paying the invoice exactly 2 days before the due date to optimize liquidity interest', async () => {
    const dueDate = new Date('2026-05-30');
    const invoiceRequest = {
      vendorName: 'Volvo Buses AB',
      invoiceReference: 'INV-1011',
      amountTotal: 250000,
      amountVat: 50000,
      dueDate: dueDate,
      category: 'Fleet Procurement'
    };

    const result = await service.recordVendorInvoice(invoiceRequest);

    // Pay date should be exactly May 28 (30 - 2)
    const expectedPayDate = new Date('2026-05-28');
    const proposedDate = new Date(result.analysis.paymentStrategy.scheduledDate);

    expect(result.analysis.paymentStrategy.action).toBe('SCHEDULED_PAYMENT');
    expect(proposedDate.getFullYear()).toBe(expectedPayDate.getFullYear());
    expect(proposedDate.getMonth()).toBe(expectedPayDate.getMonth());
    expect(proposedDate.getDate()).toBe(expectedPayDate.getDate());
    expect(result.analysis.paymentStrategy.reason).toBe('Optimize cash flow interest');
  });
});
