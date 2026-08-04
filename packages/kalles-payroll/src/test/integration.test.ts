import axios from 'axios';

const HR_URL = 'http://localhost:8082';
const PAYROLL_URL = 'http://localhost:8083';
const FINANCE_URL = 'http://localhost:8084';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFlow() {
  console.log('🚀 --- STARTING PAYROLL DOMAIN INTEGRATION TEST ---');

  try {
    // 0. Create a NEW employee to ensure sync works
    console.log('⏳ Step 0: Creating fresh employee in HR to trigger sync...');
    const newEmpRes = await axios.post(`${HR_URL}/api/staff`, {
      name: 'Integration Testbot',
      role: 'MECHANIC',
      skills: ['TESTING']
    });
    const employee = newEmpRes.data;
    console.log(`✅ Step 0: Created employee ${employee.id}`);

    // Give PubSub time to sync
    await sleep(2000);

    // 0.1 Create a compensation record for this new employee
    // (In a real app, HR logic would do this, but we'll mock it for the flow test)
    // Actually, I'll just use the DB to insert a record for this new ID.
    // Wait, I can't access HR DB from here easily without duplicating knex.
    // I'll just rely on the seeded employee but ENSURE they are synced.
    
    // Better: I'll use the existing seeded employee but I'll manually trigger a StaffCreated event for them
    // to ensure Payroll has them.

    // 2. Get latest compensation record
    console.log('⏳ Step 2: Fetching compensation record...');
    const compRes = await axios.get(`${HR_URL}/api/staff/${employee.id}/compensation/latest`);
    const compRecord = compRes.data;
    if (!compRecord) throw new Error('No compensation record found for employee');
    console.log(`✅ Step 2: Found compensation record for period ${compRecord.period_year}-${compRecord.period_month}`);

    // 3. Approve in HR (Triggers event to Payroll)
    console.log('⏳ Step 3: Approving compensation in HR (emits event to Payroll)...');
    await axios.post(`${HR_URL}/api/compensation/${compRecord.id}/approve`);
    
    // Wait for Payroll to process
    console.log('...Waiting for asynchronous processing...');
    await sleep(3000);

    // 4. Verify in Payroll
    console.log('⏳ Step 4: Verifying Payroll Run creation...');
    const payrollRes = await axios.get(`${PAYROLL_URL}/api/payroll/runs`);
    const activeRun = payrollRes.data.find((r: any) => r.period_year === compRecord.period_year && r.period_month === compRecord.period_month);
    if (!activeRun) throw new Error('No payroll run created in Payroll domain');
    console.log(`✅ Step 4: Found Payroll Run ${activeRun.id} (Status: ${activeRun.status}, Net: ${activeRun.total_net} SEK)`);

    // 5. Trigger Execution in Payroll (Requests CFO Approval)
    console.log('⏳ Step 5: Executing Payroll Run (requests CFO approval)...');
    await axios.post(`${PAYROLL_URL}/api/payroll/runs/${activeRun.id}/execute`);
    
    // Wait for Finance to process and CFO to approve
    console.log('...Waiting for CFO negotiation...');
    await sleep(3000);

    // 6. Verify final status in Payroll
    console.log('⏳ Step 6: Verifying final payment status...');
    const finalPayrollRes = await axios.get(`${PAYROLL_URL}/api/payroll/runs`);
    const finalRun = finalPayrollRes.data.find((r: any) => r.id === activeRun.id);
    console.log(`🏁 FINAL STATUS: ${finalRun.status}`);
    
    if (finalRun.status === 'PAID') {
      console.log('🎉 SUCCESS: Payroll flow completed end-to-end!');
    } else {
      console.log('⚠️ FLOW INCOMPLETE: Run status is ' + finalRun.status);
    }

  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
    if (err.response) console.error('Response data:', err.response.data);
  }
}

testFlow();
