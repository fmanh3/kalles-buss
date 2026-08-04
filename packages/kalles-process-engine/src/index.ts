import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import Knex from 'knex';
import knexConfig from './knexfile';
import { Logger, tracingMiddleware, PubSubClient } from '@kalles-buss/shared-utils';

const app = express();
const port = process.env.PORT || 8086; // New port for Process Engine
const db = Knex(knexConfig.development);
const pubsub = new PubSubClient();

app.use(cors());
app.use(express.json());
app.use(tracingMiddleware);

app.get('/', (req, res) => res.json({ status: 'UP', service: 'kalles-process-engine', message: 'The Elevator is moving! 🛗' }));

// --- SANDBOX & TESTING ---
app.post('/api/sandbox/reset', async (req, res) => {
  Logger.warn('[Process-Engine] Sandbox Reset Triggered - PURGING DATA');
  try {
    await db("employee_lifecycle_steps").del();
    await db("employee_lifecycle_workflows").del();
    await db("lifecycle_template_steps").del();
    await db("lifecycle_process_templates").del();
    await db("lifecycle_action_definitions").del();
    res.json({ message: 'Process Engine Purged' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- LIFECYCLE MANAGEMENT ---

/**
 * Get active workflow for an employee
 */
app.get('/api/lifecycle/employee/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  try {
    const workflow = await db('employee_lifecycle_workflows')
      .where({ employee_id: employeeId, status: 'ACTIVE' })
      .first();

    if (!workflow) return res.json({ steps: [], status: 'NONE' });

    const steps = await db('employee_lifecycle_steps')
      .join('lifecycle_action_definitions', 'employee_lifecycle_steps.action_definition_id', 'lifecycle_action_definitions.id')
      .where({ workflow_id: workflow.id })
      .select(
        'employee_lifecycle_steps.*',
        'lifecycle_action_definitions.title',
        'lifecycle_action_definitions.code',
        'lifecycle_action_definitions.type',
        'lifecycle_action_definitions.domain'
      )
      .orderBy('created_at', 'asc');

    res.json({ ...workflow, steps });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Initiate a new workflow for an employee
 */
app.post('/api/lifecycle/employee/:employeeId/initiate', async (req, res) => {
  const { employeeId } = req.params;
  const { templateName, targetRole } = req.body;
  Logger.info(`[Process] Initiating lifecycle for employee ${employeeId} (Role: ${targetRole}, Template: ${templateName})`);
  try {
    const template = await db('lifecycle_process_templates')
      .where({ target_role: targetRole })
      .orWhere({ name: templateName || '___NON_EXISTENT___' })
      .first();

    if (!template) {
      Logger.warn(`[Process] No matching template found for role ${targetRole}`);
      throw new Error('No matching process template found');
    }

    Logger.info(`[Process] Found template: ${template.name} (${template.id})`);

    const [row] = await db('employee_lifecycle_workflows').insert({
      employee_id: employeeId,
      template_id: template.id,
      status: 'ACTIVE'
    }).returning('id');

    const wId = typeof row === 'object' ? row.id : row;

    const templateSteps = await db('lifecycle_template_steps')
      .where({ template_id: template.id })
      .orderBy('sort_order', 'asc');

    Logger.info(`[Process] Creating ${templateSteps.length} steps for workflow ${wId}`);

    const workflowSteps = templateSteps.map(ts => ({
      workflow_id: wId,
      action_definition_id: ts.action_definition_id,
      status: 'PENDING'
    }));

    if (workflowSteps.length > 0) {
      await db('employee_lifecycle_steps').insert(workflowSteps);
    }

    Logger.info(`[Process] Lifecycle workflow ${wId} initiated successfully.`);
    res.json({ workflowId: wId, stepCount: workflowSteps.length });
  } catch (err: any) {
    Logger.error(`[Process] Initiation failed: ${err.message}`, err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Complete a specific step in a workflow
 */
app.post('/api/lifecycle/steps/:stepId/complete', async (req, res) => {
  const { stepId } = req.params;
  const { notes, resultData, completedById } = req.body;
  try {
    const [updatedStep] = await db('employee_lifecycle_steps')
      .where({ id: stepId })
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        notes,
        result_data: resultData ? JSON.stringify(resultData) : null,
        completed_by_id: completedById
      })
      .returning('*');

    // Check if all steps are done to auto-complete workflow
    const remaining = await db('employee_lifecycle_steps')
      .where({ workflow_id: updatedStep.workflow_id, status: 'PENDING' })
      .count('id as count')
      .first();

    if (parseInt(remaining?.count as string || '0') === 0) {
      await db('employee_lifecycle_workflows')
        .where({ id: updatedStep.workflow_id })
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() });
      
      await pubsub.publish('process-events', { 
        eventType: 'WorkflowCompleted', 
        workflowId: updatedStep.workflow_id,
        employeeId: (await db('employee_lifecycle_workflows').where({id: updatedStep.workflow_id}).first()).employee_id
      });
    }

    res.json(updatedStep);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  Logger.info(`[Process-Engine] Listening on port ${port}`);
});
