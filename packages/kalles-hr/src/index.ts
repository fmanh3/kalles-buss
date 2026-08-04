import axios from 'axios';
import { PubSubClient, tracingMiddleware, Logger } from '@kalles-buss/shared-utils';
import express from 'express';
import knex from 'knex';
import config from '../knexfile';
import { ShiftAssignmentRequestedSchema } from './domain/events/shift-events';
import { DailyRestPolicy } from './domain/policies/daily-rest-policy';
import { CompetenceService } from './domain/skills/competence-service';
import { HealthService } from './domain/health/health-service';
import { WelfareService } from './domain/welfare/welfare-service';
import { LifeCycleService } from './domain/lifecycle/life-cycle-service';
import { PayrollListener } from './domain/payroll/payroll-listener';
import { OnboardingService } from './domain/recruitment/onboarding-service';
import { v4 as uuidv4 } from 'uuid';

async function start() {
  const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
  const db = knex(dbConfig!);
  const pubsub = new PubSubClient();

  // Services
  const competenceService = new CompetenceService(db);
  const healthService = new HealthService(db);
  const welfareService = new WelfareService(db);
  const lifeCycleService = new LifeCycleService(db);
  const payrollListener = new PayrollListener(db);
  const onboardingService = new OnboardingService(db, pubsub);

  const app = express();
  app.use(express.json());
  app.use(tracingMiddleware);
  
  const port = process.env.PORT || 8080;

  app.get('/', (req, res) => res.json({ status: 'UP', service: 'kalles-hr', message: 'Enterprise HR Vault is live! 🛡️', revision: process.env.K_REVISION || 'local' }));

  // --- SANDBOX & TESTING ---
  app.post('/api/sandbox/reset', async (req, res) => {
    Logger.warn('[HR] Sandbox Reset Triggered - PURGING DATA');
    try {
      await db("employee_lifecycle_steps").del();
      await db("employee_lifecycle_workflows").del();
      await db("lifecycle_template_steps").del();
      await db("lifecycle_process_templates").del();
      await db("lifecycle_action_definitions").del();
      await db("onboarding_workflows").del();
      await db("job_applications").del();
      await db("job_postings").del();
      await db("hiring_requisitions").del();
      await db("person_contact_details").del();
      await db("audit_events").del();
      await db("domain_events").del();
      await db("travel_claims").del();
      await db("expense_claims").del();
      await db("tax_tables").del();
      await db("balance_ledger").del();
      await db("emergency_contacts").del();
      await db("rehab_steps").del();
      await db("rehab_plans").del();
      await db("medical_certificates").del();
      await db("sick_days").del();
      await db("sick_leave_medical_records").del();
      await db("sick_leave_cases").del();
      await db("compensation_records").del();
      await db("reconciled_shifts").del();
      await db("time_entries").del();
      await db("planned_shifts").del();
      await db("work_records").del();
      await db("training_records").del();
      await db("specializations").del();
      await db("vehicle_authorizations").del();
      await db("certifications").del();
      await db("licenses").del();
      await db("qualification_profiles").del();
      await db("contract_amendments").del();
      await db("employees").update({ current_contract_id: null });
      await db("employment_contracts").del();
      await db("employees").del();
      await db("cost_centers").del();
      await db("departments").del();
      await db("job_definitions").del();
      await db("job_levels").del();
      await db("pay_types").del();
      await db("collective_agreement_configs").del();
      
      res.json({ message: 'HR Domain Purged' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sandbox/seed', async (req, res) => {
    const { roster } = req.body;
    Logger.info(`[HR] Seeding sandbox with ${roster?.length || 0} employees`);
    try {
      const dep = await db('departments').first();
      const cc = await db('cost_centers').first();
      const job = await db('job_definitions').first();

      if (roster && roster.length > 0) {
        for (const emp of roster) {
          const employeeId = uuidv4();
          await db('employees').insert({
            id: employeeId,
            employee_number: emp.id || `EMP-${Math.floor(Math.random()*1000)}`,
            person_number_encrypted: 'SEED_DATA',
            personal_data_encrypted: JSON.stringify({ firstName: emp.name || 'Sim', lastName: 'Employee' }),
            primary_role: emp.role || 'DRIVER',
            department_id: dep.id,
            cost_center_id: cc.id,
            job_definition_id: job.id,
            employment_status: 'ACTIVE',
            legal_gender: 'NON_BINARY'
          }).onConflict('employee_number').ignore();
        }
      }
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- STAFF MANAGEMENT (Operational View) ---
  app.get('/api/staff', async (req, res) => {
    try {
      // Using the view which provides operational data safely
      const staff = await db('active_workforce_view').select('*');
      
      // Map to the format expected by other domains (Depot/Portal)
      const operationalStaff = staff.map(s => ({
        id: s.employee_id,
        name: `Employee ${s.employee_number}`, // In a real system, we'd decrypt the name here
        role: s.primary_role,
        home_depot_id: s.department_id, // Simplified mapping for now
        status: s.employment_status === 'ACTIVE' ? 'AVAILABLE' : 'AWAY',
        compliance: s.compliance_is_compliant
      }));

      res.json(operationalStaff);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Detailed employee view (requires decryption in real app)
  app.get('/api/staff/:id', async (req, res) => {
    try {
      const employee = await db('employees').where({ id: req.params.id }).first();
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      
      // Mock decryption for demo purposes
      const personalData = JSON.parse(employee.personal_data_encrypted);
      
      res.json({
        ...employee,
        personalData
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/staff', async (req, res) => {
    const { 
      name, role, departmentCode, costCenterCode, personNumber, skills, legalGender, jobCode,
      workEmail, privateEmail, workPhone, privatePhone, addressStreet, addressCity, addressZip
    } = req.body;
    Logger.info(`[HR] Hiring process started for ${name} (${role})`);
    try {
      const dep = await db('departments').where({ code: departmentCode || 'MAINT' }).first();
      const cc = await db('cost_centers').where({ code: costCenterCode || 'CC-200' }).first();
      
      if (!dep) throw new Error(`Department ${departmentCode} not found`);
      if (!cc) throw new Error(`Cost Center ${costCenterCode} not found`);

      // Attempt to find a job definition
      const jobDef = await db('job_definitions')
        .where({ job_code: jobCode || (role === 'DRIVER' ? 'DRV_URBAN' : 'MECH_SNR') })
        .first();

      const employeeId = uuidv4();
      const employeeNumber = `EMP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // In a real system, we'd generate a DEK here
      const personalData = { firstName: name.split(' ')[0], lastName: name.split(' ')[1] || '', email: `${name.toLowerCase().replace(' ', '.')}@kallesbuss.se` };

      Logger.info(`[HR] Inserting employee ${employeeNumber}...`);
      const [employee] = await db('employees').insert({
        id: employeeId,
        employee_number: employeeNumber,
        person_number_encrypted: personNumber || 'encrypted_placeholder',
        personal_data_encrypted: JSON.stringify(personalData),
        primary_role: role || 'DRIVER',
        department_id: dep.id,
        cost_center_id: cc.id,
        employment_status: 'ACTIVE',
        legal_gender: legalGender || 'FEMALE',
        job_definition_id: jobDef?.id || null,
        
        // New Contact Fields
        work_email: workEmail,
        private_email: privateEmail,
        work_phone: workPhone,
        private_phone: privatePhone,
        home_address_street: addressStreet,
        home_address_city: addressCity,
        home_address_zip: addressZip
      }).returning('*');

      Logger.info(`[HR] Creating contract for ${employeeNumber}...`);
      // Create mock contract for the new hire
      const [contract] = await db('employment_contracts').insert({
        employee_id: employeeId,
        contract_type: 'PERMANENT',
        start_date: new Date().toISOString().split('T')[0],
        collective_agreement_code: 'BUSSAVTALET_2024',
        scheduled_weekly_hours: 40,
        salary_terms_encrypted: JSON.stringify({ baseAmount: 30000, currency: 'SEK' }),
        is_current: true
      }).returning('*');

      await db('employees').where({ id: employeeId }).update({ current_contract_id: contract.id });

      Logger.info(`[HR] Creating work record...`);
      // Create mock work record
      const [workRecord] = await db('work_records').insert({
        employee_id: employeeId,
        contract_id: contract.id,
        period_year: 2026,
        period_month: 6,
        status: 'OPEN'
      }).returning('*');

      Logger.info(`[HR] Creating compensation record...`);
      // Create initial compensation record for the new hire (Mock)
      await db('compensation_records').insert({
        employee_id: employeeId,
        contract_id: contract.id,
        work_record_id: workRecord.id,
        period_year: 2026,
        period_month: 6,
        gross_pay_amount: 30000,
        pay_lines_encrypted: '[]',
        deductions_encrypted: '[]',
        pension_contributions_encrypted: '[]',
        tax_calculation_encrypted: '[]',
        status: 'DRAFT'
      });

      Logger.info(`[HR] Publishing sync event...`);
      await pubsub.publish('hr-events', {
        eventType: 'StaffCreated',
        staff: {
          id: employee.id,
          name: name,
          role: employee.primary_role,
          home_depot_id: employee.department_id,
          skills: skills || []
        }
      });

      Logger.info(`[HR] Hiring process completed for ${employeeNumber}`);

      // --- DELEGATE TO PROCESS ENGINE ---
      try {
        const PROCESS_ENGINE_URL = process.env.PROCESS_ENGINE_URL || 'http://localhost:8086';
        await axios.post(`${PROCESS_ENGINE_URL}/api/lifecycle/employee/${employeeId}/initiate`, {
          targetRole: role || 'DRIVER'
        });
        Logger.info(`[HR] Notified Process Engine to initiate onboarding for ${employeeId}`);
      } catch (wfErr: any) {
        Logger.warn(`[HR] Failed to notify Process Engine: ${wfErr.message}`);
      }

      res.json(employee);
    } catch (err: any) {
      Logger.error(`[HR] Hiring failed: ${err.message}`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- ANALYTICS & COMPLIANCE ---
app.get('/api/hr/analytics/forecast', async (req, res) => {
  try {
    const forecast = await db('employment_contracts')
      .where({ is_current: true })
      .select(db.raw('SUM(CAST(CAST(salary_terms_encrypted AS JSONB)->>\'baseAmount\' AS DECIMAL)) as total_base_payroll'));
    res.json(forecast[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/hr/analytics/pay-gap', async (req, res) => {
  try {
    // Aggregates average salary by role and gender using the ActiveWorkforceView
    const stats = await db('active_workforce_view as v')
      .join('employees as e', 'v.employee_id', 'e.id')
      .join('employment_contracts as ec', 'e.id', 'ec.employee_id')
      .where('ec.is_current', true)
      .select(
        'v.primary_role',
        'e.legal_gender',
        db.raw('AVG(CAST(CAST(ec.salary_terms_encrypted AS JSONB)->>\'baseAmount\' AS DECIMAL)) as avg_salary'),
        db.raw('COUNT(*) as employee_count')
      )
      .groupBy('v.primary_role', 'e.legal_gender');
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


  app.get('/api/hr/compliance/expiries', async (req, res) => {
    try {
      const expiries = await db('qualification_expiry_view').select('*');
      res.json(expiries);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/hr/jobs', async (req, res) => {
    try {
      const jobs = await db('job_definitions')
        .join('job_levels', 'job_definitions.job_level_id', 'job_levels.id')
        .select('job_definitions.*', 'job_levels.level', 'job_levels.description as level_description');
      res.json(jobs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- RECRUITMENT LIFECYCLE (Collaborative Agent/Human APIs) ---

  /**
   * DECISION: Identify need and create a requisition.
   */
  app.post('/api/hr/recruitment/requisitions', async (req, res) => {
    const { jobCode, departmentCode, count, justification, requestedById } = req.body;
    try {
      const job = await db('job_definitions').where({ job_code: jobCode }).first();
      const dep = await db('departments').where({ code: departmentCode }).first();
      
      const [row] = await db('hiring_requisitions').insert({
        job_definition_id: job.id,
        department_id: dep.id,
        count: count || 1,
        justification,
        requested_by_id: requestedById,
        status: 'APPROVED' // Auto-approve for demo
      }).returning('id');

      const reqId = typeof row === 'object' ? row.id : row;

      await pubsub.publish('hr-events', { eventType: 'HiringRequisitionCreated', requisitionId: reqId });
      res.json({ id: reqId, status: 'APPROVED' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/hr/recruitment/requisitions', async (req, res) => {
    try {
      const requisitions = await db('hiring_requisitions')
        .join('job_definitions', 'hiring_requisitions.job_definition_id', 'job_definitions.id')
        .join('departments', 'hiring_requisitions.department_id', 'departments.id')
        .select(
          'hiring_requisitions.*',
          'job_definitions.title',
          'departments.name as department_name'
        );
      res.json(requisitions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUBLICATION: Create a job posting from an approved requisition.
   */
  app.post('/api/hr/recruitment/postings', async (req, res) => {
    const { requisitionId, title, advertisementText, channels } = req.body;
    try {
      const [row] = await db('job_postings').insert({
        requisition_id: requisitionId,
        title,
        advertisement_text: advertisementText,
        distribution_channels: JSON.stringify(channels || ['INTERNAL'])
      }).returning('id');

      const postId = typeof row === 'object' ? row.id : row;

      await db('hiring_requisitions').where({ id: requisitionId }).update({ status: 'POSTED' });
      
      await pubsub.publish('hr-events', { eventType: 'JobPosted', postingId: postId, title });
      res.json({ id: postId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * SELECTION: Submit a candidate application (Agent can screen these).
   */
  app.post('/api/hr/recruitment/applications', async (req, res) => {
    const { postingId, name, email, cvData } = req.body;
    try {
      const [row] = await db('job_applications').insert({
        posting_id: postingId,
        candidate_name: name,
        candidate_email: email,
        cv_data_encrypted: JSON.stringify(cvData || {}),
        status: 'RECEIVED'
      }).returning('id');

      const appId = typeof row === 'object' ? row.id : row;

      await pubsub.publish('hr-events', { eventType: 'ApplicationReceived', applicationId: appId, candidateName: name });
      res.json({ id: appId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * ENROLLMENT: Activate a candidate as an employee.
   * This is where the transition happens.
   */
  app.post('/api/hr/recruitment/applications/:id/hire', async (req, res) => {
    const appId = req.params.id;
    try {
      const application = await db('job_applications').where({ id: appId }).first();
      const posting = await db('job_postings').where({ id: application.posting_id }).first();
      const requisition = await db('hiring_requisitions').where({ id: posting.requisition_id }).first();

      const employeeId = uuidv4();
      const employeeNumber = `EMP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const cc = await db('cost_centers').first(); // Get any valid cost center

      // 1. Create Core Employee
      await db('employees').insert({
        id: employeeId,
        employee_number: employeeNumber,
        person_number_encrypted: 'PENDING_ONBOARDING',
        personal_data_encrypted: JSON.stringify({ firstName: application.candidate_name.split(' ')[0], lastName: application.candidate_name.split(' ')[1] || '' }),
        primary_role: requisition.job_definition_id ? 'WAITING_ASSIGNMENT' : 'NEW_HIRE',
        department_id: requisition.department_id,
        cost_center_id: cc.id,
        employment_status: 'PROBATION'
      });

      // 2. Start Onboarding Workflow (Human/Agent checklist)
      await db('onboarding_workflows').insert({
        application_id: appId,
        employee_id: employeeId,
        checklist: JSON.stringify([
          { task: 'ID_VERIFICATION', status: 'PENDING' },
          { task: 'BANK_DETAILS', status: 'PENDING' },
          { task: 'EQUIPMENT_HANDOVER', status: 'PENDING' }
        ])
      });

      await db('job_applications').where({ id: appId }).update({ status: 'HIRED' });

      res.json({ employeeId, employeeNumber, message: 'Onboarding workflow initiated.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- NEW PROFESSIONAL GAP ENDPOINTS ---

  app.get('/api/staff/:id/ice', async (req, res) => {
    try {
      const contacts = await db('emergency_contacts').where({ employee_id: req.params.id });
      res.json(contacts || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/staff/:id/balances', async (req, res) => {
    try {
      const balances = await db('balance_ledger')
        .where({ employee_id: req.params.id })
        .select('balance_type')
        .sum('amount as current_balance')
        .groupBy('balance_type');
      res.json(balances);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/staff/:id/contacts', async (req, res) => {
    try {
      const contacts = await db('person_contact_details')
        .where({ employee_id: req.params.id })
        .orderBy('valid_from', 'desc');
      res.json(contacts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/staff/:id/contacts', async (req, res) => {
    const { type, category, content, isPrimary } = req.body;
    try {
      // If setting a new primary of same type, nullify old primary
      if (isPrimary) {
        await db('person_contact_details')
          .where({ employee_id: req.params.id, type, is_primary: true })
          .update({ is_primary: false });
      }

      const [newContact] = await db('person_contact_details').insert({
        employee_id: req.params.id,
        type,
        category,
        content_encrypted: JSON.stringify(content),
        is_primary: !!isPrimary
      }).returning('*');

      res.json(newContact);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/hr/expenses', async (req, res) => {
    try {
      const claims = await db('expense_claims')
        .join('employees', 'expense_claims.employee_id', 'employees.id')
        .select('expense_claims.*', 'employees.employee_number');
      res.json(claims);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/hr/travel', async (req, res) => {
    try {
      const claims = await db('travel_claims')
        .join('employees', 'travel_claims.employee_id', 'employees.id')
        .select('travel_claims.*', 'employees.employee_number');
      res.json(claims);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- CONFIGURATION ---
  app.get('/api/config/agreements', async (req, res) => {
    try {
      const configs = await db('collective_agreement_configs').select('*');
      res.json(configs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/staff/:id/compensation/latest', async (req, res) => {
    try {
      const record = await db('compensation_records')
        .where({ employee_id: req.params.id })
        .orderBy('period_year', 'desc')
        .orderBy('period_month', 'desc')
        .first();
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/compensation/:id/approve', async (req, res) => {
    try {
      const record = await db('compensation_records').where({ id: req.params.id }).first();
      if (!record) return res.status(404).json({ error: 'Record not found' });

      await db('compensation_records').where({ id: record.id }).update({ status: 'APPROVED' });

      await pubsub.publish('hr-events', {
        eventType: 'CompensationApproved',
        payload: {
          employee_id: record.employee_id,
          period_year: record.period_year,
          period_month: record.period_month,
          gross_amount: record.gross_pay_amount
        }
      });

      res.json({ message: 'Compensation approved and sent to Payroll' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => Logger.info(`[HR] Enterprise Service listening on port ${port}`));

  // Pub/Sub Guardrail Listener
  await pubsub.subscribe('hr-events', 'hr-guardrails-sub', async (event: any) => {
    try {
      if (event.eventType !== 'ShiftAssignmentRequested') return;
      
      const parsedEvent = ShiftAssignmentRequestedSchema.parse(event);
      const lastShift = await db('shifts').where({ staff_id: parsedEvent.driverId, status: 'COMPLETED' }).orderBy('planned_end_time', 'desc').first();

      if (lastShift) {
        const lastEndTime = new Date(lastShift.planned_end_time);
        const proposedStartTime = new Date(parsedEvent.proposedStartTime);
        DailyRestPolicy.evaluate(lastEndTime, proposedStartTime);
      }
      
      await db('shifts').insert({
        staff_id: parsedEvent.driverId,
        planned_start_time: parsedEvent.proposedStartTime,
        planned_end_time: parsedEvent.proposedEndTime,
        status: 'SCHEDULED'
      });
    } catch (err: any) {
      Logger.error('[HR] Error processing shift request:', err.message);
    }
  });
}

start().catch(console.error);
