import { describe, it, expect } from 'vitest';
import axios from 'axios';

const HR_URL = 'http://localhost:8082';

// NOTE: This test requires a running HR service and Process Engine
describe('Collaborative Recruitment Flow (Integration)', () => {
  it('should complete a full hiring lifecycle from requisition to hire', async () => {
    // 0. Get an existing employee for requester ID
    const staffRes0 = await axios.get(`${HR_URL}/api/staff`);
    const requester = staffRes0.data[0];
    expect(requester).toBeDefined();

    // Step 1: Human (CEO) identifies need
    const reqRes = await axios.post(`${HR_URL}/api/hr/recruitment/requisitions`, {
      jobCode: 'MECH_SNR',
      departmentCode: 'MAINT',
      justification: 'High growth in electric fleet requires more HV specialists.',
      requestedById: requester.id
    });
    const requisitionId = reqRes.data.id;
    expect(requisitionId).toBeDefined();

    // Step 2: Agent (Recruiter) creates Posting
    const postRes = await axios.post(`${HR_URL}/api/hr/recruitment/postings`, {
      requisitionId,
      title: 'Senior Electric Bus Mechanic (E2E Test)',
      advertisementText: 'Join the revolution of sustainable transport at Kalles Buss!',
      channels: ['LINKEDIN', 'INDEED']
    });
    const postingId = postRes.data.id;
    expect(postingId).toBeDefined();

    // Step 3: Candidate applies
    const appRes = await axios.post(`${HR_URL}/api/hr/recruitment/applications`, {
      postingId,
      name: 'Maja Mekatronik',
      email: 'maja.test@example.com',
      cvData: { yearsExperience: 10, skills: ['HV_BATTERY', 'SCANIA_SDS'] }
    });
    const applicationId = appRes.data.id;
    expect(applicationId).toBeDefined();

    // Step 4: Enrollment
    const enrollRes = await axios.post(`${HR_URL}/api/hr/recruitment/applications/${applicationId}/hire`);
    const newEmployeeId = enrollRes.data.employeeId;
    expect(newEmployeeId).toBeDefined();
    
    // Step 5: Verification
    const staffRes = await axios.get(`${HR_URL}/api/staff`);
    const newHire = staffRes.data.find((s: any) => s.id === newEmployeeId);
    expect(newHire).toBeDefined();
    expect(newHire.status).toBe('AWAY'); // New hires in PROBATION are mapped to AWAY in the operational view
  });
});
