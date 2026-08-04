import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Master Vendor Table in Finance
  await knex.schema.createTable('vendors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('organization_number').nullable();
    table.string('bankgiro').nullable();
    table.string('contact_email').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 2. Link existing vendor_invoices to the new vendors table
  // (We add vendor_id and make vendor_name optional)
  await knex.schema.alterTable('vendor_invoices', (table) => {
    table.uuid('vendor_id').references('id').inTable('vendors').onDelete('RESTRICT');
  });

  // 3. Accrued Liabilities (Mottagna men ej fakturerade varor)
  // This is the bridge for 3-way matching
  await knex.schema.createTable('accrued_liabilities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('vendor_id').notNullable().references('id').inTable('vendors');
    table.string('source_domain').defaultTo('DEPOT'); // e.g. 'DEPOT'
    table.string('source_reference_id').notNullable(); // po_receipt_id from Depot
    
    table.decimal('amount_estimated', 15, 2).notNullable();
    table.string('description');
    
    table.uuid('matched_invoice_id').nullable().references('id').inTable('vendor_invoices');
    table.enum('status', ['OPEN', 'MATCHED', 'CANCELLED']).defaultTo('OPEN');
    
    table.timestamps(true, true);
    table.unique(['source_domain', 'source_reference_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('accrued_liabilities');
  await knex.schema.alterTable('vendor_invoices', (table) => {
    table.dropColumn('vendor_id');
  });
  await knex.schema.dropTableIfExists('vendors');
}
