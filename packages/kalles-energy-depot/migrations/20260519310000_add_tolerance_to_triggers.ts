import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pm_triggers', (table) => {
    table.decimal('tolerance_value', 15, 2).defaultTo(0).comment('Allowable maintenance window/span before the interval expires');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pm_triggers', (table) => {
    table.dropColumn('tolerance_value');
  });
}
