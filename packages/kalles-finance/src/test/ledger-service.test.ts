import { describe, it, expect, beforeEach } from 'vitest';
import knex, { Knex } from 'knex';
import { LedgerService } from '../domain/ledger/ledger-service';

describe('LedgerService', () => {
  let db: Knex;
  let service: LedgerService;

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true
    });

    // Run migrations on the in-memory db
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

    service = new LedgerService(db);
  });

  it('should prevent unbalanced transactions', async () => {
    const request: any = {
      description: 'Test',
      source_type: 'MANUAL',
      entries: [
        { account_code: '1930', debit: 100, credit: 0 },
        { account_code: '3000', debit: 0, credit: 99 } // Unbalanced!
      ]
    };

    await expect(service.recordTransaction(request)).rejects.toThrow('Unbalanced Transaction');
  });

  it('should record a balanced transaction via recordTransactionWithTrx', async () => {
    // Setup accounts
    await service.createAccount({
      code: '1930', name: 'Bank', type: 'ASSET', balance_side: 'DEBIT', is_active: true
    });
    await service.createAccount({
      code: '3000', name: 'Revenue', type: 'REVENUE', balance_side: 'CREDIT', is_active: true
    });

    const request: any = {
      description: 'Customer Payment',
      source_type: 'INVOICE',
      entries: [
        { account_code: '1930', debit: 100, credit: 0 },
        { account_code: '3000', debit: 0, credit: 100 }
      ]
    };

    await db.transaction(async (trx) => {
      const txId = await service.recordTransactionWithTrx(trx, request);
      expect(txId).toBeDefined();
    });

    const trialBalance = await service.getTrialBalance();
    expect(trialBalance).toHaveLength(2);
    
    // Verify transaction exists
    const tx = await db('ledger_transactions').first();
    expect(tx.description).toBe('Customer Payment');
  });
});
