import { Knex } from "knex";

// Disable transaction to allow try-catch on individual statements
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  // We need to drop the rigid foreign keys for depots, because NeTEx uses string IDs (e.g. STOP-A)
  // and Transmodel uses GaragePoint string IDs, not internal UUIDs.
  try {
    await knex.schema.alterTable('tours', (table) => {
      table.dropForeign(['start_depot_id']);
    });
  } catch (e) {
    // Already dropped
  }

  try {
    await knex.schema.alterTable('tours', (table) => {
      table.dropForeign(['end_depot_id']);
    });
  } catch (e) {
    // Already dropped
  }

  await knex.schema.alterTable('tours', (table) => {
    table.string('start_depot_id').alter(); // Change to string to hold STOP-A or GaragePoint:Norrtalje:GP1
    table.string('end_depot_id').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Reverting this is complex since we lose the UUID constraint, but it's fine for Sandbox.
}
