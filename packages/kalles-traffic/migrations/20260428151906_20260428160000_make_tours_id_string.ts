import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  try {
    await knex.raw('ALTER TABLE tours ALTER COLUMN id TYPE VARCHAR(255);');
  } catch (e) {}
}

export async function down(knex: Knex): Promise<void> {
}
