import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Depots (Master Location Data - kept for legacy UI compatibility)
  if (!await knex.schema.hasTable('depots')) {
    await knex.schema.createTable('depots', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable().unique();
      table.decimal('lat', 10, 6).notNullable();
      table.decimal('lon', 10, 6).notNullable();
      table.timestamps(true, true);
    });
  }

  if (await knex.schema.hasTable('vehicles') && !await knex.schema.hasColumn('vehicles', 'current_depot_id')) {
    await knex.schema.alterTable('vehicles', (table) => {
      table.uuid('current_depot_id').references('id').inTable('depots').onDelete('SET NULL');
    });
  }

  // 2. Blocks (Fordonsomlopp)
  if (!await knex.schema.hasTable('blocks')) {
    await knex.schema.createTable('blocks', (table) => {
      table.string('id').primary(); // 'Block:676-01'
      table.string('start_garage_point_id'); 
      table.string('end_garage_point_id');
      table.string('vehicle_type_requirement');
      table.string('assigned_vehicle_id'); 
      table.timestamps(true, true);
    });
  }

  // 3. Tours (Omlopp / ServiceJourneys - Operational Execution)
  if (!await knex.schema.hasTable('tours')) {
    await knex.schema.createTable('tours', (table) => {
      table.string('id').primary(); 
      table.string('block_id_new').references('id').inTable('blocks').onDelete('SET NULL');
      table.string('line_id').notNullable(); 
      table.enum('journey_type', ['SERVICE', 'DEAD_RUN']).defaultTo('SERVICE');
      table.integer('sequence_in_block').defaultTo(1);
      table.string('start_depot_id').notNullable(); 
      table.string('end_depot_id').notNullable();
      table.string('assigned_vehicle_id').references('id').inTable('vehicles').nullable();
      table.string('assigned_driver_id').nullable();
      table.dateTime('planned_start').notNullable();
      table.dateTime('planned_end').notNullable();
      table.enum('status', ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED']).defaultTo('DRAFT');
      table.integer('estimated_consumption_kwh').nullable(); 
      table.timestamps(true, true);
    });
  }

  // 4. Eco-Driving Stats
  if (!await knex.schema.hasTable('eco_driving_stats')) {
    await knex.schema.createTable('eco_driving_stats', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('driver_id').notNullable();
      table.string('tour_id').references('id').inTable('tours').onDelete('CASCADE'); // String reference
      table.decimal('energy_consumed_kwh', 10, 2).notNullable();
      table.decimal('regenerated_kwh', 10, 2).notNullable();
      table.decimal('eco_score', 5, 2).notNullable(); 
      table.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('eco_driving_stats');
  await knex.schema.dropTableIfExists('tours');
  await knex.schema.dropTableIfExists('blocks');
  
  await knex.schema.alterTable('vehicles', (table) => {
    table.dropColumn('current_depot_id');
  });

  await knex.schema.dropTableIfExists('depots');
}
