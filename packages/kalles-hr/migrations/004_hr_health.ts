import type { Knex } from "knex";
/**
 * 004_hr_health.js
 *
 * HealthRecord (Aggregate) – ARTIKEL 9, LEVEL_4+
 *
 * Alla kolumner med _encrypted krypteras med employeens healthDEK.
 * Dessa tabeller exponeras ALDRIG cross-domain.
 * Åtkomst loggas alltid i audit_events (se 008).
 *
 * När en HealthDeclaration registreras anropar en domänservice
 * QualificationProfile för att uppdatera health_eligibility_*
 * med enbart det operationella utfallet – utan att kopiera medicinsk data.
 */

export async function up(knex: Knex): Promise<void> {

  // ── HealthRecord ──────────────────────────────────────────────────────────
  // Aggregatrot för Artikel 9-hälsodata.
  // En rad per anställd – samlar alla hälsodeklarationer.

  await knex.schema.createTable('health_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('employee_id').notNullable().unique().references('id').inTable('employees')
    t.timestamps(true, true)
  })

  // FK från qualification_profiles.health_record_id
  await knex.schema.alterTable('qualification_profiles', (t) => {
    t.foreign('health_record_id').references('id').inTable('health_records')
  })

  // ── HealthDeclaration ─────────────────────────────────────────────────────
  // Krypterat med healthDEK.
  // outcome och restrictions är de känsliga fälten – alltid krypterade.
  // filed_date och valid_until används för att beräkna HealthEligibilityStatus
  // och kopieras i klartext till qualification_profiles av domänservice.

  await knex.schema.createTable('health_declarations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('health_record_id').notNullable()
      .references('id').inTable('health_records').onDelete('RESTRICT')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.string('type', 30).notNullable()
    t.check(`type IN ('INITIAL','PERIODIC_DRIVER','RETURN_FROM_SICK','SPECIFIC_ROLE')`)

    t.date('filed_date').notNullable()
    t.date('valid_until').notNullable()

    // Artikel 9-fält – krypterat med healthDEK
    t.text('conducted_by_encrypted').notNullable()   // läkare/klinik
    t.text('outcome_encrypted').notNullable()         // FIT | FIT_WITH_RESTRICTIONS | UNFIT
    t.text('restrictions_encrypted').nullable()       // string[] med medicinska restriktioner

    // EncryptedDocumentRef – Artikel 9, separat objektlager
    t.string('document_storage_id').nullable()
    t.string('document_encryption_key_id').nullable()
    t.string('document_mime_type').nullable()

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  })

  await knex.schema.raw(`
    -- Dessa index innehåller ej känslig data (datum är OK)
    CREATE INDEX idx_hdecl_health_record ON health_declarations (health_record_id);
    CREATE INDEX idx_hdecl_employee      ON health_declarations (employee_id);
    CREATE INDEX idx_hdecl_valid_until   ON health_declarations (valid_until);
    CREATE INDEX idx_hdecl_type          ON health_declarations (type);
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('qualification_profiles', (t) => {
    t.dropForeign(['health_record_id'])
  })
  await knex.schema.dropTableIfExists('health_declarations')
  await knex.schema.dropTableIfExists('health_records')
}
