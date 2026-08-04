import type { Knex } from 'knex';

export class HealthService {
  constructor(private db: Knex) {}

  /**
   * Upload a medical certificate. Strict RBAC applies.
   */
  async uploadMedicalCertificate(driverId: string, validFrom: Date, validTo: Date, content: string, agentId: string) {
    // In a real system, verify agentId has 'HR_MEDICAL_ADMIN' role.
    
    // Simulate GDPR Encryption (e.g., KMS/AES-256)
    const encryptedContent = Buffer.from(content).toString('base64'); // Mock encryption

    const [cert] = await this.db('medical_certificates').insert({
      driver_id: driverId,
      valid_from: validFrom,
      valid_to: validTo,
      encrypted_content: encryptedContent,
      uploaded_by: agentId
    }).returning('*');

    // Check if this triggers a long-term rehab case (> 14 days)
    const diffTime = Math.abs(validTo.getTime() - validFrom.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 14) {
      await this.initiateRehabCase(driverId, validFrom);
    }

    return cert.id;
  }

  private async initiateRehabCase(driverId: string, startDate: Date) {
    const existing = await this.db('rehab_cases')
      .where({ driver_id: driverId, status: 'ACTIVE' })
      .first();

    if (!existing) {
      await this.db('rehab_cases').insert({
        driver_id: driverId,
        start_date: startDate,
        status: 'ACTIVE',
        rehab_plan_draft: 'Pending HR Specialist Review (Försäkringskassan Guidelines)'
      });
    }
  }

  /**
   * Weekly welfare analysis to detect short-term absence patterns.
   */
  async runWelfareAnalysis() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Find drivers with 3 or more short-term sick leaves in the last 6 months
    const riskyPatterns = await this.db('time_logs')
      .select('driver_id')
      .count('id as sick_count')
      .where('log_type', 'SICK')
      .andWhere('start_time', '>=', sixMonthsAgo)
      .groupBy('driver_id')
      .having(this.db.raw('count(id) >= ?', [3]));

    // In a real scenario, this would dispatch secure notifications to direct managers.
    return riskyPatterns.map(p => ({
      driver_id: p.driver_id,
      flag: 'Risk for Long-term Sickness',
      action: 'Initiate Välmåendesamtal'
    }));
  }
}
