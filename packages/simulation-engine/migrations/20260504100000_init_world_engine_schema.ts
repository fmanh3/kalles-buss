import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("data_assets"))) {
    await knex.schema.createTable("data_assets", (table) => {
      table.string("id").primary();
      table.string("name").notNullable();
      table.string("type").notNullable(); // e.g. 'NETEX_ZIP', 'SYNTHETIC_PROFILE'
      table.jsonb("config").notNullable(); // Parameters for synthetic generation or S3 paths
      table.timestamps(true, true);
    });
  }

  if (!(await knex.schema.hasTable("scenarios"))) {
    await knex.schema.createTable("scenarios", (table) => {
      table.string("id").primary();
      table.string("name").notNullable();
      table.string("description").nullable();
      table
        .string("timetable_asset_id")
        .references("id")
        .inTable("data_assets")
        .onDelete("SET NULL");
      table.string("fleet_size").defaultTo("3");
      table.string("starting_cash").defaultTo("50000");
      table.jsonb("stimuli").notNullable().defaultTo("{}");
      table.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('scenarios');
  await knex.schema.dropTableIfExists('data_assets');
}
