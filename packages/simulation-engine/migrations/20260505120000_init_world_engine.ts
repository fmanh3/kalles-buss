import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("data_assets"))) {
    await knex.schema.createTable("data_assets", (table) => {
      table.string("id").primary();
      table.string("name").notNullable();
      table.string("type").notNullable();
      table.jsonb("config").notNullable();
      table.timestamps(true, true);
    });
  }

  if (!(await knex.schema.hasTable("scenarios"))) {
    await knex.schema.createTable("scenarios", (table) => {
      table.string("id").primary();
      table.string("name").notNullable();
      table.string("description").nullable();
      table.string("created_by").defaultTo("System");
      table
        .string("timetable_asset_id")
        .references("id")
        .inTable("data_assets")
        .onDelete("SET NULL");
      table.jsonb("initial_state").notNullable().defaultTo("{}");
      table.jsonb("stimuli").notNullable().defaultTo("{}");
      table.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('scenarios');
  await knex.schema.dropTableIfExists('data_assets');
}
