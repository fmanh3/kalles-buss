import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Expand ledger_entries with project_code dimension
  await knex.schema.alterTable('ledger_entries', (table) => {
    table.string('project_code').nullable();
  });

  // 2. Audit Trail for CFO Posting Rules (Immutability log)
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('entity_type').notNullable(); // e.g. "POSTING_RULE", "LEDGER_ENTRY"
    table.string('entity_id').notNullable();
    table.string('action').notNullable(); // e.g. "ILLEGAL_MODIFICATION_ATTEMPT", "UPDATE_RULE"
    table.jsonb('old_value').nullable();
    table.jsonb('new_value').nullable();
    table.uuid('agent_id').nullable();
    table.timestamps(true, true);
  });

  // 3. Loans and Liabilities (Lån och Skulder)
  await knex.schema.createTable('liabilities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('liability_id').notNullable().unique(); // e.g., LOAN-1
    table.enum('type', ['BANK_LOAN', 'LEASE', 'BOND']).notNullable();
    table.decimal('principal_amount', 15, 2).notNullable();
    table.decimal('remaining_balance', 15, 2).notNullable();
    table.string('interest_rate_expr').notNullable(); // e.g., "STIBOR 3M + 1.5%"
    table.decimal('monthly_amortization', 15, 2).defaultTo(0);
    table.date('maturity_date').notNullable();
    table.string('account_code', 4).notNullable(); // e.g., 2350
    table.timestamps(true, true);
  });

  // 4. Accounts Receivable (Invoices issued BY Kalles Buss to SL/Clients)
  // We rename the old basic 'invoices' table or we just use it. It already exists.
  // We'll alter the existing 'invoices' table to add more robust matching fields.
  await knex.schema.alterTable('invoices', (table) => {
    table.string('ocr_number').nullable().unique();
    table.decimal('amount_paid', 15, 2).defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('invoices', (table) => {
    table.dropColumn('ocr_number');
    table.dropColumn('amount_paid');
  });

  await knex.schema.dropTableIfExists('liabilities');
  await knex.schema.dropTableIfExists('audit_logs');

  await knex.schema.alterTable('ledger_entries', (table) => {
    table.dropColumn('project_code');
  });
}
