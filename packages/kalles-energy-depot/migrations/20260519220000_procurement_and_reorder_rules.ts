import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. LAGERREGLER (Stock Rules)
  await knex.schema.createTable('inventory_stock_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('part_id').notNullable().references('id').inTable('parts').onDelete('CASCADE');
    table.uuid('location_id').notNullable().references('id').inTable('inventory_locations').onDelete('CASCADE');
    
    table.integer('min_stock_level').notNullable().defaultTo(0);
    table.integer('max_stock_level');
    table.integer('standard_reorder_qty').defaultTo(1);
    table.integer('lead_time_days').defaultTo(1);
    
    table.timestamps(true, true);
    table.unique(['part_id', 'location_id']);
  });

  // 2. INKÖPSORDRAR (Purchase Orders)
  await knex.schema.createTable('purchase_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('po_number', 50).notNullable().unique();
    table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('RESTRICT');
    
    table.string('status', 50).defaultTo('DRAFT'); // DRAFT, ISSUED, PARTIALLY_RECEIVED, COMPLETED, CANCELLED
    table.uuid('shipping_location_id').references('id').inTable('inventory_locations').onDelete('RESTRICT');
    table.date('expected_delivery_date');
    
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });

  // 3. INKÖPSORDERRADER (PO Lines)
  await knex.schema.createTable('purchase_order_lines', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('purchase_order_id').notNullable().references('id').inTable('purchase_orders').onDelete('CASCADE');
    table.uuid('part_id').notNullable().references('id').inTable('parts').onDelete('RESTRICT');
    
    table.string('vendor_part_number', 100);
    table.integer('quantity_ordered').notNullable();
    table.integer('quantity_received').defaultTo(0);
    table.decimal('unit_price', 10, 2);
    
    table.timestamps(true, true);
  });

  // 4. Update Ledger with PO reference
  // We already added 'purchase_order_id' as a UUID column in the ledger in the previous migration, 
  // but now we can add the strict foreign key since the PO table exists.
  // Note: Skipping strict FK for 'purchase_order_id' on 'inventory_transactions' for now to keep migration simple and avoid circular dependency complexities, 
  // but the column exists and the Node service can write to it.

  // 5. REORDER SUGGESTIONS VIEW
  await knex.raw(`
    CREATE VIEW reorder_suggestions AS
    SELECT 
        p.part_number,
        p.description,
        l.code AS location_code,
        isr.min_stock_level,
        COALESCE(cib.current_quantity, 0) AS quantity_on_hand,
        
        -- Räkna ut hur många vi redan har väntande på aktiva inköpsordrar
        COALESCE((
            SELECT SUM(pol.quantity_ordered - pol.quantity_received)
            FROM purchase_order_lines pol
            JOIN purchase_orders po ON pol.purchase_order_id = po.id
            WHERE pol.part_id = isr.part_id 
              AND po.status IN ('ISSUED', 'PARTIALLY_RECEIVED')
              AND po.shipping_location_id = isr.location_id
        ), 0) AS quantity_on_order,
        
        -- Beräkna om vi ligger under gränsen
        (COALESCE(cib.current_quantity, 0) + 
         COALESCE((
            SELECT SUM(pol.quantity_ordered - pol.quantity_received)
            FROM purchase_order_lines pol
            JOIN purchase_orders po ON pol.purchase_order_id = po.id
            WHERE pol.part_id = isr.part_id 
              AND po.status IN ('ISSUED', 'PARTIALLY_RECEIVED')
              AND po.shipping_location_id = isr.location_id
         ), 0)
        ) <= isr.min_stock_level AS needs_reorder,
        
        -- Föreslå hur många som bör köpas utifrån MAX-nivå
        (isr.max_stock_level - COALESCE(cib.current_quantity, 0)) AS suggested_order_qty,
        
        isr.lead_time_days
        
    FROM inventory_stock_rules isr
    JOIN parts p ON isr.part_id = p.id
    JOIN inventory_locations l ON isr.location_id = l.id
    LEFT JOIN current_inventory_balances cib 
           ON isr.part_id = cib.part_id AND isr.location_id = cib.location_id;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP VIEW IF EXISTS reorder_suggestions;`);
  await knex.schema.dropTableIfExists('purchase_order_lines');
  await knex.schema.dropTableIfExists('purchase_orders');
  await knex.schema.dropTableIfExists('inventory_stock_rules');
}
