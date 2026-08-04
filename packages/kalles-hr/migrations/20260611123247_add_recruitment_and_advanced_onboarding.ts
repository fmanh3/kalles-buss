import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. ADVANCED CONTACT & ADDRESS HISTORY
  // This allows tracking multiple contact methods and their history for audit/legal.
  await knex.schema.createTable('person_contact_details', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    
    t.string('type').notNullable(); // 'HOME_ADDRESS', 'WORK_EMAIL', 'PRIVATE_PHONE', 'ICE_CONTACT'
    t.string('category').notNullable(); // 'ADDRESS', 'PHONE', 'EMAIL', 'SOCIAL'
    
    // Flexible JSON content to future-proof different contact types (e.g. LinkedIn, Meta, future tech)
    t.jsonb('content_encrypted').notNullable(); 
    
    t.boolean('is_primary').defaultTo(false);
    t.date('valid_from').notNullable().defaultTo(knex.fn.now());
    t.date('valid_to').nullable(); // Null means current
    
    t.timestamps(true, true);
    t.index(['employee_id', 'type', 'valid_to']);
  });

  // 2. RECRUITMENT LIFECYCLE (The Strategic Pipeline)
  
  // A. Requisition: Identifying the need and deciding to hire
  await knex.schema.createTable('hiring_requisitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_definition_id').notNullable().references('id').inTable('job_definitions');
    t.uuid('department_id').notNullable().references('id').inTable('departments');
    t.string('status').defaultTo('DRAFT'); // 'DRAFT', 'APPROVED', 'POSTED', 'FILLED', 'CANCELLED'
    t.integer('count').defaultTo(1);
    t.text('justification').nullable();
    t.uuid('requested_by_id').notNullable().references('id').inTable('employees');
    t.timestamps(true, true);
  });

  // B. Job Posting: The external/internal advertisement
  await knex.schema.createTable('job_postings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('requisition_id').notNullable().references('id').inTable('hiring_requisitions');
    t.string('title').notNullable();
    t.text('advertisement_text').notNullable();
    t.jsonb('distribution_channels').nullable(); // ['LINKEDIN', 'INDEED', 'INTERNAL']
    t.date('expiry_date').nullable();
    t.timestamps(true, true);
  });

  // C. Applications: The candidates in the funnel
  await knex.schema.createTable('job_applications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('posting_id').notNullable().references('id').inTable('job_postings');
    t.string('candidate_name').notNullable();
    t.string('candidate_email').notNullable();
    t.string('status').defaultTo('RECEIVED'); // 'RECEIVED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'
    t.jsonb('cv_data_encrypted').nullable();
    t.decimal('score', 3, 2).nullable(); // Weighted score from AI/HR screening
    t.text('screening_notes').nullable();
    t.timestamps(true, true);
  });

  // 3. ONBOARDING & ENROLLMENT (The Transition)
  // This tracks the "Activation" of an employee, including data collection.
  await knex.schema.createTable('onboarding_workflows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('application_id').nullable().references('id').inTable('job_applications');
    t.uuid('employee_id').notNullable().references('id').inTable('employees');
    t.jsonb('checklist').notNullable(); // [{task: 'ID_VERIFIED', done: bool}, {task: 'BANK_DETAILS_COLLECTED', done: bool}]
    t.string('status').defaultTo('IN_PROGRESS'); // 'IN_PROGRESS', 'COMPLETED'
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('onboarding_workflows');
  await knex.schema.dropTableIfExists('job_applications');
  await knex.schema.dropTableIfExists('job_postings');
  await knex.schema.dropTableIfExists('hiring_requisitions');
  await knex.schema.dropTableIfExists('person_contact_details');
}
