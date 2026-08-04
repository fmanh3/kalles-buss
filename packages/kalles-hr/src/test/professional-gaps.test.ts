import { describe, it, expect } from 'vitest';
import axios from 'axios';

const HR_URL = 'http://localhost:8082';

describe('Professional HR Gaps (Integration)', () => {
  it('should verify that all enterprise extensions are responsive', async () => {
    // 0. Get a test employee from seed
    const staffRes = await axios.get(`${HR_URL}/api/staff`);
    const employee = staffRes.data[0];
    expect(employee).toBeDefined();
    const empId = employee.id;

    // 1. ICE Contacts
    const iceRes = await axios.get(`${HR_URL}/api/staff/${empId}/ice`);
    expect(Array.isArray(iceRes.data)).toBe(true);

    // 2. Balance Ledger
    const balanceRes = await axios.get(`${HR_URL}/api/staff/${empId}/balances`);
    expect(Array.isArray(balanceRes.data)).toBe(true);

    // 3. Collective Agreements
    const configRes = await axios.get(`${HR_URL}/api/config/agreements`);
    expect(Array.isArray(configRes.data)).toBe(true);

    // 4. Expenses & Travel
    const expenseRes = await axios.get(`${HR_URL}/api/hr/expenses`);
    const travelRes = await axios.get(`${HR_URL}/api/hr/travel`);
    expect(Array.isArray(expenseRes.data)).toBe(true);
    expect(Array.isArray(travelRes.data)).toBe(true);
  });
});
