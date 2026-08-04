import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('tours') && !await knex.schema.hasColumn('tours', 'block_id')) {
    await knex.schema.alterTable('tours', (table) => {
      // VSP Block ID: Representerar ett fordons omlopp över dagen.
      // Flera 'tours' (trips) kan ha samma block_id.
      table.string('block_id').nullable().index();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tours', (table) => {
    table.dropColumn('block_id');
  });
}
