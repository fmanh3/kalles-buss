import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. GARANTIVILLKOR (Warranty Terms / Policies)
  await knex.schema.createTable('warranty_terms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('RESTRICT');
    table.string('name').notNullable(); // Ex: "Scania Standard Drivlina 36 mån / 300 000 km"
    
    table.integer('duration_months');
    table.decimal('max_meter_value', 15, 2);
    table.string('meter_type', 50); // e.g. 'ODOMETER_KM'
    
    table.boolean('covers_labor').defaultTo(false);
    table.boolean('covers_parts').defaultTo(true);
    
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 2. AKTIVA GARANTIER (Asset Warranties)
  await knex.schema.createTable('asset_warranties', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE');
    table.uuid('warranty_term_id').notNullable().references('id').inTable('warranty_terms').onDelete('RESTRICT');
    
    table.date('start_date').notNullable();
    table.decimal('start_meter_value', 15, 2).defaultTo(0);
    
    table.string('provider_reference_number', 100);
    
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 3. GARANTIANSORÅK (Warranty Claims)
  await knex.schema.createTable('warranty_claims', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('claim_number', 50).unique().notNullable(); // 'CLM-2026-001'
    table.uuid('wo_line_id').notNullable().references('id').inTable('work_order_lines').onDelete('RESTRICT');
    table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('RESTRICT');
    
    table.string('status', 50).defaultTo('DRAFT'); // DRAFT, SUBMITTED, APPROVED, REJECTED, PARTIALLY_PAID
    
    table.decimal('claimed_parts_amount', 15, 2).defaultTo(0);
    table.decimal('claimed_labor_amount', 15, 2).defaultTo(0);
    
    table.decimal('approved_parts_amount', 15, 2);
    table.decimal('approved_labor_amount', 15, 2);
    
    table.string('vendor_rma_number', 100);
    table.text('rejection_reason');
    
    table.timestamp('submitted_at');
    table.timestamp('resolved_at');
    table.timestamps(true, true);
  });

  // 4. THE AUTO-WARNING VIEW
  // Since we haven't seeded specific failure codes yet, we'll adapt the query to look at general replacements.
  // In our schema, we called them 'work_order_lines' instead of 'tasks'.
  
  await knex.raw(`
    CREATE VIEW potential_warranty_flags AS
    WITH recent_repairs AS (
        SELECT 
            wo.asset_id,
            wol.vmrs_system_id,
            wo.actual_end AS completed_at,
            wom.meter_value AS completed_meter_value,
            wol.id AS historical_line_id
        FROM work_orders wo
        JOIN work_order_lines wol ON wo.id = wol.work_order_id
        LEFT JOIN work_order_meters wom ON wo.id = wom.work_order_id AND wom.meter_type = 'ODOMETER_KM'
        WHERE wo.status = 'CLOSED' 
          AND wol.vmrs_system_id IS NOT NULL
          -- For demonstration, assuming any previous repair on the same VMRS system is a flag. 
          -- In production, filter by vmrs_work_accomplished_code = '03' (Replace).
    )
    SELECT 
        wo_current.id AS current_work_order_id,
        wol_current.id AS current_line_id,
        wo_current.asset_id,
        wol_current.vmrs_system_id,
        rr.historical_line_id,
        rr.completed_at AS last_replaced_date,
        
        EXTRACT(DAY FROM (NOW() - rr.completed_at)) AS days_since_last_repair
        
    FROM work_orders wo_current
    JOIN work_order_lines wol_current ON wo_current.id = wol_current.work_order_id
    JOIN recent_repairs rr 
      ON wo_current.asset_id = rr.asset_id 
      AND wol_current.vmrs_system_id = rr.vmrs_system_id
    WHERE wo_current.status NOT IN ('CLOSED', 'CANCELED')
      AND rr.historical_line_id != wol_current.id
      -- Warn if repaired within the last 365 days (General parts warranty)
      AND EXTRACT(DAY FROM (NOW() - rr.completed_at)) <= 365;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP VIEW IF EXISTS potential_warranty_flags;`);
  await knex.schema.dropTableIfExists('warranty_claims');
  await knex.schema.dropTableIfExists('asset_warranties');
  await knex.schema.dropTableIfExists('warranty_terms');
}
