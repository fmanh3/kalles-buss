import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { PubSubClient } from '@kalles-buss/shared-utils';

export async function seed(knex: Knex): Promise<void> {
  const pubsub = new PubSubClient();

  // 1. CLEAR ALL
  await knex("employee_lifecycle_steps").del();
  await knex("employee_lifecycle_workflows").del();
  await knex("lifecycle_template_steps").del();
  await knex("lifecycle_process_templates").del();
  await knex("lifecycle_action_definitions").del();
  await knex("onboarding_workflows").del();
  await knex("job_applications").del();
  await knex("job_postings").del();
  await knex("hiring_requisitions").del();
  await knex("person_contact_details").del();
  await knex("audit_events").del();
  await knex("domain_events").del();
  await knex("travel_claims").del();
  await knex("expense_claims").del();
  await knex("tax_tables").del();
  await knex("balance_ledger").del();
  await knex("emergency_contacts").del();
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
  
  await knex("employees").update({ current_contract_id: null });
  await knex("employment_contracts").del();
  await knex("employees").del();
  await knex("cost_centers").del();
  await knex("departments").del();
  await knex("job_definitions").del();
  await knex("job_levels").del();
  await knex("pay_types").del();
  await knex("collective_agreement_configs").del();

  // 2. ORG & CONFIG
  const [depOps] = await knex("departments").insert({ name: "Operations", code: "OPS" }).returning("id");
  const [depMaint] = await knex("departments").insert({ name: "Maintenance", code: "MAINT" }).returning("id");
  
  await knex("cost_centers").insert([
    { name: "Traffic Ops", code: "CC-100" },
    { name: "Main Workshop", code: "CC-200" }
  ]);

  await knex("collective_agreement_configs").insert({
    code: "BUSSAVTALET_2024",
    name: "Bussbranschavtalet 2024",
    valid_from: "2024-01-01", valid_to: "2026-12-31",
    ob_rules: JSON.stringify([{ name: "Night", percentage: 50, timeWindows: [{ from: "22:00", to: "06:00" }] }]),
    overtime_rules: '[]', sick_pay_rules: '{}', vacation_rules: '{}', pension_scheme: 'ITP1', notice_periods: '[]'
  });

  // 3. JOB ARCHITECTURE
  await knex("job_levels").insert([
    { level: 1, description: "Entry level" },
    { level: 2, description: "Skilled vocational" },
    { level: 4, description: "Professional" }
  ]);
  
  const levels = await knex("job_levels").select("id", "level");

  const [jMech] = await knex("job_definitions").insert({ 
    job_code: "MECH_SNR", title: "Senior Mechanic", job_level_id: levels.find(l => l.level === 4).id, salary_range_min: 35000, salary_range_max: 50000 
  }).returning("id");

  const [jDriver] = await knex("job_definitions").insert({ 
    job_code: "DRV_URBAN", title: "Urban Bus Driver", job_level_id: levels.find(l => l.level === 2).id, salary_range_min: 28000, salary_range_max: 38000 
  }).returning("id");

  // 4. ACTION SMÖRGÅSBORD SEEDING
  const actionDefs = [
    { code: 'ID_VERIFY', title: 'Verify Identity', description: 'Physically check ID or Passport', type: 'MANUAL_CHECK', domain: 'HR' },
    { code: 'CREATE_EMAIL', title: 'Provision Work Email', description: 'Agent automates account creation', type: 'AGENT_TRIGGER', domain: 'IT' },
    { code: 'BANK_COLLECT', title: 'Collect Bank Details', description: 'Self-service link for payroll data', type: 'EXTERNAL_SYSTEM', domain: 'FINANCE' },
    { code: 'UNIFORM_ORDER', title: 'Order Uniform', description: 'Dispatch size request to vendor', type: 'AGENT_TRIGGER', domain: 'DEPOT' },
    { code: 'SAFETY_TRAINING', title: 'Safety Certification', description: 'Complete mandatory e-learning', type: 'MANUAL_CHECK', domain: 'LEGAL' }
  ];
  await knex('lifecycle_action_definitions').insert(actionDefs);
  const actions = await knex('lifecycle_action_definitions').select('id', 'code');

  // 5. PROCESS TEMPLATES SEEDING
  const [tmplOnboarding] = await knex('lifecycle_process_templates').insert({
    name: 'Standard Driver Onboarding', target_role: 'DRIVER'
  }).returning('id');

  const tmplId = typeof tmplOnboarding === 'object' ? tmplOnboarding.id : tmplOnboarding;

  const steps = [
    { template_id: tmplId, action_definition_id: actions.find(a => a.code === 'ID_VERIFY').id, sort_order: 1 },
    { template_id: tmplId, action_definition_id: actions.find(a => a.code === 'BANK_COLLECT').id, sort_order: 2 },
    { template_id: tmplId, action_definition_id: actions.find(a => a.code === 'CREATE_EMAIL').id, sort_order: 3 },
    { template_id: tmplId, action_definition_id: actions.find(a => a.code === 'UNIFORM_ORDER').id, sort_order: 4 },
    { template_id: tmplId, action_definition_id: actions.find(a => a.code === 'SAFETY_TRAINING').id, sort_order: 5 }
  ];
  await knex('lifecycle_template_steps').insert(steps);

  // 6. EMPLOYEES & WORKFLOWS
  const empId = uuidv4();
  const depMaintId = typeof depMaint === 'object' ? depMaint.id : depMaint;
  const ccWorkshop = await knex("cost_centers").where({ code: "CC-200" }).first();

  await knex("employees").insert({
    id: empId, employee_number: "EMP-100", primary_role: "MECHANIC",
    legal_gender: "FEMALE", job_definition_id: typeof jMech === 'object' ? jMech.id : jMech,
    department_id: depMaintId, cost_center_id: ccWorkshop.id,
    employment_status: "ACTIVE", municipality: "Norrtälje", zip_code: "76130",
    personal_data_encrypted: JSON.stringify({ firstName: "Anna", lastName: "Anod" }),
    person_number_encrypted: '...'
  });

  // 7. TAX TABLES
  await knex("tax_tables").insert([
    { year: 2026, table_number: "31", column: 1, income_from: 30000, income_to: 31000, tax_amount: 7500 },
    { year: 2026, table_number: "31", column: 1, income_from: 31001, income_to: 32000, tax_amount: 7800 }
  ]);
}
