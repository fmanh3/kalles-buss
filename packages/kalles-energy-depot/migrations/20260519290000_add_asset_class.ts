import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // We missed adding asset_class during the schema rewrite
  await knex.schema.alterTable('asset_models', (table) => {
    table.string('asset_class').defaultTo('VEHICLE'); // VEHICLE, FACILITY_EQUIPMENT, TRACKABLE_TOOL
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('asset_models', (table) => {
    table.dropColumn('asset_class');
  });
}
