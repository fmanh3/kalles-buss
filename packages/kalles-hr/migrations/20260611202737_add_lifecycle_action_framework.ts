import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. THE ACTION SMÖRGÅSBORD
  // Definitions of what CAN be done during a lifecycle process.
  await knex.schema.createTable('lifecycle_action_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('code').unique().notNullable(); // e.g., 'CREATE_EMAIL', 'ID_VERIFICATION'
    t.string('title').notNullable();
    t.text('description').nullable();
    t.string('type').notNullable(); // 'MANUAL_CHECK', 'AGENT_TRIGGER', 'EXTERNAL_SYSTEM'
    t.string('domain').notNullable(); // 'IT', 'HR', 'LEGAL', 'DEPOT'
    t.jsonb('config_schema').nullable(); // Metadata about what inputs are needed
    t.timestamps(true, true);
  });

  // 2. PROCESS TEMPLATES
  // Blueprints for recurring processes like "Driver Onboarding"
  await knex.schema.createTable('lifecycle_process_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable();
    t.string('target_role').nullable(); // Optional: link to a specific role
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // Mapping steps to templates
  await knex.schema.createTable('lifecycle_template_steps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('template_id').notNullable().references('id').inTable('lifecycle_process_templates').onDelete('CASCADE');
    t.uuid('action_definition_id').notNullable().references('id').inTable('lifecycle_action_definitions');
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_mandatory').defaultTo(true);
    t.timestamps(true, true);
  });

  // 3. ACTIVE WORKFLOW INSTANCES
  // The actual execution tracking for an employee
  await knex.schema.createTable('employee_lifecycle_workflows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.uuid('template_id').notNullable().references('id').inTable('lifecycle_process_templates');
    t.string('status').defaultTo('ACTIVE'); // 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'
    t.timestamp('started_at').defaultTo(knex.fn.now());
    t.timestamp('completed_at').nullable();
    t.timestamps(true, true);
  });

  // Individual steps in an active workflow
  await knex.schema.createTable('employee_lifecycle_steps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('workflow_id').notNullable().references('id').inTable('employee_lifecycle_workflows').onDelete('CASCADE');
    t.uuid('action_definition_id').notNullable().references('id').inTable('lifecycle_action_definitions');
    t.string('status').defaultTo('PENDING'); // 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'
    t.jsonb('result_data').nullable(); // E.g., agent response, link to account
    t.uuid('completed_by_id').nullable().references('id').inTable('employees'); // If manual check
    t.timestamp('completed_at').nullable();
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_lifecycle_steps');
  await knex.schema.dropTableIfExists('employee_lifecycle_workflows');
  await knex.schema.dropTableIfExists('lifecycle_template_steps');
  await knex.schema.dropTableIfExists('lifecycle_process_templates');
  await knex.schema.dropTableIfExists('lifecycle_action_definitions');
}
