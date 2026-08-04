import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Lines
  if (!await knex.schema.hasTable('lines')) {
    await knex.schema.createTable('lines', (table) => {
      table.string('id').primary();
      table.string('public_code').notNullable();
      table.string('name').notNullable();
      table.timestamps(true, true);
    });
  }

  // 2. Scheduled Stop Points
  if (!await knex.schema.hasTable('scheduled_stop_points')) {
    await knex.schema.createTable('scheduled_stop_points', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.decimal('lat', 10, 6).nullable();
      table.decimal('lon', 10, 6).nullable();
      table.timestamps(true, true);
    });
  }

  // 3. Service Journeys (The master plan)
  if (!await knex.schema.hasTable('service_journeys')) {
    await knex.schema.createTable('service_journeys', (table) => {
      table.string('id').primary();
      table.string('line_id').references('id').inTable('lines').onDelete('CASCADE');
      table.enum('direction', ['OUTBOUND', 'RETURN']).notNullable();
      table.string('day_type_ref').notNullable();
      table.timestamps(true, true);
    });
  }

  // 4. Journey Calls (The itinerary)
  if (!await knex.schema.hasTable('journey_calls')) {
    await knex.schema.createTable('journey_calls', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('service_journey_id').references('id').inTable('service_journeys').onDelete('CASCADE');
      table.string('stop_point_id').references('id').inTable('scheduled_stop_points').onDelete('CASCADE');
      table.integer('stop_sequence').notNullable();
      table.dateTime('arrival_time').notNullable();
      table.dateTime('departure_time').notNullable();
      table.boolean('for_boarding').defaultTo(true);
      table.boolean('for_alighting').defaultTo(true);
      table.boolean('is_timing_point').defaultTo(false);
      table.timestamps(true, true);
    });
  }

  // Update tours table to reference service_journey_id instead of line_id
  if (await knex.schema.hasTable('tours') && !await knex.schema.hasColumn('tours', 'service_journey_id')) {
    await knex.schema.alterTable('tours', (table) => {
      table.string('service_journey_id').references('id').inTable('service_journeys').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tours', (table) => {
    table.dropColumn('service_journey_id');
  });
  await knex.schema.dropTableIfExists('journey_calls');
  await knex.schema.dropTableIfExists('service_journeys');
  await knex.schema.dropTableIfExists('scheduled_stop_points');
  await knex.schema.dropTableIfExists('lines');
}
