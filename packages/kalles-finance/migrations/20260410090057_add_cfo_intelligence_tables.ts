import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Anläggningstillgångar (Assets) - T.ex. Bussar och Batterier
  await knex.schema.createTable('assets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('asset_id').notNullable().unique(); // T.ex. BUSS-101
    table.string('name').notNullable();
    table.decimal('purchase_price', 15, 2).notNullable();
    table.decimal('book_value', 15, 2).notNullable();
    table.date('purchase_date').notNullable();
    table.decimal('accumulated_depreciation', 15, 2).defaultTo(0);
    table.timestamps(true, true);
  });

  // 2. Viten (Penalties) - Från SL
  await knex.schema.createTable('penalties', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('reference_id').notNullable(); // T.ex. TOUR-123
    table.decimal('amount', 15, 2).notNullable();
    table.string('reason_code');
    table.enum('status', ['PENDING', 'APPROVED', 'DISPUTED', 'CANCELLED']).defaultTo('PENDING');
    table.text('dispute_draft');
    table.timestamps(true, true);
  });

  // 3. Periodiseringar (Accruals)
  await knex.schema.createTable('accruals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('period').notNullable(); // T.ex. 2026-03
    table.string('description').notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('account_code').notNullable();
    table.enum('status', ['DRAFT', 'POSTED']).defaultTo('DRAFT');
    table.timestamps(true, true);
  });

  // 4. Leverantörsfakturor (Accounts Payable)
  await knex.schema.createTable('vendor_invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('vendor_name').notNullable();
    table.string('invoice_reference').notNullable();
    table.decimal('amount_total', 15, 2).notNullable();
    table.decimal('amount_vat', 15, 2).notNullable();
    table.date('due_date').notNullable();
    table.enum('status', ['PENDING', 'APPROVED', 'PAID', 'DISPUTED']).defaultTo('PENDING');
    table.string('category'); // e.g., "Direct Operating Cost - Energy"
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('accruals');
  await knex.schema.dropTableIfExists('penalties');
  await knex.schema.dropTableIfExists('assets');
}
