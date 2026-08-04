import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Users/Technicians
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('role', 50).defaultTo('TECHNICIAN');
    table.boolean('is_active').defaultTo(true);
  });

  // Re-create refined defects
  await knex.schema.createTable('defects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('asset_id').references('id').inTable('assets').onDelete('CASCADE');
    table.string('reported_by').notNullable();
    table.string('description').notNullable();
    table.integer('severity_level').defaultTo(1);
    table.string('status').defaultTo('OPEN');
    table.timestamps(true, true);
  });

  // 2. The Work Order Header
  await knex.schema.createTable('work_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('work_order_number', 50).notNullable().unique(); // 'WO-2026-0520-001'
    table.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('RESTRICT');
    table.string('depot_id').notNullable().references('id').inTable('depots').onDelete('RESTRICT'); 
    table.uuid('pm_schedule_id').references('id').inTable('pm_schedules').onDelete('SET NULL');
    table.uuid('defect_id').references('id').inTable('defects').onDelete('SET NULL');
    
    table.string('status', 50).defaultTo('OPEN'); 
    table.string('priority', 20).defaultTo('NORMAL'); 
    table.text('reported_issue');
    
    table.timestamp('scheduled_start');
    table.timestamp('actual_start');
    table.timestamp('actual_end');
    
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });

  // 3. Work Order Meters (Crucial for History/Warranties)
  await knex.schema.createTable('work_order_meters', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('work_order_id').notNullable().references('id').inTable('work_orders').onDelete('CASCADE');
    table.string('meter_type', 50).notNullable(); // e.g. ODOMETER_KM
    table.decimal('meter_value', 10, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['work_order_id', 'meter_type']);
  });

  // 4. Work Order Tasks (Lines)
  await knex.schema.createTable('work_order_lines', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('work_order_id').notNullable().references('id').inTable('work_orders').onDelete('CASCADE');
    table.integer('task_number').notNullable();
    table.text('description').notNullable();
    
    // VMRS Coding
    table.uuid('vmrs_system_id').references('id').inTable('vmrs_systems');
    table.uuid('vmrs_assembly_id').references('id').inTable('vmrs_assemblies');
    table.uuid('vmrs_component_id').references('id').inTable('vmrs_components');
    
    table.uuid('vmrs_reason_for_repair_id').references('id').inTable('vmrs_failure_codes');
    table.uuid('vmrs_work_accomplished_id').references('id').inTable('vmrs_failure_codes');
    table.uuid('vmrs_failure_code_id').references('id').inTable('vmrs_failure_codes');
    
    table.string('status', 50).defaultTo('PENDING'); // PENDING, COMPLETED, CANCELLED
    table.timestamps(true, true);
    table.unique(['work_order_id', 'task_number']);
  });

  // 5. Labor Tracking
  await knex.schema.createTable('work_order_labor', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('wo_line_id').notNullable().references('id').inTable('work_order_lines').onDelete('CASCADE');
    table.uuid('technician_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time');
    table.decimal('regular_hours', 5, 2);
    table.decimal('overtime_hours', 5, 2).defaultTo(0);
    table.decimal('labor_rate', 10, 2); // Immutable cost snapshot
    
    table.text('description'); // e.g. "Fick värma loss bulten med gas"
    table.timestamps(true, true);
  });

  // 6. Parts Consumption
  await knex.schema.createTable('work_order_parts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('wo_line_id').notNullable().references('id').inTable('work_order_lines').onDelete('CASCADE');
    table.uuid('part_id').notNullable().references('id').inTable('parts').onDelete('RESTRICT');
    
    table.decimal('quantity_required', 10, 2).defaultTo(1);
    table.decimal('quantity_used', 10, 2).defaultTo(0);
    
    table.decimal('unit_cost', 10, 2); // What it cost us (inventory value snapshot)
    table.decimal('price_charged', 10, 2); // What we charge the customer/insurance
    
    table.boolean('is_issued').defaultTo(false); // Physically removed from inventory
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('work_order_parts');
  await knex.schema.dropTableIfExists('work_order_labor');
  await knex.schema.dropTableIfExists('work_order_lines');
  await knex.schema.dropTableIfExists('work_order_meters');
  await knex.schema.dropTableIfExists('work_orders');
  await knex.schema.dropTableIfExists('defects');
  await knex.schema.dropTableIfExists('users');
}
