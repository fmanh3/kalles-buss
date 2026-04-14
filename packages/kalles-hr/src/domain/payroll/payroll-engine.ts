import { Knex } from 'knex';

export interface TimeEntry {
  startTime: Date;
  endTime: Date;
  hourlyRate: number;
}

export class PayrollEngine {
  constructor(private db: Knex) {}

  /**
   * Beräknar bruttolön för ett arbetspass inklusive OB.
   */
  async calculateShiftPay(entry: TimeEntry) {
    const durationMs = entry.endTime.getTime() - entry.startTime.getTime();
    const totalHours = durationMs / (1000 * 60 * 60);
    const basePay = totalHours * entry.hourlyRate;

    // Hämta alla OB-satser
    const obRates = await this.db('ob_rates').select();
    let totalObPay = 0;

    for (const rate of obRates) {
      const obHours = this.calculateObHours(entry.startTime, entry.endTime, rate);
      totalObPay += obHours * parseFloat(rate.rate_per_hour);
    }

    return {
      totalHours,
      basePay,
      obPay: totalObPay,
      totalGross: basePay + totalObPay
    };
  }

  /**
   * Enkel logik för att räkna ut hur många timmar som faller inom ett OB-intervall.
   * För Walking Skeleton hanterar vi bara timmar på samma dygn.
   */
  private calculateObHours(start: Date, end: Date, rate: any): number {
    const dayOfWeek = start.getDay();
    const daysEnabled = JSON.parse(JSON.stringify(rate.days_of_week));
    
    if (!daysEnabled.includes(dayOfWeek)) return 0;

    // Konvertera start/slut till minuter från midnatt för enkel jämförelse
    const getMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();
    const obStartMin = this.parseTimeToMinutes(rate.start_time);
    const obEndMin = this.parseTimeToMinutes(rate.end_time);
    
    const entryStartMin = getMinutes(start);
    const entryEndMin = getMinutes(end);

    const overlapStart = Math.max(entryStartMin, obStartMin);
    const overlapEnd = Math.min(entryEndMin, obEndMin);

    const overlapMin = Math.max(0, overlapEnd - overlapStart);
    return overlapMin / 60;
  }

  private parseTimeToMinutes(timeStr: string): number {
    const [hours = 0, minutes = 0] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
