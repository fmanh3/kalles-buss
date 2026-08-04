import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ==========================================
  // 1. UNIT OF MEASURE (UoM) Normalization
  // ==========================================
  await knex.schema.createTable('unit_of_measures', (table) => {
    table.string('code', 20).primary(); // e.g. 'KM', 'HOURS', 'EACH', 'LITERS'
    table.string('description').notNullable();
  });

  // Seed default UoMs
  await knex('unit_of_measures').insert([
    { code: 'EACH', description: 'Styck (St)' },
    { code: 'KM', description: 'Kilometers' },
    { code: 'HOURS', description: 'Hours (Timmar)' },
    { code: 'LITERS', description: 'Liters' },
    { code: 'MONTHS', description: 'Months (Månader)' }
  ]);

  // Update existing tables to use the foreign key.
  await knex.schema.alterTable('parts', (table) => {
    table.dropColumn('default_uom');
  });
  await knex.schema.alterTable('parts', (table) => {
    table.string('uom_code', 20).defaultTo('EACH').references('code').inTable('unit_of_measures').onDelete('RESTRICT');
  });

  await knex.schema.alterTable('meters', (table) => {
    table.dropColumn('uom');
  });
  await knex.schema.alterTable('meters', (table) => {
    table.string('uom_code', 20).notNullable().defaultTo('KM').references('code').inTable('unit_of_measures').onDelete('RESTRICT');
  });

  await knex.schema.alterTable('pm_triggers', (table) => {
    table.dropColumn('interval_uom');
  });
  await knex.schema.alterTable('pm_triggers', (table) => {
    table.string('interval_uom_code', 20).notNullable().defaultTo('KM').references('code').inTable('unit_of_measures').onDelete('RESTRICT');
  });

  // ==========================================
  // 2. VMRS CODE CATEGORIZATION
  // ==========================================
  await knex.schema.alterTable('vmrs_failure_codes', (table) => {
    table.string('code_type', 20).notNullable().defaultTo('FAILURE'); // REASON, ACCOMPLISHED, FAILURE
  });

  // ==========================================
  // 3. DYNAMIC WARRANTY FLAGS (Removing the 365 magic number)
  // ==========================================
  await knex.schema.alterTable('parts', (table) => {
    table.integer('default_warranty_days').defaultTo(365); // Each part defines its own warranty span
  });

  // Re-create the View to utilize the dynamic warranty days
  await knex.raw(`DROP VIEW IF EXISTS potential_warranty_flags;`);
  
  await knex.raw(`
    CREATE VIEW potential_warranty_flags AS
    WITH recent_repairs AS (
        SELECT 
            wo.asset_id,
            wol.vmrs_system_id,
            wop.part_id,
            wo.actual_end AS completed_at,
            wol.id AS historical_line_id
        FROM work_orders wo
        JOIN work_order_lines wol ON wo.id = wol.work_order_id
        JOIN work_order_parts wop ON wol.id = wop.wo_line_id
        WHERE wo.status = 'CLOSED' 
          AND wol.vmrs_system_id IS NOT NULL
          -- In production, add: AND wol.vmrs_work_accomplished_id = (SELECT id FROM vmrs_failure_codes WHERE code='03' AND code_type='ACCOMPLISHED')
    )
    SELECT 
        wo_current.id AS current_work_order_id,
        wol_current.id AS current_line_id,
        wo_current.asset_id,
        wol_current.vmrs_system_id,
        rr.historical_line_id,
        rr.completed_at AS last_replaced_date,
        p.default_warranty_days AS warranty_duration_days,
        
        EXTRACT(DAY FROM (NOW() - rr.completed_at)) AS days_since_last_repair
        
    FROM work_orders wo_current
    JOIN work_order_lines wol_current ON wo_current.id = wol_current.work_order_id
    JOIN recent_repairs rr 
      ON wo_current.asset_id = rr.asset_id 
      AND wol_current.vmrs_system_id = rr.vmrs_system_id
    JOIN parts p ON rr.part_id = p.id
    WHERE wo_current.status NOT IN ('CLOSED', 'CANCELED')
      AND rr.historical_line_id != wol_current.id
      -- DYNAMIC CHECK: Is the time since last repair less than the part's specific warranty?
      AND EXTRACT(DAY FROM (NOW() - rr.completed_at)) <= p.default_warranty_days;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP VIEW IF EXISTS potential_warranty_flags;`);
  
  await knex.schema.alterTable('parts', (table) => {
    table.dropColumn('default_warranty_days');
    table.dropColumn('uom_code');
    table.string('default_uom').defaultTo('EACH');
  });

  await knex.schema.alterTable('vmrs_failure_codes', (table) => {
    table.dropColumn('code_type');
  });

  await knex.schema.alterTable('meters', (table) => {
    table.dropColumn('uom_code');
    table.string('uom').notNullable().defaultTo('KM');
  });

  await knex.schema.alterTable('pm_triggers', (table) => {
    table.dropColumn('interval_uom_code');
    table.string('interval_uom').notNullable().defaultTo('KM');
  });

  await knex.schema.dropTableIfExists('unit_of_measures');
}
