import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Read-only mirror of staff from HR domain
  await knex.schema.createTable('staff', (table) => {
    table.string('id').primary(); // Primary key from HR (string)
    table.string('name').notNullable();
    table.string('role').notNullable(); // 'MECHANIC', 'DRIVER', etc.
    table.string('home_depot_id').references('id').inTable('depots').onDelete('SET NULL');
    table.string('current_location_id').references('id').inTable('depots').onDelete('SET NULL');
    table.jsonb('skills'); // e.g. ['HIGH_VOLTAGE', 'CHASSIS']
    table.string('status').defaultTo('AVAILABLE'); // 'AVAILABLE', 'ON_SHIFT', 'SICK', 'AWAY'
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('staff');
}
