import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasCreatedBy = await knex.schema.hasColumn("scenarios", "created_by");
  const hasInitialState = await knex.schema.hasColumn("scenarios", "initial_state");
  const hasFleetSize = await knex.schema.hasColumn("scenarios", "fleet_size");
  const hasStartingCash = await knex.schema.hasColumn("scenarios", "starting_cash");

  await knex.schema.alterTable("scenarios", (table) => {
    if (!hasCreatedBy) {
      table.string("created_by").defaultTo("System");
    }
    if (!hasInitialState) {
      table.jsonb("initial_state").notNullable().defaultTo("{}");
    }
    if (hasFleetSize) {
      table.dropColumn("fleet_size");
    }
    if (hasStartingCash) {
      table.dropColumn("starting_cash");
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("scenarios", (table) => {
    table.string("fleet_size").defaultTo("3");
    table.string("starting_cash").defaultTo("50000");
    table.dropColumn("created_by");
    table.dropColumn("initial_state");
  });
}
