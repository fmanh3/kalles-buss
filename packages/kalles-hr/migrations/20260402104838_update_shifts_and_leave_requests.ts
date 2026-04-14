import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Utöka shifts med hämtningsplats och fordons-ID
  await knex.schema.table('shifts', (table) => {
    table.string('pickup_location').defaultTo('Norrtälje RC');
    table.string('vehicle_id'); // Referens till Traffic-domänens fordon
  });

  // 2. Skapa tabell för ledighetsansökningar
  await knex.schema.createTable('leave_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('driver_id').references('id').inTable('drivers').onDelete('CASCADE');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.string('leave_type').defaultTo('VACATION'); // VACATION, SICK, OTHER
    table.enum('status', ['PENDING', 'APPROVED', 'REJECTED']).defaultTo('PENDING');
    table.text('comment');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_requests');
  await knex.schema.table('shifts', (table) => {
    table.dropColumn('pickup_location');
    table.dropColumn('vehicle_id');
  });
}
