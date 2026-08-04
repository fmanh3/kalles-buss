import { Knex } from "knex";

export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  // Drop foreign keys that depend on tours.id
  try {
    await knex.raw('ALTER TABLE eco_driving_stats DROP CONSTRAINT eco_driving_stats_tour_id_foreign;');
  } catch (e) {}
  
  // Alter types
  try {
    await knex.raw('ALTER TABLE tours ALTER COLUMN id TYPE VARCHAR(255);');
    await knex.raw('ALTER TABLE eco_driving_stats ALTER COLUMN tour_id TYPE VARCHAR(255);');
  } catch (e) {}

  // Re-add constraints
  try {
    await knex.raw('ALTER TABLE eco_driving_stats ADD CONSTRAINT eco_driving_stats_tour_id_foreign FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;');
  } catch (e) {}
}

export async function down(knex: Knex): Promise<void> {
}
