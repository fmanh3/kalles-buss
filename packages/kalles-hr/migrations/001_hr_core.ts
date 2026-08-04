import type { Knex } from "knex";
/**
 * 001_hr_core.js
 *
 * Employee (Aggregate Root) + EmployeeEncryptionContext
 *
 * Krypteringskonvention:
 *   Kolumner med suffixet _encrypted innehåller AES-256-GCM-krypterad,
 *   base64-kodad text. Kryptering/dekryptering sker i applikationslagret
 *   via CryptoService som slår upp rätt DEK ur employee_encryption_keys.
 *
 *   personal_data_encrypted  → krypterat med personalDEK  (Artikel 6)
 *   *_health_encrypted       → krypterat med healthDEK    (Artikel 9)
 */

export async function up(knex: Knex): Promise<void> {

  // ── Stödtabeller ──────────────────────────────────────────────────────────

  await knex.schema.createTable('departments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('name', 100).notNullable()
    t.string('code', 20).notNullable().unique()
    t.uuid('parent_department_id').nullable().references('id').inTable('departments')
    t.timestamps(true, true)
  })

  await knex.schema.createTable('cost_centers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('name', 100).notNullable()
    t.string('code', 20).notNullable().unique()
    t.timestamps(true, true)
  })

  // ── Krypteringsnycklar (en rad per anställd) ─────────────────────────────
  //
  // personal_dek_encrypted och health_dek_encrypted innehåller DEK:arna
  // krypterade med systemets KEK (Key Encryption Key).
  // När en DEK förstörs (GDPR-radering) sätts destroyed_at och värdet nollställs.

  await knex.schema.createTable('employee_encryption_keys', (t) => {
    t.uuid('employee_id').primary()          // FK sätts efter employees skapats
    t.text('personal_dek_encrypted')         // Artikel 6-nyckel
    t.text('health_dek_encrypted')           // Artikel 9-nyckel
    t.timestamp('personal_dek_destroyed_at').nullable()
    t.timestamp('health_dek_destroyed_at').nullable()
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  })

  // ── Employees ─────────────────────────────────────────────────────────────

  await knex.schema.createTable('employees', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('employee_number', 20).notNullable().unique()  // "EMP-0042"

    // Personnummer krypterat med personalDEK
    t.text('person_number_encrypted').notNullable()

    // PersonalData (namn, adress, bankkonto, skattinfo) som krypterad JSON-blob
    // Dekrypteras till PersonalData VO i applikationslagret
    t.text('personal_data_encrypted').notNullable()

    // RoleProfile – ej personuppgift i isolation, klartext OK
    t.string('primary_role', 50).notNullable()
    t.uuid('department_id').notNullable().references('id').inTable('departments')
    t.uuid('cost_center_id').notNullable().references('id').inTable('cost_centers')
    t.uuid('reports_to_employee_id').nullable()  // self-ref, FK läggs i constraint nedan

    t.string('employment_status', 30).notNullable().defaultTo('ACTIVE')
    // CHECK constraint för enum-värden
    t.check(
      `employment_status IN ('ACTIVE','PROBATION','ON_LEAVE','SICK_LEAVE','TERMINATED')`
    )

    t.uuid('current_contract_id').nullable()  // FK till employment_contracts, läggs i 002

    t.timestamps(true, true)
  })

  await knex.schema.alterTable('employees', (t) => {
    t.foreign('reports_to_employee_id').references('id').inTable('employees')
  })

  await knex.schema.alterTable('employee_encryption_keys', (t) => {
    t.foreign('employee_id').references('id').inTable('employees').onDelete('RESTRICT')
  })

  // Index: sökning på status och roll (utan att röra krypterat innehåll)
  await knex.schema.raw(`
    CREATE INDEX idx_employees_status  ON employees (employment_status);
    CREATE INDEX idx_employees_role    ON employees (primary_role);
    CREATE INDEX idx_employees_dept    ON employees (department_id);
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_encryption_keys')
  await knex.schema.dropTableIfExists('employees')
  await knex.schema.dropTableIfExists('cost_centers')
  await knex.schema.dropTableIfExists('departments')
}
