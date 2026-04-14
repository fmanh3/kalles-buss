import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Technical representation of an asset, linked to a financial one
  await knex.schema.createTable('technical_assets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('asset_id').notNullable().unique(); // Shared ID with finance domain
    table.string('vin').unique(); // Vehicle Identification Number
    table.string('vehicle_id').references('id').inTable('vehicles'); // FK to the original vehicles table
    table.enum('operational_status', [
      'OPERATIONAL', 
      'IN_REPAIR', 
      'AWAITING_MAINTENANCE', 
      'DECOMMISSIONED'
    ]).defaultTo('OPERATIONAL');
    table.timestamps(true, true);
  });

  // Simplified Bill of Materials (BOM)
  await knex.schema.createTable('components', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('technical_asset_id').references('id').inTable('technical_assets').onDelete('CASCADE');
    table.uuid('parent_component_id').references('id').inTable('components').onDelete('CASCADE'); // Self-referencing for hierarchy
    table.string('part_number').notNullable();
    table.string('serial_number').unique();
    table.string('component_type').notNullable(); // e.g., 'BATTERY_PACK', 'WINDSHIELD', 'ENGINE'
    table.timestamps(true, true);
  });

  // Stub for Inspections
  await knex.schema.createTable('inspections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('technical_asset_id').references('id').inTable('technical_assets').onDelete('SET NULL');
    table.string('driver_id').notNullable(); // In a real system, this would be a FK to HR domain
    table.string('checklist_type').notNullable().defaultTo('PRE_TRIP_INSPECTION');
    table.datetime('completed_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });

  // Items for a specific inspection
  await knex.schema.createTable('inspection_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('inspection_id').references('id').inTable('inspections').onDelete('CASCADE');
    table.string('item_name').notNullable(); // e.g., 'Vindruta'
    table.enum('status', ['OK', 'NOTE', 'GROUNDED']).notNullable();
    table.text('notes');
    table.timestamps(true, true);
  });

  // Stub for Work Orders
  await knex.schema.createTable('work_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('technical_asset_id').references('id').inTable('technical_assets').onDelete('SET NULL');
    table.string('title').notNullable();
    table.enum('status', ['OPEN', 'IN_PROGRESS', 'PENDING_PARTS', 'COMPLETED', 'CANCELLED']).defaultTo('OPEN');
    table.uuid('inspection_item_id').references('id').inTable('inspection_items').onDelete('SET NULL'); // Originating defect
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('work_orders');
  await knex.schema.dropTableIfExists('inspection_items');
  await knex.schema.dropTableIfExists('inspections');
  await knex.schema.dropTableIfExists('components');
  await knex.schema.dropTableIfExists('technical_assets');
}
