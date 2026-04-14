import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Defekter (Inrapporterade fel)
  await knex.schema.createTable('defects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('vehicle_id').notNullable();
    table.string('reported_by').notNullable();
    table.string('description').notNullable();
    table.string('category').notNullable(); // Glas, Motor, Inredning, etc.
    table.integer('severity_level').notNullable().defaultTo(1); // 1, 2, 3
    table.enum('status', ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']).defaultTo('OPEN');
    table.timestamps(true, true);
  });

  // 2. Arbetsorder (Work Orders)
  await knex.schema.createTable('work_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('defect_id').references('id').inTable('defects').onDelete('CASCADE');
    table.string('vehicle_id').notNullable();
    table.string('vendor_name'); // T.ex. "Ryds Bilglas" eller "Intern Verkstad"
    table.string('description').notNullable();
    table.date('scheduled_date');
    table.enum('status', ['PLANNED', 'SENT', 'COMPLETED', 'CANCELLED']).defaultTo('PLANNED');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('work_orders');
  await knex.schema.dropTableIfExists('defects');
}
