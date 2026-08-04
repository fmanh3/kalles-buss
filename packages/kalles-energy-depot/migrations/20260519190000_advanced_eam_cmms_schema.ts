import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'); // For gen_random_uuid()

  // ==========================================
  // 1. INFRASTRUCTURE & FACILITIES
  // ==========================================
  await knex.schema.createTable('depots', (table) => {
    table.string('id').primary(); // e.g. 'DEPOT-NTA'
    table.string('name').notNullable();
    table.string('location_description');
    table.integer('capacity').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.timestamp('deleted_at');
  });

  await knex.schema.createTable('depot_points', (table) => {
    table.string('id').primary();
    table.string('depot_id').references('id').inTable('depots').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('facility_type').notNullable(); // PARKING, WASHING, CHARGING
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // ==========================================
  // 2. VMRS COMPLIANCE (CODES 31, 32, 33, 18)
  // ==========================================
  
  // Code 31: System
  await knex.schema.createTable('vmrs_systems', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 3).notNullable().unique(); // e.g., '013' for Brakes
    table.string('description').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Code 32: Assembly
  await knex.schema.createTable('vmrs_assemblies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('vmrs_system_id').notNullable().references('id').inTable('vmrs_systems').onDelete('CASCADE');
    table.string('code', 3).notNullable(); // e.g., '001'
    table.string('description').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.unique(['vmrs_system_id', 'code']);
  });

  // Code 33: Component
  await knex.schema.createTable('vmrs_components', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('vmrs_assembly_id').notNullable().references('id').inTable('vmrs_assemblies').onDelete('CASCADE');
    table.string('code', 3).notNullable(); // e.g., '015'
    table.string('description').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.unique(['vmrs_assembly_id', 'code']);
  });

  // Code 18: Failure Code
  await knex.schema.createTable('vmrs_failure_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 2).notNullable().unique();
    table.string('description').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // ==========================================
  // 3. ASSETS & HIERARCHY
  // ==========================================
  await knex.schema.createTable('asset_models', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('manufacturer').notNullable();
    table.string('model_number').notNullable();
    table.integer('model_year');
    table.string('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('assets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('parent_asset_id').references('id').inTable('assets').onDelete('SET NULL');
    table.uuid('asset_model_id').references('id').inTable('asset_models').onDelete('RESTRICT');
    table.uuid('vmrs_system_id').references('id').inTable('vmrs_systems'); // Top-level classification
    table.string('asset_tag').notNullable().unique(); // "BUSS-101"
    table.string('serial_number'); // VIN or specific component SN
    table.string('vin', 17);
    table.string('status', 50).defaultTo('AVAILABLE'); // IN_SHOP, AVAILABLE, DOWN
    table.string('home_depot_id').references('id').inTable('depots').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.timestamp('deleted_at');
  });

  // ==========================================
  // 4. INVENTORY, VENDORS & BOM
  // ==========================================
  await knex.schema.createTable('parts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('part_number').notNullable().unique();
    table.string('description').notNullable();
    table.string('default_uom').defaultTo('EACH');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('part_cross_references', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('primary_part_id').notNullable().references('id').inTable('parts').onDelete('CASCADE');
    table.uuid('related_part_id').notNullable().references('id').inTable('parts').onDelete('CASCADE');
    table.string('relationship_type').notNullable(); // INTERCHANGEABLE, SUPERSEDES, SUPERSEDED_BY
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('vendors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('part_vendors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('part_id').notNullable().references('id').inTable('parts').onDelete('CASCADE');
    table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('CASCADE');
    table.string('vendor_part_number');
    table.boolean('is_oem').defaultTo(false);
    table.integer('lead_time_days');
    table.timestamps(true, true);
    table.unique(['part_id', 'vendor_id']);
  });

  await knex.schema.createTable('asset_model_boms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('asset_model_id').notNullable().references('id').inTable('asset_models').onDelete('CASCADE');
    table.uuid('part_id').notNullable().references('id').inTable('parts').onDelete('RESTRICT');
    table.uuid('vmrs_component_id').references('id').inTable('vmrs_components');
    table.decimal('quantity', 10, 2).defaultTo(1.0);
    table.timestamps(true, true);
  });

  // Multi-site Inventory Support
  await knex.schema.createTable('inventory_levels', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('part_id').notNullable().references('id').inTable('parts').onDelete('CASCADE');
    table.string('depot_id').notNullable().references('id').inTable('depots').onDelete('CASCADE');
    table.integer('quantity_on_hand').defaultTo(0);
    table.integer('reorder_point').defaultTo(0);
    table.timestamps(true, true);
    table.unique(['part_id', 'depot_id']);
  });

  // ==========================================
  // 5. PREVENTIVE MAINTENANCE (PM)
  // ==========================================
  await knex.schema.createTable('meters', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE');
    table.string('meter_name', 50).notNullable(); // KILOMETERS, ENGINE_HOURS
    table.decimal('current_reading', 15, 2).defaultTo(0.0);
    table.string('uom', 20).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['asset_id', 'meter_name']);
  });

  await knex.schema.createTable('pm_schedules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('asset_id').references('id').inTable('assets').onDelete('CASCADE'); 
    table.uuid('asset_model_id').references('id').inTable('asset_models').onDelete('CASCADE'); 
    // Either asset_id or asset_model_id should be populated
    table.string('title').notNullable(); // 'Heavy Service - Class A'
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('pm_triggers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('pm_schedule_id').notNullable().references('id').inTable('pm_schedules').onDelete('CASCADE');
    table.string('trigger_type').notNullable(); // CALENDAR, USAGE_METER
    table.string('meter_name', 50); // Nullable if CALENDAR
    table.decimal('interval_value', 15, 2).notNullable();
    table.string('interval_uom', 20).notNullable(); // KILOMETERS, MONTHS
    table.decimal('last_triggered_reading', 15, 2);
    table.timestamp('last_triggered_date');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ==========================================
  // 6. WORK ORDERS (WO)
  // ==========================================
  // Work orders and lines are handled in the subsequent CMMS migration
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse order
  await knex.schema.dropTableIfExists('pm_triggers');
  await knex.schema.dropTableIfExists('pm_schedules');
  await knex.schema.dropTableIfExists('meters');
  await knex.schema.dropTableIfExists('inventory_levels');
  await knex.schema.dropTableIfExists('asset_model_boms');
  await knex.schema.dropTableIfExists('part_vendors');
  await knex.schema.dropTableIfExists('vendors');
  await knex.schema.dropTableIfExists('part_cross_references');
  await knex.schema.dropTableIfExists('parts');
  await knex.schema.dropTableIfExists('assets');
  await knex.schema.dropTableIfExists('asset_models');
  await knex.schema.dropTableIfExists('vmrs_failure_codes');
  await knex.schema.dropTableIfExists('vmrs_components');
  await knex.schema.dropTableIfExists('vmrs_assemblies');
  await knex.schema.dropTableIfExists('vmrs_systems');
  await knex.schema.dropTableIfExists('depot_points');
  await knex.schema.dropTableIfExists('depots');
}
