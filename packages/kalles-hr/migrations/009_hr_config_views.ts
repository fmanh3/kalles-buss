import type { Knex } from "knex";
/**
 * 009_hr_config_views.js
 *
 * CollectiveAgreementConfig  – konfiguration per avtal, ej persondata
 * PostgreSQL VIEWs            – läsmodeller / projektioner
 *
 * Vyerna materialiserar ingenting med persondata i klartext –
 * de selekterar enbart kolonner som är säkra att läsa utan dekryptering.
 * Applikationslagret ansvarar för dekryptering efter att rader hämtats.
 */

export async function up(knex: Knex): Promise<void> {

  // ── CollectiveAgreementConfig ─────────────────────────────────────────────

  await knex.schema.createTable('collective_agreement_configs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('code', 50).notNullable().unique()    // "BUSSAVTALET_2023"
    t.string('name', 100).notNullable()
    t.date('valid_from').notNullable()
    t.date('valid_to').notNullable()

    // OB-regler: [{ payTypeCode, percentage, timeWindows: [{from, to}], dayTypes, priority }]
    t.jsonb('ob_rules').notNullable().defaultTo('[]')

    // Övertidsregler: [{ thresholdHoursPerDay, thresholdHoursPerWeek,
    //                    firstTierRate, firstTierHours, secondTierRate }]
    t.jsonb('overtime_rules').notNullable().defaultTo('[]')

    // { karensDayRate, sickPay2to14, employerSupplement }
    t.jsonb('sick_pay_rules').notNullable()

    // { daysPerYear, supplementRate }
    t.jsonb('vacation_rules').notNullable()

    t.string('pension_scheme', 30).notNullable()

    // { byTenureMonths: [[months, noticeDays], ...] }
    t.jsonb('notice_periods').notNullable()

    t.timestamps(true, true)
    t.unique(['code', 'valid_from'])
  })

  await knex.schema.raw(`
    CREATE INDEX idx_cac_code  ON collective_agreement_configs (code);
    CREATE INDEX idx_cac_valid ON collective_agreement_configs (valid_from, valid_to);
  `)

  // FK från employment_contracts till collective_agreement_configs
  // (code-baserad, inte UUID – avtalet byts ut som en ny rad, ej uppdatering)
  await knex.schema.raw(`
    ALTER TABLE employment_contracts
      ADD CONSTRAINT fk_contracts_agreement
      FOREIGN KEY (collective_agreement_code)
      REFERENCES collective_agreement_configs (code)
      NOT VALID;  -- NOT VALID: valideras ej retroaktivt, gäller från nu
  `)

  // ── PostgreSQL VIEWs (läsmodeller) ────────────────────────────────────────
  //
  // Dessa vyer är säkra att exponera mot LEVEL_2/LEVEL_3.
  // De innehåller ALDRIG krypterade kolonner eller Artikel 9-data.
  // Applikationslagret kontrollerar åtkomstnivå innan en vy används.

  // QualificationExpiryView
  // Underlag för automatiska påminnelser om utgående certifikat/licenser.
  await knex.schema.raw(`
    CREATE VIEW qualification_expiry_view AS
    SELECT
      e.id            AS employee_id,
      e.employee_number,
      e.primary_role,
      'LICENSE'       AS item_type,
      l.id            AS item_id,
      l.category      AS item_subtype,
      l.expiry_date,
      l.status,
      (l.expiry_date - CURRENT_DATE) AS days_until_expiry
    FROM employees e
    JOIN qualification_profiles qp ON qp.employee_id = e.id
    JOIN licenses l ON l.qualification_profile_id = qp.id
    WHERE l.status = 'VALID'

    UNION ALL

    SELECT
      e.id, e.employee_number, e.primary_role,
      'CERTIFICATION', c.id, c.type,
      c.expiry_date, c.status,
      (c.expiry_date - CURRENT_DATE)
    FROM employees e
    JOIN qualification_profiles qp ON qp.employee_id = e.id
    JOIN certifications c ON c.qualification_profile_id = qp.id
    WHERE c.status = 'VALID' AND c.expiry_date IS NOT NULL

    UNION ALL

    SELECT
      e.id, e.employee_number, e.primary_role,
      'HEALTH_ELIGIBILITY', qp.id, 'HEALTH_DECLARATION',
      qp.health_eligibility_valid_until, 
      CASE WHEN qp.health_eligibility_is_eligible THEN 'VALID' ELSE 'EXPIRED' END,
      (qp.health_eligibility_valid_until - CURRENT_DATE)
    FROM employees e
    JOIN qualification_profiles qp ON qp.employee_id = e.id
    WHERE qp.health_eligibility_valid_until IS NOT NULL

    ORDER BY days_until_expiry ASC NULLS LAST;
  `)

  // ActiveWorkforceView
  // Aktiva anställda med roll och tillgänglighet – för planering och översikt.
  await knex.schema.raw(`
    CREATE VIEW active_workforce_view AS
    SELECT
      e.id              AS employee_id,
      e.employee_number,
      e.primary_role,
      e.employment_status,
      e.department_id,
      e.cost_center_id,
      d.name            AS department_name,
      cc.name           AS cost_center_name,
      ec.contract_type,
      ec.scheduled_weekly_hours,
      ec.collective_agreement_code,
      qp.health_eligibility_is_eligible,
      qp.compliance_is_compliant
    FROM employees e
    JOIN departments d        ON d.id  = e.department_id
    JOIN cost_centers cc      ON cc.id = e.cost_center_id
    LEFT JOIN employment_contracts ec ON ec.id = e.current_contract_id
    LEFT JOIN qualification_profiles qp ON qp.employee_id = e.id
    WHERE e.employment_status NOT IN ('TERMINATED');
  `)

  // SickLeaveOverviewView
  // Pågående sjukfall: datum, dagar, kompensationstyp – INGEN medicinsk info.
  // Åtkomst LEVEL_3+.
  await knex.schema.raw(`
    CREATE VIEW sick_leave_overview_view AS
    SELECT
      slc.id              AS case_id,
      slc.employee_id,
      e.employee_number,
      e.primary_role,
      e.department_id,
      slc.start_date,
      slc.end_date,
      slc.expected_return_date,
      slc.status,
      (COALESCE(slc.end_date, CURRENT_DATE) - slc.start_date) AS total_calendar_days,
      COUNT(sd.id)        AS sick_day_count,
      SUM(sd.pay_impact_amount) AS total_pay_impact
    FROM sick_leave_cases slc
    JOIN employees e  ON e.id = slc.employee_id
    LEFT JOIN sick_days sd ON sd.sick_leave_case_id = slc.id
    WHERE slc.status NOT IN ('CLOSED_RETURNED','CLOSED_TERMINATED')
    GROUP BY slc.id, slc.employee_id, e.employee_number,
             e.primary_role, e.department_id,
             slc.start_date, slc.end_date,
             slc.expected_return_date, slc.status;
  `)

  // ComplianceDashboardView
  // Aggregerad compliance per avdelning – inga individuppgifter om hälsa.
  await knex.schema.raw(`
    CREATE VIEW compliance_dashboard_view AS
    SELECT
      e.department_id,
      d.name              AS department_name,
      e.primary_role,
      COUNT(e.id)         AS total_employees,
      SUM(CASE WHEN qp.compliance_is_compliant THEN 1 ELSE 0 END) AS compliant_count,
      SUM(CASE WHEN qp.health_eligibility_is_eligible THEN 1 ELSE 0 END)
                          AS health_eligible_count,
      SUM(CASE WHEN jsonb_array_length(qp.compliance_expired) > 0 THEN 1 ELSE 0 END)
                          AS with_expired_items
    FROM employees e
    JOIN departments d ON d.id = e.department_id
    LEFT JOIN qualification_profiles qp ON qp.employee_id = e.id
    WHERE e.employment_status = 'ACTIVE'
    GROUP BY e.department_id, d.name, e.primary_role;
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    DROP VIEW IF EXISTS compliance_dashboard_view;
    DROP VIEW IF EXISTS sick_leave_overview_view;
    DROP VIEW IF EXISTS active_workforce_view;
    DROP VIEW IF EXISTS qualification_expiry_view;
    ALTER TABLE employment_contracts
      DROP CONSTRAINT IF EXISTS fk_contracts_agreement;
  `)
  await knex.schema.dropTableIfExists('collective_agreement_configs')
}
