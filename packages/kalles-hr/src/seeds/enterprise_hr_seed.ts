import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { PubSubClient } from '@kalles-buss/shared-utils';

export async function seed(knex: Knex): Promise<void> {
  const pubsub = new PubSubClient();

  // Deletes ALL existing entries
  await knex("employees").update({ current_contract_id: null });
  await knex("audit_events").del();
  await knex("domain_events").del();
  await knex("rehab_steps").del();
  await knex("rehab_plans").del();
  await knex("medical_certificates").del();
  await knex("sick_days").del();
  await knex("sick_leave_medical_records").del();
  await knex("sick_leave_cases").del();
  await knex("compensation_records").del();
  await knex("reconciled_shifts").del();
  await knex("time_entries").del();
  await knex("planned_shifts").del();
  await knex("work_records").del();
  await knex("training_records").del();
  await knex("specializations").del();
  await knex("vehicle_authorizations").del();
  await knex("certifications").del();
  await knex("licenses").del();
  await knex("qualification_profiles").del();
  await knex("contract_amendments").del();
  await knex("employment_contracts").del();
  await knex("employee_encryption_keys").del();
  await knex("employees").del();
  await knex("cost_centers").del();
  await knex("departments").del();
  await knex("collective_agreement_configs").del();

  // 1. Departments & Cost Centers
  const [depOps] = await knex("departments").insert({ name: "Operations", code: "OPS" }).returning("id");
  const [depMaint] = await knex("departments").insert({ name: "Maintenance", code: "MAINT" }).returning("id");
  
  const [ccTraffic] = await knex("cost_centers").insert({ name: "Traffic Traffic", code: "CC-100" }).returning("id");
  const [ccWorkshop] = await knex("cost_centers").insert({ name: "Main Workshop", code: "CC-200" }).returning("id");

  // 2. Collective Agreement (Bussavtalet)
  await knex("collective_agreement_configs").insert({
    code: "BUSSAVTALET_2024",
    name: "Bussbranschavtalet 2024 (Transport)",
    valid_from: "2024-01-01",
    valid_to: "2026-12-31",
    ob_rules: JSON.stringify([
      { name: "Evening OB", percentage: 25, timeWindows: [{ from: "19:00", to: "22:00" }] },
      { name: "Night OB", percentage: 50, timeWindows: [{ from: "22:00", to: "06:00" }] }
    ]),
    overtime_rules: JSON.stringify({ tier1: 50, tier2: 100 }),
    sick_pay_rules: JSON.stringify({ karens_pct: 100, day2to14_pct: 80 }),
    vacation_rules: JSON.stringify({ days_per_year: 25, supplement_rate: 0.008 }),
    pension_scheme: "ITP1",
    notice_periods: JSON.stringify([[6, 30], [24, 60], [120, 90]]) // months, days
  });

  // 3. Employees
  const empId1 = uuidv4();
  const empId2 = uuidv4();

  await knex("employees").insert([
    {
      id: empId1,
      employee_number: "EMP-001",
      person_number_encrypted: "encrypted_pno_1",
      personal_data_encrypted: JSON.stringify({ firstName: "Kalle", lastName: "Karlsson", email: "kalle@kallesbuss.se" }),
      primary_role: "DRIVER",
      department_id: depOps.id,
      cost_center_id: ccTraffic.id,
      employment_status: "ACTIVE"
    },
    {
      id: empId2,
      employee_number: "EMP-042",
      person_number_encrypted: "encrypted_pno_2",
      personal_data_encrypted: JSON.stringify({ firstName: "Micke", lastName: "Mekaniker", email: "micke@kallesbuss.se" }),
      primary_role: "MECHANIC",
      department_id: depMaint.id,
      cost_center_id: ccWorkshop.id,
      employment_status: "ACTIVE"
    }
  ]);

  // Sync to other domains
  await pubsub.publish('hr-events', { eventType: 'StaffCreated', staff: { id: empId1, name: 'Kalle Karlsson', role: 'DRIVER', home_depot_id: depOps.id } });
  await pubsub.publish('hr-events', { eventType: 'StaffCreated', staff: { id: empId2, name: 'Micke Mekaniker', role: 'MECHANIC', home_depot_id: depMaint.id } });

  // 4. Contracts
  await knex("employment_contracts").insert([
    {
      employee_id: empId1,
      contract_type: "PERMANENT",
      start_date: "2020-01-01",
      collective_agreement_code: "BUSSAVTALET_2024",
      scheduled_weekly_hours: 40,
      work_pattern: "SHIFT",
      salary_terms_encrypted: JSON.stringify({ baseAmount: 32000, currency: "SEK" }),
      is_current: true
    },
    {
      employee_id: empId2,
      contract_type: "PERMANENT",
      start_date: "2021-05-15",
      collective_agreement_code: "BUSSAVTALET_2024",
      scheduled_weekly_hours: 40,
      work_pattern: "FIXED",
      salary_terms_encrypted: JSON.stringify({ baseAmount: 38000, currency: "SEK" }),
      is_current: true
    }
  ]);

  // Link contracts back to employees
  const contracts = await knex("employment_contracts").select("id", "employee_id");
  for (const c of contracts) {
    await knex("employees").where({ id: c.employee_id }).update({ current_contract_id: c.id });
  }

  // 5. Qualifications
  await knex("qualification_profiles").insert([
    { employee_id: empId1, primary_role: "DRIVER", compliance_is_compliant: true },
    { employee_id: empId2, primary_role: "MECHANIC", compliance_is_compliant: true }
  ]);
  
  const qps = await knex("qualification_profiles").select("id", "employee_id");
  
  // Licenses for Kalle
  const kalleQp = qps.find(q => q.employee_id === empId1);
  if (kalleQp) {
    await knex("licenses").insert({
      qualification_profile_id: kalleQp.id,
      employee_id: empId1,
      category: "D",
      license_number: "SE-12345678",
      issued_date: "2015-10-10",
      expiry_date: "2025-10-10"
    });
  }

  // Certs for Micke
  const mickeQp = qps.find(q => q.employee_id === empId2);
  if (mickeQp) {
    await knex("certifications").insert({
      qualification_profile_id: mickeQp.id,
      employee_id: empId2,
      type: "EV_BATTERY_TECH",
      issued_date: "2023-01-01",
      expiry_date: "2028-01-01",
      issuing_body: "Scania Academy",
      certificate_number: "CERT-999"
    });
  }

  // 6. Sample Work & Compensation for Kalle (Period 2026-05)
  const [workRecord] = await knex("work_records").insert({
    employee_id: empId1,
    contract_id: contracts.find(c => c.employee_id === empId1).id,
    period_year: 2026,
    period_month: 5,
    status: 'OPEN'
  }).returning("id");

  await knex("compensation_records").insert({
    employee_id: empId1,
    contract_id: contracts.find(c => c.employee_id === empId1).id,
    work_record_id: workRecord.id,
    period_year: 2026,
    period_month: 5,
    gross_pay_amount: 32000,
    pay_lines_encrypted: '[]',
    deductions_encrypted: '[]',
    pension_contributions_encrypted: '[]',
    tax_calculation_encrypted: '[]',
    status: 'DRAFT'
  });
}
