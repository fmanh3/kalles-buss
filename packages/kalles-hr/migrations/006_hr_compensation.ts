import type { Knex } from "knex";
/**
 * 006_hr_compensation.js
 *
 * CompensationRecord (Aggregate, per löneperiod)
 * Artikel 6 – åtkomst LEVEL_2+
 *
 * Lönerader, avdrag, pensionsavsättningar och skatteuträkning krypteras
 * med personalDEK och lagras som krypterade JSON-blobbar.
 *
 * gross_pay lagras i klartext (Money-värde utan personkoppling är ok)
 * för att möjliggöra aggregerade kostnadsvyer utan dekryptering.
 *
 * Payroll-domänen får ALDRIG direktåtkomst till denna tabell.
 * Export sker via PayrollDataExportReady-event + dedikerat export-API
 * som returnerar ett minimerat, ändamålsanpassat dataset.
 */

export async function up(knex: Knex): Promise<void> {

  await knex.schema.createTable('compensation_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('employee_id').notNullable().references('id').inTable('employees')
    t.uuid('contract_id').notNullable().references('id').inTable('employment_contracts')
    t.uuid('work_record_id').notNullable()
      .references('id').inTable('work_records')

    t.integer('period_year').notNullable()
    t.integer('period_month').notNullable()

    // Krypterade med personalDEK – [ARTIKEL_6]
    t.text('pay_lines_encrypted').notNullable()         // PayLine[] som JSON
    t.text('deductions_encrypted').notNullable()        // Deduction[] som JSON
    t.text('pension_contributions_encrypted').notNullable()
    t.text('tax_calculation_encrypted').notNullable()

    // Bruttolön i klartext – tillåter aggregering utan dekryptering
    t.decimal('gross_pay_amount', 10, 2).notNullable()
    t.string('gross_pay_currency', 3).notNullable().defaultTo('SEK')

    t.string('status', 30).notNullable().defaultTo('DRAFT')
    t.check(`status IN ('DRAFT','PENDING_APPROVAL','APPROVED','EXPORTED','PAID')`)

    t.uuid('approved_by_employee_id').nullable().references('id').inTable('employees')
    t.timestamp('exported_at').nullable()
    t.string('export_ref', 100).nullable()

    t.timestamps(true, true)
    t.unique(['employee_id', 'period_year', 'period_month'])
  })

  await knex.schema.raw(`
    CREATE INDEX idx_comp_employee ON compensation_records (employee_id);
    CREATE INDEX idx_comp_period   ON compensation_records (period_year, period_month);
    CREATE INDEX idx_comp_status   ON compensation_records (status);
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('compensation_records')
}
