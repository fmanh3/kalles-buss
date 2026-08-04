import { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('blocks') && !await knex.schema.hasColumn('blocks', 'validation_status')) {
    await knex.schema.alterTable('blocks', (table) => {
      table.string('validation_status').defaultTo('DRAFT');
    });
  }
}
export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('blocks', (table) => {
    table.dropColumn('validation_status');
  });
}
