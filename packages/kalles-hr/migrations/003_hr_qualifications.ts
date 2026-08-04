import type { Knex } from "knex";
/**
 * 003_hr_qualifications.js
 *
 * QualificationProfile (Aggregate) – Artikel 6, LEVEL_3+
 *
 * Innehåller INGA Artikel 9-data.
 * health_eligibility_* kolumner innehåller enbart det operationella utfallet
 * ("Får personen köra?") – aldrig medicinsk grund.
 * Medicinsk data bor i health_records (004).
 */

export async function up(knex: Knex): Promise<void> {

  // ── QualificationProfile (Aggregate Root för denna tabell) ───────────────

  await knex.schema.createTable('qualification_profiles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('employee_id').notNullable().unique().references('id').inTable('employees')
    t.string('primary_role', 50).notNullable()

    // HealthEligibilityStatus VO – operationellt utfall, ej Artikel 9
    t.boolean('health_eligibility_is_eligible').nullable()
    t.date('health_eligibility_valid_until').nullable()
    t.jsonb('health_eligibility_operational_restrictions').notNullable().defaultTo('[]')
    // Exempel: ["Kräver automatväxel", "Max 6h/dag"]  – aldrig medicinska orsaker
    t.date('health_eligibility_last_declared_date').nullable()
    t.uuid('health_record_id').nullable()  // FK läggs efter health_records skapats (004)

    // ComplianceStatus VO
    t.boolean('compliance_is_compliant').notNullable().defaultTo(false)
    t.date('compliance_valid_until').nullable()
    t.jsonb('compliance_expiring_30_days').notNullable().defaultTo('[]')
    t.jsonb('compliance_expired').notNullable().defaultTo('[]')
    t.jsonb('compliance_missing').notNullable().defaultTo('[]')
    t.timestamp('compliance_last_checked').nullable()

    t.timestamps(true, true)
  })

  await knex.schema.raw(`
    CREATE INDEX idx_qp_employee        ON qualification_profiles (employee_id);
    CREATE INDEX idx_qp_eligible        ON qualification_profiles (health_eligibility_is_eligible);
    CREATE INDEX idx_qp_valid_until     ON qualification_profiles (health_eligibility_valid_until);
    CREATE INDEX idx_qp_compliance      ON qualification_profiles (compliance_is_compliant);
  `)

  // ── Körkort ───────────────────────────────────────────────────────────────

  await knex.schema.createTable('licenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('qualification_profile_id').notNullable()
      .references('id').inTable('qualification_profiles')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.string('category', 10).notNullable()   // B, C, CE, D, DE, BE …
    t.string('license_number', 50).notNullable()
    t.date('issued_date').notNullable()
    t.date('expiry_date').notNullable()
    t.string('issuing_country', 2).notNullable().defaultTo('SE')
    t.string('status', 20).notNullable().defaultTo('VALID')
    t.check(`status IN ('VALID','EXPIRED','SUSPENDED','REVOKED')`)
    t.jsonb('restrictions').notNullable().defaultTo('[]')

    // EncryptedDocumentRef – Artikel 6
    t.string('document_storage_id').nullable()
    t.string('document_encryption_key_id').nullable()
    t.string('document_mime_type').nullable()

    t.timestamps(true, true)
  })

  await knex.schema.raw(`
    CREATE INDEX idx_licenses_employee  ON licenses (employee_id);
    CREATE INDEX idx_licenses_category  ON licenses (category);
    CREATE INDEX idx_licenses_expiry    ON licenses (expiry_date, status);
  `)

  // ── Certifieringar ────────────────────────────────────────────────────────

  await knex.schema.createTable('certifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('qualification_profile_id').notNullable()
      .references('id').inTable('qualification_profiles')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.string('type', 50).notNullable()
    // Enum-värden i applikationslagret – för lång lista för DB-check
    t.date('issued_date').notNullable()
    t.date('expiry_date').nullable()         // null = ej tidsbegränsad
    t.string('issuing_body', 100).notNullable()
    t.string('certificate_number', 50).notNullable()
    t.string('status', 20).notNullable().defaultTo('VALID')
    t.check(`status IN ('VALID','EXPIRED','PENDING_RENEWAL')`)
    t.integer('renewal_reminder_days').notNullable().defaultTo(60)

    // EncryptedDocumentRef – Artikel 6
    t.string('document_storage_id').nullable()
    t.string('document_encryption_key_id').nullable()
    t.string('document_mime_type').nullable()

    t.timestamps(true, true)
  })

  await knex.schema.raw(`
    CREATE INDEX idx_certs_employee     ON certifications (employee_id);
    CREATE INDEX idx_certs_type         ON certifications (type);
    CREATE INDEX idx_certs_expiry       ON certifications (expiry_date, status)
      WHERE expiry_date IS NOT NULL;
    -- Underlag för QualificationExpiryView
    CREATE INDEX idx_certs_expiry_soon  ON certifications (expiry_date)
      WHERE status = 'VALID' AND expiry_date IS NOT NULL;
  `)

  // ── Fordonstillstånd ──────────────────────────────────────────────────────

  await knex.schema.createTable('vehicle_authorizations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('qualification_profile_id').notNullable()
      .references('id').inTable('qualification_profiles')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.uuid('vehicle_type_id').notNullable()  // ref till Depot-domänen, ingen FK cross-domain
    t.string('vehicle_type_name', 100).notNullable()  // denormaliserat
    t.date('authorized_date').notNullable()
    t.uuid('authorized_by_employee_id').notNullable().references('id').inTable('employees')
    t.boolean('training_completed').notNullable().defaultTo(false)
    t.date('training_date').nullable()
    t.text('notes').nullable()
    t.string('status', 20).notNullable().defaultTo('ACTIVE')
    t.check(`status IN ('ACTIVE','REVOKED','SUSPENDED')`)
    t.text('revoked_reason').nullable()

    t.timestamps(true, true)
  })

  await knex.schema.raw(`
    CREATE INDEX idx_vauth_employee     ON vehicle_authorizations (employee_id);
    CREATE INDEX idx_vauth_vehicle_type ON vehicle_authorizations (vehicle_type_id);
    CREATE INDEX idx_vauth_status       ON vehicle_authorizations (employee_id, status);
  `)

  // ── Specialiseringar ──────────────────────────────────────────────────────

  await knex.schema.createTable('specializations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('qualification_profile_id').notNullable()
      .references('id').inTable('qualification_profiles')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.string('domain', 50).notNullable()
    t.string('level', 20).notNullable()
    t.check(`level IN ('BASIC','INTERMEDIATE','EXPERT')`)
    t.date('certified_date').notNullable()
    t.uuid('certified_by_employee_id').notNullable().references('id').inTable('employees')
    t.text('notes').nullable()
  })

  await knex.schema.raw(`
    CREATE INDEX idx_spec_employee ON specializations (employee_id);
    CREATE INDEX idx_spec_domain   ON specializations (domain, level);
  `)

  // ── TrainingRecord ────────────────────────────────────────────────────────

  await knex.schema.createTable('training_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('qualification_profile_id').notNullable()
      .references('id').inTable('qualification_profiles')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.string('title', 200).notNullable()
    t.string('provider', 100).nullable()
    t.date('completed_date').notNullable()
    t.decimal('hours', 5, 1).nullable()
    t.string('related_certification_type', 50).nullable()
    t.text('notes').nullable()
  })

  await knex.schema.raw(`
    CREATE INDEX idx_training_employee ON training_records (employee_id);
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('training_records')
  await knex.schema.dropTableIfExists('specializations')
  await knex.schema.dropTableIfExists('vehicle_authorizations')
  await knex.schema.dropTableIfExists('certifications')
  await knex.schema.dropTableIfExists('licenses')
  await knex.schema.dropTableIfExists('qualification_profiles')
}
