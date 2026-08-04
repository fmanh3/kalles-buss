import type { Knex } from 'knex';

export class PayrollListener {
  constructor(private db: Knex) {}

  /**
   * Passive listener for "ShiftCompleted" events from Traffic.
   */
  async consumeShiftCompletedEvent(driverId: string, regularHours: number, obHours: number) {
    const driver = await this.db('drivers').where({ id: driverId }).first();
    if (!driver) throw new Error('Driver not found');

    // 1. Calculate Gross Pay
    const basePay = regularHours * Number(driver.hourly_rate);
    // Simplified OB calculation (assume average 40 SEK/h for OB)
    const obPay = obHours * 40; 
    const totalGrossPay = basePay + obPay;

    // 2. Draft Payroll Record (Internal HR representation)
    const [record] = await this.db('payroll_records').insert({
      driver_id: driverId,
      period: new Date().toISOString().substring(0, 7), // e.g., '2026-04'
      base_pay_amount: basePay,
      ob_pay_amount: obPay,
      overtime_pay_amount: 0,
      total_gross_pay: totalGrossPay,
      status: 'DRAFT'
    }).returning('*');

    // 3. Transform to Finance "PayrollProvisionOrder"
    const socialFees = totalGrossPay * 0.3142; // Arbetsgivaravgifter
    const financeProvisionEvent = {
      event_type: 'PAYROLL_PROVISION_ORDER',
      driver_id: driverId,
      gross_salary: totalGrossPay,
      social_fees: socialFees,
      suggested_accounts: [
        { account_code: '7010', debit: totalGrossPay, credit: 0 }, // Löner
        { account_code: '7510', debit: socialFees, credit: 0 }, // Lagstadgade sociala avgifter
        { account_code: '2730', debit: 0, credit: socialFees } // Skulder sociala avgifter
      ]
    };

    return {
      internal_record: record,
      finance_event: financeProvisionEvent
    };
  }
}
