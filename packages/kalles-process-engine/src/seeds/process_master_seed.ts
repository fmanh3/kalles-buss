import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Clear all
  await knex("employee_lifecycle_steps").del();
  await knex("employee_lifecycle_workflows").del();
  await knex("lifecycle_template_steps").del();
  await knex("lifecycle_process_templates").del();
  await knex("lifecycle_action_definitions").del();

  // 1. ACTION SMÖRGÅSBORD
  const actionDefs = [
    { code: 'ID_VERIFY', title: 'Verify Identity', description: 'Physically check ID or Passport', type: 'MANUAL_CHECK', domain: 'HR' },
    { code: 'CREATE_EMAIL', title: 'Provision Work Email', description: 'Agent automates account creation', type: 'AGENT_TRIGGER', domain: 'IT' },
    { code: 'BANK_COLLECT', title: 'Collect Bank Details', description: 'Self-service link for payroll data', type: 'EXTERNAL_SYSTEM', domain: 'FINANCE' },
    { code: 'UNIFORM_ORDER', title: 'Order Uniform', description: 'Dispatch size request to vendor', type: 'AGENT_TRIGGER', domain: 'DEPOT' },
    { code: 'SAFETY_TRAINING', title: 'Safety Certification', description: 'Complete mandatory e-learning', type: 'MANUAL_CHECK', domain: 'LEGAL' }
  ];
  await knex('lifecycle_action_definitions').insert(actionDefs);
  const actions = await knex('lifecycle_action_definitions').select('id', 'code');

  // 2. PROCESS TEMPLATES
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
}
