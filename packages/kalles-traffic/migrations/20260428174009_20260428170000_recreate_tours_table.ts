import { Knex } from "knex";

export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  // To avoid any UUID vs VARCHAR conflicts and broken constraints in Postgres,
  // we completely drop the dependent tables and `tours` and recreate them with correct String types.
  await knex.schema.dropTableIfExists('eco_driving_stats');
  try {
    await knex.schema.alterTable('vehicle_status', (table) => {
      table.dropForeign(['current_tour_id']);
    });
  } catch (e) {
    // Already dropped
  }
  await knex.schema.dropTableIfExists('tours');

  if (!await knex.schema.hasTable('tours')) {
    await knex.schema.createTable('tours', (table) => {
      table.string('id').primary(); // Varchar
      table.string('block_id_new').references('id').inTable('blocks').onDelete('SET NULL');
      table.string('line_id').notNullable(); 
      table.enum('journey_type', ['SERVICE', 'DEAD_RUN']).defaultTo('SERVICE');
      table.integer('sequence_in_block').defaultTo(1);
      table.string('start_depot_id').notNullable(); // Varchar
      table.string('end_depot_id').notNullable(); // Varchar
      table.string('assigned_vehicle_id').references('id').inTable('vehicles').nullable();
      table.string('assigned_driver_id').nullable();
      table.dateTime('planned_start').notNullable();
      table.dateTime('planned_end').notNullable();
      table.enum('status', ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED']).defaultTo('DRAFT');
      table.integer('estimated_consumption_kwh').nullable(); 
      table.timestamps(true, true);
    });
  }

  if (!await knex.schema.hasTable('eco_driving_stats')) {
    await knex.schema.createTable('eco_driving_stats', (table) => {
      table.string('tour_id').primary().references('id').inTable('tours').onDelete('CASCADE');
      table.string('driver_id').notNullable();
      table.string('vehicle_id').notNullable();
      table.decimal('total_kwh_consumed', 10, 2).notNullable();
      table.decimal('regenerated_kwh', 10, 2).notNullable();
      table.decimal('eco_score', 5, 2).notNullable();
      table.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
}
