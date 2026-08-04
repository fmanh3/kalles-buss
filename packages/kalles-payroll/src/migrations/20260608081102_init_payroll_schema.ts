import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Employee Disbursement Info (Zero-Knowledge: No names, just IDs and bank details)
  await knex.schema.createTable('payroll_employees', (table) => {
    table.uuid('id').primary(); // Same ID as in HR
    table.text('bank_account_encrypted'); // IBAN/Clearing+Account
    table.string('tax_table', 10).defaultTo('30'); 
    table.string('tax_column', 2).defaultTo('1');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 2. Payroll Runs (Aggregated monthly execution)
  await knex.schema.createTable('payroll_runs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.integer('period_year').notNullable();
    table.integer('period_month').notNullable();
    table.string('status', 30).notNullable().defaultTo('DRAFT'); // DRAFT, CALCULATED, CFO_APPROVED, PAID
    
    table.decimal('total_gross', 15, 2).defaultTo(0);
    table.decimal('total_net', 15, 2).defaultTo(0);
    table.decimal('total_tax', 15, 2).defaultTo(0);
    table.decimal('total_employer_contributions', 15, 2).defaultTo(0);
    
    table.string('payment_reference').nullable(); // Link to Bank Adapter transaction
    table.timestamp('paid_at').nullable();
    table.timestamps(true, true);
    table.unique(['period_year', 'period_month']);
  });

  // 3. Individual Payroll Records (Line items per employee per run)
  await knex.schema.createTable('payroll_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('run_id').notNullable().references('id').inTable('payroll_runs').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('payroll_employees');
    
    table.decimal('gross_amount', 15, 2).notNullable();
    table.decimal('net_amount', 15, 2).notNullable();
    table.decimal('tax_amount', 15, 2).notNullable();
    table.decimal('employer_contributions', 15, 2).notNullable();
    
    table.jsonb('calculation_details'); // Meta-data about OB, overtime etc (anonymized)
    table.timestamps(true, true);
    table.unique(['run_id', 'employee_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_records');
  await knex.schema.dropTableIfExists('payroll_runs');
  await knex.schema.dropTableIfExists('payroll_employees');
}
