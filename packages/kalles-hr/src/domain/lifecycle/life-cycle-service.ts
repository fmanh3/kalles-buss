import type { Knex } from 'knex';

export class LifeCycleService {
  constructor(private db: Knex) {}

  /**
   * Process a leave request. Calculates parental supplement if applicable.
   */
  async processLeaveRequest(driverId: string, startDate: Date, endDate: Date, leaveType: 'VACATION' | 'SICK' | 'PARENTAL' | 'OTHER') {
    const [request] = await this.db('leave_requests').insert({
      driver_id: driverId,
      start_date: startDate,
      end_date: endDate,
      leave_type: leaveType,
      status: 'APPROVED' // Auto-approve for Skeleton
    }).returning('*');

    // Emit event to Traffic (simulated by returning an event object)
    const trafficEvent = {
      type: 'EmployeeUnavailable',
      driver_id: driverId,
      from: startDate,
      to: endDate,
      reason: leaveType
    };

    let payrollSupplement = null;

    if (leaveType === 'PARENTAL') {
      payrollSupplement = await this.calculateParentalSupplement(driverId, startDate, endDate);
    }

    return {
      request,
      traffic_event: trafficEvent,
      payroll_supplement: payrollSupplement
    };
  }

  private async calculateParentalSupplement(driverId: string, startDate: Date, endDate: Date) {
    const driver = await this.db('drivers').where({ id: driverId }).first();
    if (!driver) throw new Error('Driver not found');

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Simulated Collective Agreement Rule:
    // Supplement is 10% of monthly salary (based on hourly * 160) for the period.
    const monthlySalary = Number(driver.hourly_rate) * 160;
    const dailySupplement = (monthlySalary * 0.10) / 30;
    const totalSupplement = dailySupplement * diffDays;

    return {
      type: 'PARENTAL_SUPPLEMENT',
      amount: totalSupplement,
      days: diffDays
    };
  }
}
