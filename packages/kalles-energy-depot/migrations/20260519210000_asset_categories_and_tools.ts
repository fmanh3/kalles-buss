import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Asset Categories
  await knex.schema.createTable('asset_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 50).notNullable().unique(); // 'VEHICLE', 'FACILITY_EQUIPMENT', 'TRACKABLE_TOOL'
    table.string('description').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 2. Expand existing assets table
  await knex.schema.alterTable('assets', (table) => {
    table.uuid('asset_category_id').references('id').inTable('asset_categories').onDelete('RESTRICT');
    // Using our existing depot_points table to locate facility equipment (like a lift in Bay 4)
    table.string('depot_point_id').references('id').inTable('depot_points').onDelete('SET NULL');
  });

  // 3. Tool Checkouts (Tool Crib)
  await knex.schema.createTable('tool_checkouts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE'); // The Tool
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT'); // The Mechanic
    table.uuid('work_order_id').references('id').inTable('work_orders').onDelete('SET NULL'); // Optional context
    
    table.timestamp('checked_out_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expected_return_at');
    table.timestamp('checked_in_at'); // Null means currently checked out
    table.string('condition_on_return'); // 'OK', 'DAMAGED_NEEDS_REPAIR'
    
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tool_checkouts');
  
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('depot_point_id');
    table.dropColumn('asset_category_id');
  });

  await knex.schema.dropTableIfExists('asset_categories');
}
