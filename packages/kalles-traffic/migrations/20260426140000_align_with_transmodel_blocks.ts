import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Blocks (Fordonsomlopp)
  if (!await knex.schema.hasTable('blocks')) {
    await knex.schema.createTable('blocks', (table) => {
      table.string('id').primary(); // t.ex. 'Block:676-01'
      table.string('start_garage_point_id'); // Referens till Depot:GaragePoint
      table.string('end_garage_point_id');
      table.string('vehicle_type_requirement');
      table.string('assigned_vehicle_id'); // Referens till Depot:Vehicle
      table.timestamps(true, true);
    });
  }

  // 2. Journey-tabell (Uppgraderad Tours)
  // Vi behåller namnet 'tours' för bakåtkompatibilitet i koden men lägger till typ och ordning
  if (await knex.schema.hasTable('tours') && !await knex.schema.hasColumn('tours', 'journey_type')) {
    await knex.schema.alterTable('tours', (table) => {
      table.enum('journey_type', ['SERVICE', 'DEAD_RUN']).defaultTo('SERVICE');
      table.integer('sequence_in_block').defaultTo(1);
      
      // Explicit referens till Block
      table.string('block_id_new').references('id').inTable('blocks').onDelete('SET NULL');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tours', (table) => {
    table.dropColumn('block_id_new');
    table.dropColumn('sequence_in_block');
    table.dropColumn('journey_type');
  });
  await knex.schema.dropTableIfExists('blocks');
}
