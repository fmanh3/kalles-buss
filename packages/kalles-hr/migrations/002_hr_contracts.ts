import type { Knex } from "knex";
/**
 * 002_hr_contracts.js
 *
 * EmploymentContract (Aggregate) + ContractAmendment
 * Artikel 6 – åtkomst LEVEL_2+
 *
 * salary_terms_encrypted innehåller SalaryTerms som krypterad JSON:
 *   { salaryForm, baseAmount, currency, revisionDate, payDay, paymentMethod }
 *
 * CollectiveAgreement lagras som en code-referens mot collective_agreement_configs
 * (konfigurationstabell, se 009). WorkingHoursAgreement bäddas in som kolumner
 * eftersom den behöver vara sökbar (t.ex. "alla skiftarbetare").
 */

export async function up(knex: Knex): Promise<void> {

  await knex.schema.createTable('employment_contracts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.string('contract_type', 30).notNullable()
    t.check(`contract_type IN ('PERMANENT','HOURLY','SUBSTITUTE','APPRENTICE','PROBATION')`)

    t.date('start_date').notNullable()
    t.date('end_date').nullable()
    t.date('probation_end_date').nullable()
    t.integer('termination_notice_days').notNullable().defaultTo(30)

    // Kollektivavtal – referens till konfigurationstabell
    t.string('collective_agreement_code', 50).notNullable()
    // FK till collective_agreement_configs läggs i 009

    // WorkingHoursAgreement – inbäddade kolumner (sökbara)
    t.decimal('scheduled_weekly_hours', 5, 2).notNullable()
    t.string('work_pattern', 20).notNullable().defaultTo('SHIFT')
    t.check(`work_pattern IN ('FIXED','SHIFT','FLEXIBLE','ON_CALL')`)
    t.decimal('max_weekly_hours', 5, 2).notNullable().defaultTo(48)
    t.integer('averaging_period_weeks').notNullable().defaultTo(4)
    t.boolean('shift_allowance_eligible').notNullable().defaultTo(false)
    t.boolean('split_shift_eligible').notNullable().defaultTo(false)

    // SalaryTerms – krypterad JSON (personalDEK)
    t.text('salary_terms_encrypted').notNullable()

    // Benefits – JSONB-array, inga känsliga belopp (de finns i salary_terms)
    t.jsonb('benefits').notNullable().defaultTo('[]')
    // [{ type, provider, startDate, endDate }] – ej Money-värden

    t.boolean('is_current').notNullable().defaultTo(true)
    t.timestamps(true, true)
  })

  await knex.schema.raw(`
    CREATE INDEX idx_contracts_employee  ON employment_contracts (employee_id);
    CREATE INDEX idx_contracts_current   ON employment_contracts (employee_id, is_current)
      WHERE is_current = true;
    CREATE INDEX idx_contracts_type      ON employment_contracts (contract_type);
  `)

  // Sätt FK från employees.current_contract_id nu när tabellen finns
  await knex.schema.alterTable('employees', (t) => {
    t.foreign('current_contract_id')
      .references('id')
      .inTable('employment_contracts')
      .deferrable('deferred')  // undviker hönan-ägget vid INSERT
  })

  // ── Ändringslogg ──────────────────────────────────────────────────────────

  await knex.schema.createTable('contract_amendments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('contract_id').notNullable().references('id').inTable('employment_contracts')
    t.uuid('changed_by_employee_id').notNullable().references('id').inTable('employees')
    t.timestamp('changed_at').notNullable().defaultTo(knex.fn.now())
    t.text('reason').notNullable()
    // Snapshot av vad som ändrades, krypterat med personalDEK
    t.text('previous_data_encrypted').notNullable()
    t.text('updated_data_encrypted').notNullable()
  })

  await knex.schema.raw(`
    CREATE INDEX idx_amendments_contract ON contract_amendments (contract_id);
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('employees', (t) => {
    t.dropForeign(['current_contract_id'])
  })
  await knex.schema.dropTableIfExists('contract_amendments')
  await knex.schema.dropTableIfExists('employment_contracts')
}
