import { Knex } from 'knex';

export interface RosteringRequirement {
  shiftId: string;
  vehicleType: string;
  startTime: Date;
}

export class RosteringAgent {
  constructor(private db: Knex) {}

  async assignDriverToShift(req: RosteringRequirement) {
    const drivers = await this.db('drivers').select();
    for (const driver of drivers) {
      const certs = await this.db('certifications').where({ driver_id: driver.id, status: 'Giltigt' });
      const hasLicense = certs.some(c => c.type === 'Körkort D');
      const hasTypeEdu = certs.some(c => c.type === 'Typ-utbildning' && c.reference_name?.includes(req.vehicleType));
      if (!hasLicense || !hasTypeEdu) continue;
      const lastShift = await this.db('shifts').where({ driver_id: driver.id, status: 'COMPLETED' }).orderBy('planned_end_time', 'desc').first();
      if (lastShift) {
        const restDurationHours = (req.startTime.getTime() - new Date(lastShift.planned_end_time).getTime()) / 3600000;
        if (restDurationHours < 11) continue;
      }
      await this.db('shifts').where({ id: req.shiftId }).update({ driver_id: driver.id, status: 'SCHEDULED', updated_at: new Date() });
      return driver.id;
    }
    throw new Error('Ingen tillgänglig förare hittades');
  }
}
