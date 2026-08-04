import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 0. Drop the old flat ledger_entries table from the initial foundation
  await knex.schema.dropTableIfExists('ledger_entries');

  // 1. Chart of Accounts (BAS-kontoplan)
  await knex.schema.createTable('accounts', (table) => {
    table.string('code', 4).primary(); // e.g., "1930"
    table.string('name').notNullable();
    table.enum('type', ['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'EQUITY']).notNullable();
    table.enum('balance_side', ['DEBIT', 'CREDIT']).notNullable();
    table.string('vat_code').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 2. Ledger Transactions (Grouping related entries)
  await knex.schema.createTable('ledger_transactions', (table) => {
    table.uuid('id').primary();
    table.timestamp('transaction_date').notNullable().defaultTo(knex.fn.now());
    table.string('description').notNullable();
    table.string('source_type').notNullable(); // e.g., "INVOICE", "PAYROLL", "MANUAL"
    table.string('source_reference').nullable(); // e.g., invoice_id
    table.uuid('created_by_agent').nullable();
    table.timestamps(true, true);
  });

  // 3. Ledger Entries (The actual double-entry rows)
  await knex.schema.createTable('ledger_entries', (table) => {
    table.uuid('id').primary();
    table.uuid('transaction_id').references('id').inTable('ledger_transactions').onDelete('CASCADE');
    table.string('account_code', 4).references('code').inTable('accounts');
    table.decimal('debit', 15, 2).defaultTo(0);
    table.decimal('credit', 15, 2).defaultTo(0);
    table.string('cost_center').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ledger_entries');
  await knex.schema.dropTableIfExists('ledger_transactions');
  await knex.schema.dropTableIfExists('accounts');
}
