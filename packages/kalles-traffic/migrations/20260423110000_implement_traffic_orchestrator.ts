import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Depots (Master Location Data)
  if (!await knex.schema.hasTable('depots')) {
    await knex.schema.createTable('depots', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable().unique(); // e.g., "Norrtälje Depot"
      table.decimal('lat', 10, 6).notNullable();
      table.decimal('lon', 10, 6).notNullable();
      table.timestamps(true, true);
    });

    // Seed default depots only if we just created the table
    await knex('depots').insert([
      { name: 'Norrtälje Depot', lat: 59.7580, lon: 18.6946 },
      { name: 'Tekniska Depot', lat: 59.3456, lon: 18.0715 }
    ]);
  }

  // Add Depot ID to vehicles
  if (await knex.schema.hasTable('vehicles') && !await knex.schema.hasColumn('vehicles', 'current_depot_id')) {
    await knex.schema.alterTable('vehicles', (table) => {
      table.uuid('current_depot_id').references('id').inTable('depots').onDelete('SET NULL');
    });
  }

  // 2. Tours (Omlopp - Operational Execution)
  if (!await knex.schema.hasTable('tours')) {
    await knex.schema.createTable('tours', (table) => {
      table.string('id').primary(); // e.g., "TOUR-1234"
      table.string('line_id').notNullable(); // e.g., "676"
      table.string('start_depot_id').notNullable(); // String: "GaragePoint:Norrtalje:GP1" or "STOP-A"
      table.string('end_depot_id').notNullable();
      table.string('assigned_vehicle_id').references('id').inTable('vehicles').nullable();
      table.string('assigned_driver_id').nullable(); // Fetched via HR integration
      table.dateTime('planned_start').notNullable();
      table.dateTime('planned_end').notNullable();
      table.enum('status', ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED']).defaultTo('DRAFT');
      table.integer('estimated_consumption_kwh').nullable(); // Dynamic Range Recovery
      table.timestamps(true, true);
    });
  }

  // 3. Eco-Driving Stats
  if (!await knex.schema.hasTable('eco_driving_stats')) {
    await knex.schema.createTable('eco_driving_stats', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('driver_id').notNullable();
      table.string('tour_id').references('id').inTable('tours').onDelete('CASCADE');
      table.decimal('energy_consumed_kwh', 10, 2).notNullable();
      table.decimal('regenerated_kwh', 10, 2).notNullable();
      table.decimal('eco_score', 5, 2).notNullable(); // Calculated 0-100
      table.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('eco_driving_stats');
  await knex.schema.dropTableIfExists('tours');
  
  await knex.schema.alterTable('vehicles', (table) => {
    table.dropColumn('current_depot_id');
  });

  await knex.schema.dropTableIfExists('depots');
}
