import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn("data_assets", "folder_path"))) {
    await knex.schema.alterTable("data_assets", (table) => {
      table.string("folder_path").defaultTo("/");
    });
  }

  if (!(await knex.schema.hasColumn("scenarios", "folder_path"))) {
    await knex.schema.alterTable("scenarios", (table) => {
      table.string("folder_path").defaultTo("/");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('scenarios', (table) => {
    table.dropColumn('folder_path');
  });
  await knex.schema.alterTable('data_assets', (table) => {
    table.dropColumn('folder_path');
  });
}
