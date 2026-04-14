import Knex from 'knex';
import { PayrollEngine } from '../domain/payroll/payroll-engine';

describe('UC-HR-02: Automatisk OB-beräkning (Payroll)', () => {
  let db: any;
  let payrollEngine: PayrollEngine;

  beforeAll(async () => {
    db = Knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true
    });

    await db.schema.createTable('ob_rates', (table: any) => {
      table.increments('id');
      table.string('name');
      table.string('start_time');
      table.string('end_time');
      table.json('days_of_week');
      table.decimal('rate_per_hour', 10, 2);
    });

    // Lägg till natt-OB (22:00 - 06:00)
    await db('ob_rates').insert({
      name: 'Natt-OB',
      start_time: '22:00',
      end_time: '23:59', // Förenklat för testet
      days_of_week: JSON.stringify([1,2,3,4,5]),
      rate_per_hour: 45.00
    });

    payrollEngine = new PayrollEngine(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('Scenario: Beräkning av natt-OB', async () => {
    // Given a driver performed a shift from 20:00 to 23:00 (3h)
    // 20:00 - 22:00 = 2h normal tid
    // 22:00 - 23:00 = 1h natt-OB
    const entry = {
      startTime: new Date('2026-03-27T20:00:00'),
      endTime: new Date('2026-03-27T23:00:00'),
      hourlyRate: 100.00
    };

    const result = await payrollEngine.calculateShiftPay(entry);

    // Then total hours should be 3.0
    expect(result.totalHours).toBe(3.0);
    // And base pay should be 300.00
    expect(result.basePay).toBe(300.00);
    // And OB pay should be 45.00 (1h * 45 SEK)
    expect(result.obPay).toBe(45.00);
    expect(result.totalGross).toBe(345.00);
  });
});
