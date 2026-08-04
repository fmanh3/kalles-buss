import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ==========================================
  // 1. ASSET DEPRECIATION (Financials)
  // ==========================================
  await knex.schema.alterTable('assets', (table) => {
    table.date('purchase_date');
    table.decimal('purchase_price', 15, 2);
    table.integer('expected_life_months');
    table.decimal('salvage_value', 15, 2).defaultTo(0); // Restvärde efter avskrivning
  });

  // ==========================================
  // 2. DEPOT SPACE RESERVATIONS (Logistics Tetris)
  // ==========================================
  // Allows Traffic or Depot agents to book physical space in the depot.
  await knex.schema.createTable('depot_point_reservations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('depot_point_id').notNullable().references('id').inTable('depot_points').onDelete('CASCADE');
    table.uuid('asset_id').references('id').inTable('assets').onDelete('CASCADE'); // E.g., The bus being washed
    table.uuid('work_order_id').references('id').inTable('work_orders').onDelete('CASCADE'); // Optional context
    
    table.timestamp('reserved_from').notNullable();
    table.timestamp('reserved_to').notNullable();
    
    table.string('status', 50).defaultTo('CONFIRMED'); // CONFIRMED, CANCELLED, FULFILLED
    table.timestamps(true, true);
    
    // Note: Overlap prevention logic (checking if times intersect) is usually best handled 
    // in the application code (Node.js) rather than strict DB constraints for flexibility,
    // though EXCLUDE USING gist constraints exist in Postgres.
  });

  // ==========================================
  // 3. RESOURCE CAPACITY (Sync from HR Domain)
  // ==========================================
  // A read-only replica (or local projection) of available work hours per depot.
  // Populated via async events from the HR Domain.
  await knex.schema.createTable('depot_capacity_roster', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('depot_id').notNullable().references('id').inTable('depots').onDelete('CASCADE');
    table.date('target_date').notNullable();
    table.string('skill_category', 100).notNullable(); // e.g. 'MECHANIC_HIGH_VOLTAGE', 'CLEANER'
    
    table.decimal('available_hours', 5, 2).notNullable().defaultTo(0);
    // HR is the source of truth. We just need to know how much time we can plan for.
    
    table.timestamps(true, true);
    table.unique(['depot_id', 'target_date', 'skill_category']);
  });

  // ==========================================
  // 4. DOCUMENTS & COMPLIANCE
  // ==========================================
  // To store external compliance certificates, inspection protocols, or WO photos.
  await knex.schema.createTable('asset_documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE');
    table.uuid('work_order_id').references('id').inTable('work_orders').onDelete('SET NULL'); // If generated during a WO
    
    table.string('document_type', 100).notNullable(); // e.g., 'INSPECTION_CERT', 'WARRANTY_DOC', 'DAMAGE_PHOTO'
    table.string('title').notNullable();
    table.string('file_url', 500).notNullable(); // Cloud storage link
    table.date('expiry_date'); // E.g., When the inspection cert expires
    
    table.uuid('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('asset_documents');
  await knex.schema.dropTableIfExists('depot_capacity_roster');
  await knex.schema.dropTableIfExists('depot_point_reservations');
  
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('salvage_value');
    table.dropColumn('expected_life_months');
    table.dropColumn('purchase_price');
    table.dropColumn('purchase_date');
  });
}
