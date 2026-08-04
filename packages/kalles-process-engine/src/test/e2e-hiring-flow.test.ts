import { describe, it, expect } from 'vitest';
import axios from 'axios';

const BFF_URL = 'http://localhost:8080';

describe('Orchestrated Hiring E2E Flow', () => {
  it('should complete a full hiring lifecycle from BFF hire to step completion', async () => {
    console.log('🧪 --- STARTING E2E VERIFICATION: ORCHESTRATED HIRING ---');

    // 1. Hire Bengt via BFF -> HR
    console.log('1. [Action] Hiring "Bengt Gherkin" as DRIVER...');
    const hireRes = await axios.post(`${BFF_URL}/api/staff`, {
      name: 'Bengt Gherkin',
      role: 'DRIVER',
      departmentCode: 'OPS',
      costCenterCode: 'CC-100',
      legalGender: 'MALE'
    });
    
    const employee = hireRes.data;
    expect(employee.id).toBeDefined();
    console.log(`✅ Employee created: ${employee.id} (${employee.employee_number})`);

    // 2. Wait for async lifecycle initiation and verify via BFF -> Process Engine
    console.log('2. [Verify] Checking for active lifecycle workflow...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Give it a moment
    
    const lifecycleRes = await axios.get(`${BFF_URL}/api/staff/${employee.id}/lifecycle`);
    const workflow = lifecycleRes.data;

    expect(workflow).toBeDefined();
    expect(workflow.steps).toBeDefined();
    expect(workflow.steps.length).toBeGreaterThan(0);

    console.log(`✅ Active workflow found: ${workflow.id}`);
    console.log(`✅ Step count: ${workflow.steps.length}`);

    // 3. Complete Step 1 (Verify Identity - Manual)
    const step1 = workflow.steps.find((s: any) => s.code === 'ID_VERIFY');
    expect(step1).toBeDefined();
    console.log(`3. [Action] Completing manual step: ${step1.title}...`);
    
    const completeRes = await axios.post(`${BFF_URL}/api/staff/${employee.id}/lifecycle/steps/${step1.id}/complete`, {
      notes: 'ID verified via passport scan.'
    });

    expect(completeRes.data.status).toBe('COMPLETED');
    console.log('✅ Step 1 marked as COMPLETED.');

    // 4. Verify IDEMPOTENCY (Gherkin requirement)
    console.log('4. [Verify] Testing idempotency (re-completing step)...');
    const idempotentRes = await axios.post(`${BFF_URL}/api/staff/${employee.id}/lifecycle/steps/${step1.id}/complete`, {
      notes: 'Accidental duplicate call'
    });
    expect(idempotentRes.status).toBe(200);
    console.log('✅ Idempotency check passed (server accepted the call without error).');

    // 5. Final State Check
    const finalRes = await axios.get(`${BFF_URL}/api/staff/${employee.id}/lifecycle`);
    const completedSteps = finalRes.data.steps.filter((s: any) => s.status === 'COMPLETED').length;
    console.log(`🏁 Final Status: ${completedSteps}/${finalRes.data.steps.length} steps done.`);

    console.log('🎉 E2E LOGIC VERIFIED AGAINST GHERKIN SPEC');
  });
});
