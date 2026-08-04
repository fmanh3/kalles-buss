import type { Knex } from "knex";
/**
 * 007_hr_sick_leave.js
 *
 * SickLeaveCase (Aggregate)           – Artikel 6, LEVEL_2+
 * SickLeaveMedicalRecord (Aggregate)  – ARTIKEL 9, LEVEL_4+
 *
 * Strikt separation: SickLeaveCase innehåller ENBART administrativ data
 * (datum, kompensationstyp, lönepåverkan, FK-ärendedata utan diagnos).
 * Medicinsk data (läkarintyg, diagnoser, rehabplan) bor i
 * sick_leave_medical_records och krypteras med healthDEK.
 *
 * De skapas alltid parvis – en SickLeaveCase har alltid exakt ett
 * SickLeaveMedicalRecord (även om det till en början är tomt).
 */

export async function up(knex: Knex): Promise<void> {

  // ── SickLeaveMedicalRecord ────────────────────────────────────────────────
  // Skapas FÖRE SickLeaveCase för att FK ska kunna sättas direkt.

  await knex.schema.createTable('sick_leave_medical_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('employee_id').notNullable().references('id').inTable('employees')
    // sick_leave_case_id läggs som FK efter sick_leave_cases skapats
    t.timestamps(true, true)
  })

  // ── SickLeaveCase ─────────────────────────────────────────────────────────

  await knex.schema.createTable('sick_leave_cases', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('employee_id').notNullable().references('id').inTable('employees')
    t.timestamp('reported_at').notNullable().defaultTo(knex.fn.now())
    t.date('start_date').notNullable()
    t.date('end_date').nullable()
    t.date('expected_return_date').nullable()

    t.string('status', 30).notNullable().defaultTo('REPORTED')
    t.check(
      `status IN ('REPORTED','ONGOING','AWAITING_CERTIFICATE','ON_REHAB',
                  'CLOSED_RETURNED','CLOSED_TERMINATED')`
    )

    // FKIntegration – administrativ FK-data, ej medicinsk
    // sgi_amount är ekonomisk uppgift (pensionsgrundande), ej hälsodata
    t.string('fk_case_number', 50).nullable()
    t.decimal('fk_compensation_rate', 5, 2).nullable()   // sjukpenningnivå i %
    t.decimal('fk_sgi_amount', 10, 2).nullable()
    t.string('fk_sgi_currency', 3).nullable().defaultTo('SEK')
    t.date('fk_notified_date').nullable()
    t.date('fk_reply_date').nullable()

    // Referens till medicinsk del – aldrig innehållet
    t.uuid('medical_record_id').notNullable()
      .references('id').inTable('sick_leave_medical_records')

    // created_by kan vara ett employeeId (UUID) eller strängen 'SYSTEM'
    t.string('created_by', 36).notNullable().defaultTo('SYSTEM')

    t.timestamps(true, true)
  })

  // Sätt omvänd FK: medical_records → sick_leave_cases
  await knex.schema.alterTable('sick_leave_medical_records', (t) => {
    t.uuid('sick_leave_case_id').notNullable()
      .references('id').inTable('sick_leave_cases')
      .unique()   // 1:1
  })

  await knex.schema.raw(`
    CREATE INDEX idx_slc_employee    ON sick_leave_cases (employee_id);
    CREATE INDEX idx_slc_status      ON sick_leave_cases (status);
    CREATE INDEX idx_slc_start_date  ON sick_leave_cases (start_date);
    CREATE INDEX idx_slmr_employee   ON sick_leave_medical_records (employee_id);
  `)

  // ── SickDay ───────────────────────────────────────────────────────────────
  // Artikel 6 – datum + kompensationstyp + lönepåverkan.
  // Ingen medicinsk information.

  await knex.schema.createTable('sick_days', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('sick_leave_case_id').notNullable()
      .references('id').inTable('sick_leave_cases').onDelete('CASCADE')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.date('date').notNullable()
    t.string('type', 20).notNullable()
    t.check(`type IN ('FULL_DAY','PARTIAL_DAY')`)
    t.decimal('hours_absent', 4, 2).notNullable()
    t.string('compensation_type', 30).notNullable()
    t.check(
      `compensation_type IN ('KARENS_DEDUCTION','SICK_PAY_80PCT',
                             'FK_SJUKPENNING','EMPLOYER_SUPPLEMENT','NO_DEDUCTION')`
    )
    t.decimal('pay_impact_amount', 10, 2).notNullable()
    t.string('pay_impact_currency', 3).notNullable().defaultTo('SEK')

    t.unique(['sick_leave_case_id', 'date'])
  })

  await knex.schema.raw(`
    CREATE INDEX idx_sd_case     ON sick_days (sick_leave_case_id);
    CREATE INDEX idx_sd_employee ON sick_days (employee_id);
    CREATE INDEX idx_sd_date     ON sick_days (date);
  `)

  // ── MedicalCertificate ────────────────────────────────────────────────────
  // ARTIKEL 9 – krypterat med healthDEK.
  // Läkarintyg i PDF/bild lagras i separat krypterat objektlager.

  await knex.schema.createTable('medical_certificates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('medical_record_id').notNullable()
      .references('id').inTable('sick_leave_medical_records')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.date('from_date').notNullable()
    t.date('to_date').notNullable()
    t.integer('degree_of_sick').notNullable()  // 25 | 50 | 75 | 100
    t.check(`degree_of_sick IN (25, 50, 75, 100)`)

    // Artikel 9-fält – krypterade med healthDEK
    t.text('issued_by_encrypted').notNullable()      // läkare/klinik
    t.date('issued_date').notNullable()               // datum är OK oklassifierat
    t.date('received_date').notNullable()
    t.text('diagnosis_code_encrypted').nullable()     // ICD-10

    // EncryptedDocumentRef – Artikel 9, separat objektlager med strängare ACL
    t.string('document_storage_id').nullable()
    t.string('document_encryption_key_id').nullable()
    t.string('document_mime_type').nullable()

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  })

  await knex.schema.raw(`
    CREATE INDEX idx_mc_medical_record ON medical_certificates (medical_record_id);
    CREATE INDEX idx_mc_employee       ON medical_certificates (employee_id);
    CREATE INDEX idx_mc_dates          ON medical_certificates (from_date, to_date);
  `)

  // ── RehabPlan ─────────────────────────────────────────────────────────────
  // ARTIKEL 9 – krypterat med healthDEK.

  await knex.schema.createTable('rehab_plans', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('medical_record_id').notNullable().unique()
      .references('id').inTable('sick_leave_medical_records')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.date('start_date').notNullable()
    t.uuid('coordinator_employee_id').notNullable().references('id').inTable('employees')
    t.date('return_date').nullable()
    t.string('outcome', 20).nullable()
    t.check(`outcome IS NULL OR outcome IN ('RETURNED','EXTENDED','TERMINATED')`)
    t.text('notes_encrypted').nullable()   // healthDEK – kan innehålla medicinsk info

    t.timestamps(true, true)
  })

  await knex.schema.createTable('rehab_steps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('rehab_plan_id').notNullable()
      .references('id').inTable('rehab_plans').onDelete('CASCADE')
    t.integer('step_order').notNullable()
    t.text('description_encrypted').notNullable()   // healthDEK
    t.date('target_date').notNullable()
    t.date('completed_at').nullable()
  })

  await knex.schema.raw(`
    CREATE INDEX idx_rp_employee  ON rehab_plans (employee_id);
    CREATE INDEX idx_rp_return    ON rehab_plans (return_date);
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rehab_steps')
  await knex.schema.dropTableIfExists('rehab_plans')
  await knex.schema.dropTableIfExists('medical_certificates')
  await knex.schema.dropTableIfExists('sick_days')
  await knex.schema.alterTable('sick_leave_medical_records', (t) => {
    t.dropForeign(['sick_leave_case_id'])
    t.dropColumn('sick_leave_case_id')
  })
  await knex.schema.dropTableIfExists('sick_leave_cases')
  await knex.schema.dropTableIfExists('sick_leave_medical_records')
}
