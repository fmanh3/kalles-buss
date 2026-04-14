import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Laddstationer i depån
  await knex.schema.createTable('charging_stations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('station_id').notNullable().unique(); // T.ex. DEPOT-NORTH-01
    table.string('location_name').notNullable(); // T.ex. "Norrtälje Depå, Ficka 1"
    table.enum('type', ['CCS2', 'PANTOGRAPH']).notNullable();
    table.integer('max_power_kw').notNullable();
    table.enum('status', ['AVAILABLE', 'CHARGING', 'FAULTY', 'OFFLINE']).defaultTo('AVAILABLE');
    table.timestamps(true, true);
  });

  // 2. Fordonsstatus i depån
  await knex.schema.createTable('vehicle_depot_status', (table) => {
    table.string('vehicle_id').primary(); // Referens till Traffic domänen
    table.string('current_bay'); // T.ex. "Ficka 4"
    table.uuid('connected_station_id').references('id').inTable('charging_stations').onDelete('SET NULL');
    table.decimal('current_soc', 5, 2);
    table.datetime('last_seen_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });

  // 3. Laddningssessioner (Historik och logg)
  await knex.schema.createTable('charging_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('station_id').references('id').inTable('charging_stations').onDelete('CASCADE');
    table.string('vehicle_id').notNullable();
    table.datetime('start_time').notNullable();
    table.datetime('end_time');
    table.decimal('start_soc', 5, 2);
    table.decimal('end_soc', 5, 2);
    table.decimal('energy_delivered_kwh', 10, 2);
    table.string('optimization_strategy'); // T.ex. "SPOT_PRICE_HEDGING"
    table.timestamps(true, true);
  });

  // Seed initial data
  await knex('charging_stations').insert([
    { station_id: 'DEPOT-N-01', location_name: 'Norrtälje Depå, Ficka 1', type: 'CCS2', max_power_kw: 150 },
    { station_id: 'DEPOT-N-02', location_name: 'Norrtälje Depå, Ficka 2', type: 'CCS2', max_power_kw: 150 },
    { station_id: 'TERM-S-01', location_name: 'Tekniska Högskolan', type: 'PANTOGRAPH', max_power_kw: 450 }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('charging_sessions');
  await knex.schema.dropTableIfExists('vehicle_depot_status');
  await knex.schema.dropTableIfExists('charging_stations');
}
