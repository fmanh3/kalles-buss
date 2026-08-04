import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. LAGERPLATSER (Locations / Bins)
  await knex.schema.createTable('inventory_locations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('depot_id').notNullable().references('id').inTable('depots').onDelete('CASCADE');
    table.string('code', 50).notNullable().unique();
    table.string('description').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 2. TRANSAKTIONSTYPER
  await knex.schema.createTable('inventory_transaction_types', (table) => {
    table.string('code', 50).primary();
    table.string('description').notNullable();
    table.integer('multiplier').notNullable();
  });

  await knex('inventory_transaction_types').insert([
    { code: 'PO_RECEIPT', description: 'Mottagen leverans från inköpsorder', multiplier: 1 },
    { code: 'WO_ISSUE', description: 'Uttagen för Arbetsorder', multiplier: -1 },
    { code: 'WO_RETURN', description: 'Återlämnad från Arbetsorder', multiplier: 1 },
    { code: 'ADJUSTMENT', description: 'Manuell justering (Inventering)', multiplier: 1 },
    { code: 'TRANSFER', description: 'Flytt mellan lagerplatser', multiplier: 0 }
  ]);

  // 3. THE LEDGER (Själva transaktionsloggen)
  // NO TRIGGERS! The backend node service will append to this explicitly.
  await knex.schema.createTable('inventory_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('part_id').notNullable().references('id').inTable('parts').onDelete('RESTRICT');
    table.uuid('location_id').notNullable().references('id').inTable('inventory_locations').onDelete('RESTRICT');
    table.string('transaction_type').notNullable().references('code').inTable('inventory_transaction_types');
    
    table.decimal('quantity', 10, 2).notNullable();
    table.decimal('unit_cost', 15, 2);
    
    table.uuid('work_order_id').references('id').inTable('work_orders').onDelete('SET NULL');
    // Future PO Reference handled in the next migration
    table.string('reference_document', 100);
    
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 4. CURRENT BALANCE VIEW
  await knex.raw(`
    CREATE VIEW current_inventory_balances AS
    SELECT 
        it.part_id,
        it.location_id,
        SUM(it.quantity * typ.multiplier) AS current_quantity
    FROM 
        inventory_transactions it
    JOIN 
        inventory_transaction_types typ ON it.transaction_type = typ.code
    GROUP BY 
        it.part_id, it.location_id;
  `);

  await knex.schema.dropTableIfExists('inventory_levels');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP VIEW IF EXISTS current_inventory_balances;`);
  
  await knex.schema.dropTableIfExists('inventory_transactions');
  await knex.schema.dropTableIfExists('inventory_transaction_types');
  await knex.schema.dropTableIfExists('inventory_locations');

  // Recreate the flat table if rolled back
  await knex.schema.createTable('inventory_levels', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('part_id').notNullable().references('id').inTable('parts').onDelete('CASCADE');
    table.string('depot_id').notNullable().references('id').inTable('depots').onDelete('CASCADE');
    table.integer('quantity_on_hand').defaultTo(0);
    table.integer('reorder_point').defaultTo(0);
    table.timestamps(true, true);
    table.unique(['part_id', 'depot_id']);
  });
}