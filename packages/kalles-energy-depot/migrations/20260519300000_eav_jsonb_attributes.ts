import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. ASSET MODELS: Add flexible EAV blob
  await knex.schema.alterTable('asset_models', (table) => {
    table.jsonb('attributes').defaultTo('{}');
    // Drop rigid fields that belong in attributes
    table.dropColumn('model_year');
    table.dropColumn('description');
  });

  // 2. ASSETS (Individuals): Add flexible EAV blob
  await knex.schema.alterTable('assets', (table) => {
    table.jsonb('attributes').defaultTo('{}');
    // Drop rigid fields that belong in attributes (VIN is highly vehicle-specific)
    table.dropColumn('vin');
    // We keep serial_number as a core column because almost EVERY asset 
    // (bus, battery, wrench, lift) has a serial number and it's heavily used in search/barcode scanning.
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('attributes');
    table.string('vin', 17);
  });

  await knex.schema.alterTable('asset_models', (table) => {
    table.dropColumn('attributes');
    table.integer('model_year');
    table.string('description');
  });
}
