import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('tours') && !await knex.schema.hasColumn('tours', 'distance_km')) {
    await knex.schema.alterTable('tours', (table) => {
      table.decimal('distance_km', 10, 2).nullable();
    });
  }
  
  if (await knex.schema.hasTable('blocks') && !await knex.schema.hasColumn('blocks', 'accumulated_distance_km')) {
    await knex.schema.alterTable('blocks', (table) => {
      table.decimal('accumulated_distance_km', 10, 2).nullable();
    });
  }

  if (await knex.schema.hasTable('vehicles') && !await knex.schema.hasColumn('vehicles', 'max_range_km')) {
    await knex.schema.alterTable('vehicles', (table) => {
      table.integer('max_range_km').defaultTo(300);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('vehicles', (table) => {
    table.dropColumn('max_range_km');
  });

  await knex.schema.alterTable('blocks', (table) => {
    table.dropColumn('accumulated_distance_km');
  });

  await knex.schema.alterTable('tours', (table) => {
    table.dropColumn('distance_km');
  });
}
