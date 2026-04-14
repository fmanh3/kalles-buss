import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('shifts', (table) => {
    table.unique(['driver_id', 'planned_start_time']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('shifts', (table) => {
    table.dropUnique(['driver_id', 'planned_start_time']);
  });
}
