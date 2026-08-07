import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import knex, { Knex } from 'knex';
import { HealthService } from '../domain/health/health-service';

describe('HealthService (Medical Vault & Rehab Automation)', () => {
  let db: Knex;
  let service: HealthService;

  beforeEach(async () => {
    // Set up rapid in-memory SQLite3 db for isolated testing
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true
    });

    // Create medical_certificates, rehab_cases, and time_logs schemas
    await db.schema.createTable('medical_certificates', (table) => {
      table.increments('id').primary();
      table.string('driver_id');
      table.date('valid_from');
      table.date('valid_to');
      table.text('encrypted_content');
      table.string('uploaded_by');
    });

    await db.schema.createTable('rehab_cases', (table) => {
      table.increments('id').primary();
      table.string('driver_id');
      table.date('start_date');
      table.string('status');
      table.text('rehab_plan_draft');
    });

    await db.schema.createTable('time_logs', (table) => {
      table.increments('id').primary();
      table.string('driver_id');
      table.string('log_type'); // e.g., 'SICK', 'WORK'
      table.datetime('start_time');
      table.datetime('end_time');
    });

    service = new HealthService(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('should upload a medical certificate, apply simulated GDPR encryption, and NOT trigger rehab if under 14 days', async () => {
    const validFrom = new Date('2026-05-01');
    const validTo = new Date('2026-05-10'); // exactly 9 days (under 14 days limit)
    const content = 'Driver has a mild case of seasonal flu. Advised bed rest.';

    const certId = await service.uploadMedicalCertificate(
      'DRIVER-007',
      validFrom,
      validTo,
      content,
      'HR-SPECIALIST-01'
    );

    expect(certId).toBeDefined();

    // 1. Verify certificate was stored and content encrypted (Base64)
    const storedCert = await db('medical_certificates').where({ id: certId }).first();
    expect(storedCert).toBeDefined();
    expect(storedCert.driver_id).toBe('DRIVER-007');
    expect(storedCert.uploaded_by).toBe('HR-SPECIALIST-01');
    expect(storedCert.encrypted_content).toBe(Buffer.from(content).toString('base64'));

    // 2. Verify NO active rehab case was generated
    const rehabCount = await db('rehab_cases').count('id as cnt').first();
    expect(Number(rehabCount?.cnt || 0)).toBe(0);
  });

  it('should automatically initiate an ACTIVE rehab case according to Försäkringskassan guidelines if sickness is 14 days or longer', async () => {
    const validFrom = new Date('2026-05-01');
    const validTo = new Date('2026-05-15'); // exactly 14 days (rehab trigger threshold)
    const content = 'Driver sustained a wrist fracture requiring stabilization and rehab.';

    const certId = await service.uploadMedicalCertificate(
      'DRIVER-101',
      validFrom,
      validTo,
      content,
      'HR-SPECIALIST-01'
    );

    expect(certId).toBeDefined();

    // Verify rehab case was generated automatically
    const rehab = await db('rehab_cases').where({ driver_id: 'DRIVER-101' }).first();
    expect(rehab).toBeDefined();
    expect(rehab.status).toBe('ACTIVE');
    expect(rehab.rehab_plan_draft).toContain('Pending HR Specialist Review (Försäkringskassan Guidelines)');
  });

  it('should run welfare analysis and flag drivers with 3 or more short-term sick leaves in the last 6 months', async () => {
    const driverIdToFlag = 'DRIVER-BAD-HEALTH';
    const driverIdHealthy = 'DRIVER-HEALTHY';

    // Insert sick logs in the last month (6 months ago is maximum limit)
    const now = new Date();
    const sickDate1 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10); // 10 days ago
    const sickDate2 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 20); // 20 days ago
    const sickDate3 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
    const oldSickDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 365); // 1 year ago (should be ignored)

    await db('time_logs').insert([
      // Flagged driver has 3 short-term sick logs in last 6 months
      { driver_id: driverIdToFlag, log_type: 'SICK', start_time: sickDate1 },
      { driver_id: driverIdToFlag, log_type: 'SICK', start_time: sickDate2 },
      { driver_id: driverIdToFlag, log_type: 'SICK', start_time: sickDate3 },
      
      // Healthy driver has only 2 sick logs
      { driver_id: driverIdHealthy, log_type: 'SICK', start_time: sickDate1 },
      { driver_id: driverIdHealthy, log_type: 'SICK', start_time: sickDate2 },

      // Out of bounds sick log (should be ignored)
      { driver_id: driverIdHealthy, log_type: 'SICK', start_time: oldSickDate }
    ]);

    const flaggedPatterns = await service.runWelfareAnalysis();

    expect(flaggedPatterns).toHaveLength(1);
    expect(flaggedPatterns[0].driver_id).toBe(driverIdToFlag);
    expect(flaggedPatterns[0].flag).toBe('Risk for Long-term Sickness');
    expect(flaggedPatterns[0].action).toBe('Initiate Välmåendesamtal');
  });
});
