import type { Knex } from "knex";
/**
 * 005_hr_work_records.js
 *
 * WorkRecord (Aggregate, per löneperiod)
 * PlannedShift, TimeEntry, ReconciledShift
 * Artikel 6 – åtkomst LEVEL_2+
 *
 * PlannedShift speglar Traffic-domänens ShiftId rakt av –
 * HR äger ingen kopia av planens logik, bara tidsdata som underlag
 * för reconciliation och löneberäkning.
 */

export async function up(knex: Knex): Promise<void> {

  // ── WorkRecord ────────────────────────────────────────────────────────────

  await knex.schema.createTable('work_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('employee_id').notNullable().references('id').inTable('employees')
    t.uuid('contract_id').notNullable().references('id').inTable('employment_contracts')
    t.integer('period_year').notNullable()
    t.integer('period_month').notNullable()   // 1–12
    t.string('status', 30).notNullable().defaultTo('OPEN')
    t.check(`status IN ('OPEN','PENDING_RECONCILE','RECONCILED','APPROVED','EXPORTED')`)
    t.timestamps(true, true)
    t.unique(['employee_id', 'period_year', 'period_month'])
  })

  await knex.schema.raw(`
    CREATE INDEX idx_wr_employee   ON work_records (employee_id);
    CREATE INDEX idx_wr_period     ON work_records (period_year, period_month);
    CREATE INDEX idx_wr_status     ON work_records (status);
  `)

  // ── PlannedShift ──────────────────────────────────────────────────────────
  // Inkommer via Traffic → ShiftPlanned-event.
  // shift_id = Traffic-domänens ID – används som idempotency-nyckel vid event-konsumtion.

  await knex.schema.createTable('planned_shifts', (t) => {
    t.uuid('id').primary()   // = ShiftId från Traffic, INTE gen_random_uuid()
    t.uuid('work_record_id').notNullable().references('id').inTable('work_records')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.timestamp('planned_start').notNullable()
    t.timestamp('planned_end').notNullable()
    t.decimal('planned_hours', 5, 2).notNullable()
    t.string('shift_type', 20).notNullable().defaultTo('NORMAL')
    t.check(`shift_type IN ('NORMAL','SPLIT','STANDBY','ON_CALL','OVERTIME')`)

    // Cross-domain-referenser – inga FK, enbart ID:n
    t.uuid('line_id').nullable()     // Traffic-domänens LineId
    t.uuid('vehicle_id').nullable()  // Depot-domänens VehicleId

    t.timestamp('received_at').notNullable().defaultTo(knex.fn.now())
    // För att hantera ShiftRescheduled-events:
    t.integer('version').notNullable().defaultTo(1)
  })

  await knex.schema.raw(`
    CREATE INDEX idx_ps_work_record ON planned_shifts (work_record_id);
    CREATE INDEX idx_ps_employee    ON planned_shifts (employee_id);
    CREATE INDEX idx_ps_start       ON planned_shifts (planned_start);
  `)

  // ── TimeEntry ─────────────────────────────────────────────────────────────
  // Faktisk tid från tachograf, manuell rapportering eller plan-fallback.

  await knex.schema.createTable('time_entries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('work_record_id').notNullable().references('id').inTable('work_records')
    t.uuid('shift_id').nullable().references('id').inTable('planned_shifts')
    t.uuid('employee_id').notNullable().references('id').inTable('employees')

    t.string('type', 20).notNullable()
    t.check(`type IN ('DRIVING','WAITING','STANDBY','BREAK','ADMIN_WORK','TRAINING','OTHER_WORK')`)

    t.timestamp('from_time').notNullable()
    t.timestamp('to_time').notNullable()
    t.decimal('hours', 5, 2).notNullable()

    t.string('source', 30).notNullable()
    t.check(`source IN ('TACHOGRAPH','MANUAL_EMPLOYEE','MANUAL_MANAGER','PLANNED_DEFAULT')`)

    t.uuid('reported_by_employee_id').nullable().references('id').inTable('employees')
    t.uuid('approved_by_employee_id').nullable().references('id').inTable('employees')
    t.text('reason').nullable()

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  })

  await knex.schema.raw(`
    CREATE INDEX idx_te_work_record ON time_entries (work_record_id);
    CREATE INDEX idx_te_shift       ON time_entries (shift_id);
    CREATE INDEX idx_te_employee    ON time_entries (employee_id);
    CREATE INDEX idx_te_source      ON time_entries (source);
    CREATE INDEX idx_te_from        ON time_entries (from_time);
  `)

  // ── ReconciledShift ───────────────────────────────────────────────────────
  // Auktoritativt tidutfall efter reconciliation.
  // Segmenten lagras som JSONB då de inte behöver sökas individuellt.

  await knex.schema.createTable('reconciled_shifts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('work_record_id').notNullable().references('id').inTable('work_records')
    t.uuid('shift_id').notNullable().unique().references('id').inTable('planned_shifts')

    // TimeSegment[] – [{ type, from, to, hours, source }]
    t.jsonb('segments').notNullable().defaultTo('[]')

    t.decimal('total_hours', 5, 2).notNullable()
    t.decimal('driving_hours', 5, 2).notNullable().defaultTo(0)
    t.decimal('waiting_hours', 5, 2).notNullable().defaultTo(0)
    t.decimal('standby_hours', 5, 2).notNullable().defaultTo(0)
    t.decimal('break_hours', 5, 2).notNullable().defaultTo(0)
    t.decimal('other_work_hours', 5, 2).notNullable().defaultTo(0)

    t.string('reconciliation_method', 30).notNullable()
    t.check(
      `reconciliation_method IN ('TACHOGRAPH','MANUAL_CORRECTION','PLANNED_DEFAULT','MIXED')`
    )
    t.integer('discrepancy_minutes').nullable()
    t.text('notes').nullable()

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  })

  await knex.schema.raw(`
    CREATE INDEX idx_rs_work_record ON reconciled_shifts (work_record_id);
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('reconciled_shifts')
  await knex.schema.dropTableIfExists('time_entries')
  await knex.schema.dropTableIfExists('planned_shifts')
  await knex.schema.dropTableIfExists('work_records')
}
