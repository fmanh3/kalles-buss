import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. THE ACTION SMÖRGÅSBORD
  await knex.schema.createTable('lifecycle_action_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('code').unique().notNullable();
    t.string('title').notNullable();
    t.text('description').nullable();
    t.string('type').notNullable(); // 'MANUAL_CHECK', 'AGENT_TRIGGER', 'EXTERNAL_SYSTEM'
    t.string('domain').notNullable(); // 'IT', 'HR', 'LEGAL', 'DEPOT'
    t.jsonb('config_schema').nullable();
    t.timestamps(true, true);
  });

  // 2. PROCESS TEMPLATES
  await knex.schema.createTable('lifecycle_process_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable();
    t.string('target_role').nullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('lifecycle_template_steps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('template_id').notNullable().references('id').inTable('lifecycle_process_templates').onDelete('CASCADE');
    t.uuid('action_definition_id').notNullable().references('id').inTable('lifecycle_action_definitions');
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_mandatory').defaultTo(true);
    t.timestamps(true, true);
  });

  // 3. ACTIVE WORKFLOW INSTANCES
  await knex.schema.createTable('employee_lifecycle_workflows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('employee_id').notNullable(); // Link to external HR Domain
    t.uuid('template_id').notNullable().references('id').inTable('lifecycle_process_templates');
    t.string('status').defaultTo('ACTIVE'); 
    t.timestamp('started_at').defaultTo(knex.fn.now());
    t.timestamp('completed_at').nullable();
    t.timestamps(true, true);
    t.index(['employee_id', 'status']);
  });

  await knex.schema.createTable('employee_lifecycle_steps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('workflow_id').notNullable().references('id').inTable('employee_lifecycle_workflows').onDelete('CASCADE');
    t.uuid('action_definition_id').notNullable().references('id').inTable('lifecycle_action_definitions');
    t.string('status').defaultTo('PENDING');
    t.jsonb('result_data').nullable();
    t.uuid('completed_by_id').nullable(); // Link to external HR Domain
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
