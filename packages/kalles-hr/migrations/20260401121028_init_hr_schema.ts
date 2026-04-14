import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Förare
  await knex.schema.createTable('drivers', (table) => {
    table.string('id').primary(); // T.ex. FÖRARE-007
    table.string('name').notNullable();
    table.string('employment_type').defaultTo('FULL_TIME'); // FULL_TIME, PART_TIME, HOURLY
    table.decimal('hourly_rate', 10, 2).notNullable();
    table.timestamps(true, true);
  });

  // 2. Arbetspass (Shifts) - Planerad tid
  await knex.schema.createTable('shifts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('driver_id').references('id').inTable('drivers').onDelete('CASCADE');
    table.datetime('planned_start_time').notNullable();
    table.datetime('planned_end_time').notNullable();
    table.string('line_id');
    table.enum('status', ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SICK']).defaultTo('SCHEDULED');
    table.timestamps(true, true);
  });

  // 3. Tidloggar (Faktisk tid)
  await knex.schema.createTable('time_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('driver_id').references('id').inTable('drivers').onDelete('CASCADE');
    table.uuid('shift_id').references('id').inTable('shifts').onDelete('SET NULL');
    table.datetime('start_time').notNullable();
    table.datetime('end_time');
    table.string('log_type').defaultTo('WORK'); // WORK, BREAK, SICK, VACATION
    table.text('comment');
    table.timestamps(true, true);
  });

  // 4. Löneunderlag (Payroll)
  await knex.schema.createTable('payroll_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('driver_id').references('id').inTable('drivers').onDelete('CASCADE');
    table.string('period'); // T.ex. 2026-03
    table.decimal('base_pay_amount', 15, 2).defaultTo(0);
    table.decimal('ob_pay_amount', 15, 2).defaultTo(0);
    table.decimal('overtime_pay_amount', 15, 2).defaultTo(0);
    table.decimal('total_gross_pay', 15, 2).notNullable();
    table.enum('status', ['DRAFT', 'APPROVED', 'PAID']).defaultTo('DRAFT');
    table.timestamps(true, true);
  });

  // 5. OB-satser (Kollektivavtalsregler)
  await knex.schema.createTable('ob_rates', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable(); // T.ex. "Natt-OB", "Helg-OB"
    table.string('start_time'); // T.ex. "22:00"
    table.string('end_time');   // T.ex. "06:00"
    table.jsonb('days_of_week'); // T.ex. [1,2,3,4,5] för vardagar
    table.decimal('rate_per_hour', 10, 2).notNullable();
    table.timestamps(true, true);
  });

  // Initial data
  await knex('drivers').insert([
    { id: 'FÖRARE-007', name: 'Kalle Karlsson', hourly_rate: 185.00 },
    { id: 'FÖRARE-008', name: 'Stina Svensson', hourly_rate: 192.00 }
  ]);

  await knex('ob_rates').insert([
    { name: 'Kvälls-OB', start_time: '19:00', end_time: '22:00', days_of_week: JSON.stringify([1,2,3,4,5]), rate_per_hour: 25.50 },
    { name: 'Natt-OB', start_time: '22:00', end_time: '06:00', days_of_week: JSON.stringify([1,2,3,4,5]), rate_per_hour: 45.00 },
    { name: 'Helg-OB', start_time: '00:00', end_time: '23:59', days_of_week: JSON.stringify([0,6]), rate_per_hour: 55.00 }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ob_rates');
  await knex.schema.dropTableIfExists('payroll_records');
  await knex.schema.dropTableIfExists('time_logs');
  await knex.schema.dropTableIfExists('shifts');
  await knex.schema.dropTableIfExists('drivers');
}
