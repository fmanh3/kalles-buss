import { describe, it, expect } from 'vitest';
import axios from 'axios';

const HR_URL = 'http://localhost:8082';
const PAYROLL_URL = 'http://localhost:8083';
const FINANCE_URL = 'http://localhost:8084';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Payroll Domain Flow (Integration)', () => {
  it('should complete a full payroll run from HR approval to payment', async () => {
    // -1. Seed Finance Cash
    await axios.post(`${FINANCE_URL}/api/sandbox/seed`, { startingCashSek: 1000000 });
    
    // 0. Create a NEW employee to ensure sync works
    const newEmpRes = await axios.post(`${HR_URL}/api/staff`, {
      name: 'Integration Testbot',
      role: 'MECHANIC',
      skills: ['TESTING']
    });
    const employee = newEmpRes.data;
    expect(employee.id).toBeDefined();

    // Give PubSub time to sync
    await sleep(2000);

    // 2. Get latest compensation record
    const compRes = await axios.get(`${HR_URL}/api/staff/${employee.id}/compensation/latest`);
    const compRecord = compRes.data;
    expect(compRecord).toBeDefined();

    // 3. Approve in HR (Triggers event to Payroll)
    await axios.post(`${HR_URL}/api/compensation/${compRecord.id}/approve`);
    
    // Wait for Payroll to process
    await sleep(3000);

    // 4. Verify in Payroll
    const payrollRes = await axios.get(`${PAYROLL_URL}/api/payroll/runs`);
    const activeRun = payrollRes.data.find((r: any) => r.period_year === compRecord.period_year && r.period_month === compRecord.period_month);
    expect(activeRun).toBeDefined();

    // 5. Trigger Execution in Payroll (Requests CFO Approval)
    await axios.post(`${PAYROLL_URL}/api/payroll/runs/${activeRun.id}/execute`);
    
    // Wait for Finance to process and CFO to approve
    await sleep(3000);

    // 6. Verify final status in Payroll
    const finalPayrollRes = await axios.get(`${PAYROLL_URL}/api/payroll/runs`);
    const finalRun = finalPayrollRes.data.find((r: any) => r.id === activeRun.id);
    expect(finalRun.status).toBe('PAID');
  });
});
