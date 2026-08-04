import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("folders"))) {
    await knex.schema.createTable("folders", (table) => {
      table.string("id").primary();
      table.string("name").notNullable();
      table.string("parent_id").nullable(); // Allows arbitrary depth. Null means root.
      table.enum("tree_type", ["SCENARIO", "ASSET"]).notNullable(); // Which tree does it belong to?
      table.timestamps(true, true);
    });
  }

  // Switch assets and scenarios to use folder_id instead of string path
  if (!(await knex.schema.hasColumn("data_assets", "folder_id"))) {
    await knex.schema.alterTable("data_assets", (table) => {
      table
        .string("folder_id")
        .references("id")
        .inTable("folders")
        .onDelete("SET NULL");
    });
  }

  if (await knex.schema.hasColumn("data_assets", "folder_path")) {
    await knex.schema.alterTable("data_assets", (table) => {
      table.dropColumn("folder_path");
    });
  }

  if (!(await knex.schema.hasColumn("scenarios", "folder_id"))) {
    await knex.schema.alterTable("scenarios", (table) => {
      table
        .string("folder_id")
        .references("id")
        .inTable("folders")
        .onDelete("SET NULL");
    });
  }

  if (await knex.schema.hasColumn("scenarios", "folder_path")) {
    await knex.schema.alterTable("scenarios", (table) => {
      table.dropColumn("folder_path");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('scenarios', (table) => {
    table.string('folder_path').defaultTo('/');
    table.dropColumn('folder_id');
  });
  
  await knex.schema.alterTable('data_assets', (table) => {
    table.string('folder_path').defaultTo('/');
    table.dropColumn('folder_id');
  });

  await knex.schema.dropTableIfExists('folders');
}
