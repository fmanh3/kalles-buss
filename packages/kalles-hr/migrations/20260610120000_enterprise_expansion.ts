import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // --- TRANSPARENCY & TAXONOMIES ---
  await knex.schema.alterTable('employees', (t) => {
    t.string('legal_gender', 10).nullable(); // 'MALE', 'FEMALE', 'NON_BINARY'
  });

  await knex.schema.createTable('job_levels', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.integer('level').notNullable().unique();
    t.string('description').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('job_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('job_code', 20).notNullable().unique();
    t.string('title').notNullable();
    t.text('description').nullable();
    t.uuid('job_level_id').notNullable().references('id').inTable('job_levels');
    t.decimal('salary_range_min', 12, 2).nullable();
    t.decimal('salary_range_max', 12, 2).nullable();
    t.string('currency', 3).defaultTo('SEK');
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('employees', (t) => {
    t.uuid('job_definition_id').nullable().references('id').inTable('job_definitions');
    t.string('zip_code', 10).nullable();
    t.string('municipality', 50).nullable();
    t.string('tax_table_override', 5).nullable();
  });

  await knex.schema.createTable('pay_types', (t) => {
    t.string('code', 10).primary();
    t.string('name').notNullable();
    t.string('category').notNullable();
    t.boolean('is_pensionable').defaultTo(true);
    t.boolean('is_taxable').defaultTo(true);
    t.timestamps(true, true);
  });

  // --- PROFESSIONAL GAPS (ICE, Balances, Expenses, Tax) ---
  
  await knex.schema.createTable('emergency_contacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('relationship').notNullable();
    t.string('phone_number').notNullable();
    t.boolean('is_primary').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('balance_ledger', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.string('balance_type', 30).notNullable(); 
    t.decimal('amount', 10, 2).notNullable();
    t.string('transaction_type', 30).notNullable(); 
    t.string('reference_id').nullable();
    t.text('notes').nullable();
    t.timestamp('occurred_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('tax_tables', (t) => {
    t.increments('id').primary();
    t.integer('year').notNullable();
    t.string('table_number', 5).notNullable(); 
    t.integer('column').notNullable().defaultTo(1);
    t.decimal('income_from', 15, 2).notNullable();
    t.decimal('income_to', 15, 2).notNullable();
    t.decimal('tax_amount', 15, 2).notNullable();
    t.unique(['year', 'table_number', 'column', 'income_from']);
  });

  await knex.schema.createTable('expense_claims', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('employee_id').notNullable().references('id').inTable('employees');
    t.date('expense_date').notNullable();
    t.string('category', 50).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.string('currency', 3).defaultTo('SEK');
    t.text('description').nullable();
    t.string('receipt_url', 500).nullable();
    t.string('status', 20).defaultTo('PENDING');
    t.uuid('approved_by_id').nullable().references('id').inTable('employees');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('travel_claims', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('employee_id').notNullable().references('id').inTable('employees');
    t.timestamp('departure_at').notNullable();
    t.timestamp('return_at').notNullable();
    t.string('destination').notNullable();
    t.boolean('is_international').defaultTo(false);
    t.decimal('mileage_km', 10, 2).defaultTo(0);
    t.decimal('calculated_per_diem', 12, 2).defaultTo(0);
    t.string('status', 20).defaultTo('PENDING');
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('collective_agreement_configs', (t) => {
    t.jsonb('pension_rules').nullable(); 
    t.jsonb('contribution_rules').nullable(); 
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('travel_claims');
  await knex.schema.dropTableIfExists('expense_claims');
  await knex.schema.dropTableIfExists('tax_tables');
  await knex.schema.dropTableIfExists('balance_ledger');
  await knex.schema.dropTableIfExists('emergency_contacts');
  await knex.schema.dropTableIfExists('pay_types');
  await knex.schema.alterTable('employees', (t) => {
    t.dropColumn('tax_table_override');
    t.dropColumn('municipality');
    t.dropColumn('zip_code');
    t.dropColumn('job_definition_id');
    t.dropColumn('legal_gender');
  });
  await knex.schema.dropTableIfExists('job_definitions');
  await knex.schema.dropTableIfExists('job_levels');
}
