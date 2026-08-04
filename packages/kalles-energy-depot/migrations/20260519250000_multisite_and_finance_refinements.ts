import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ==========================================
  // 1. COST CENTERS (CFO Integration)
  // ==========================================
  await knex.schema.createTable('cost_centers', (table) => {
    table.string('code', 50).primary(); // e.g. 'CC-NTA-MAINT'
    table.string('name').notNullable(); // e.g. 'Norrtälje Maintenance'
    table.string('depot_id').references('id').inTable('depots').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Attach Cost Centers to existing tables
  await knex.schema.alterTable('work_orders', (table) => {
    table.string('cost_center_code').references('code').inTable('cost_centers');
  });

  // ==========================================
  // 2. ASSET LOCATIONS (Current vs Home)
  // ==========================================
  await knex.schema.alterTable('assets', (table) => {
    // We already have 'home_depot_id'. Now we add where it physically is right now.
    table.string('current_depot_id').references('id').inTable('depots').onDelete('SET NULL');
  });

  // ==========================================
  // 3. USERS & SITE PERMISSIONS
  // ==========================================
  await knex.schema.alterTable('users', (table) => {
    table.string('home_depot_id').references('id').inTable('depots').onDelete('SET NULL');
    table.string('current_active_depot_id').references('id').inTable('depots').onDelete('SET NULL');
  });

  // Many-to-Many table for Depot Permissions
  await knex.schema.createTable('user_depots', (table) => {
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('depot_id').notNullable().references('id').inTable('depots').onDelete('CASCADE');
    table.timestamps(true, true);
    table.unique(['user_id', 'depot_id']);
  });

  // ==========================================
  // 4. INVENTORY IN-TRANSIT (TRANSFERS)
  // ==========================================
  // To safely handle transfers between sites without losing parts if the truck crashes.
  await knex.schema.createTable('inventory_transfers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('transfer_number', 50).unique().notNullable(); // 'TRF-2026-001'
    
    table.uuid('part_id').notNullable().references('id').inTable('parts').onDelete('RESTRICT');
    table.integer('quantity').notNullable();
    
    table.uuid('from_location_id').notNullable().references('id').inTable('inventory_locations').onDelete('RESTRICT');
    table.uuid('to_location_id').notNullable().references('id').inTable('inventory_locations').onDelete('RESTRICT');
    
    table.string('status', 50).defaultTo('IN_TRANSIT'); // IN_TRANSIT, COMPLETED, CANCELLED, LOST
    
    table.uuid('shipped_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('shipped_at').notNullable().defaultTo(knex.fn.now());
    
    table.uuid('received_by').references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('received_at');
    
    table.timestamps(true, true);
  });

  // Add a specific IN_TRANSIT transaction type to the ledger types
  await knex('inventory_transaction_types').insert([
    { code: 'TRANSFER_OUT', description: 'Skickad till annan ort', multiplier: -1 },
    { code: 'TRANSFER_IN', description: 'Mottagen från annan ort', multiplier: 1 },
    { code: 'TRANSFER_LOST', description: 'Förlorad under transport', multiplier: -1 } // Only applied to the virtual transit bin if tracked there
  ]);
  
  // To handle the view correctly, 'IN_TRANSIT' inventory should technically exist in a virtual location.
  // The service logic will:
  // 1. TRANSFER_OUT from 'Norrtälje Bin A'
  // 2. TRANSFER_IN to 'Virtual Transit Bin'
  // 3. When received: TRANSFER_OUT from 'Virtual Transit Bin' and TRANSFER_IN to 'Rimbo Bin B'.
}

export async function down(knex: Knex): Promise<void> {
  await knex('inventory_transaction_types').whereIn('code', ['TRANSFER_OUT', 'TRANSFER_IN', 'TRANSFER_LOST']).del();
  await knex.schema.dropTableIfExists('inventory_transfers');
  await knex.schema.dropTableIfExists('user_depots');
  
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('current_active_depot_id');
    table.dropColumn('home_depot_id');
  });

  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('current_depot_id');
  });

  await knex.schema.alterTable('work_orders', (table) => {
    table.dropColumn('cost_center_code');
  });
  
  await knex.schema.dropTableIfExists('cost_centers');
}
