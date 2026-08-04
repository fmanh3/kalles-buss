import type { Knex } from 'knex';

export class WelfareService {
  constructor(private db: Knex) {}

  /**
   * Break-glass procedure for Incident Commanders to fetch ICE data.
   */
  async getEmergencyContact(driverId: string, requestorId: string, incidentRef: string) {
    // 1. Log the emergency access (Audit Trail)
    console.warn(`[AUDIT] Emergency ICE Access by ${requestorId} for Driver ${driverId} (Incident: ${incidentRef})`);

    // 2. Fetch the contact
    const contact = await this.db('emergency_contacts')
      .where({ driver_id: driverId, is_primary: true })
      .first();

    if (!contact) {
      // Fallback to legacy field in drivers table
      const legacy = await this.db('drivers').select('ice_contact').where({ id: driverId }).first();
      return legacy ? { name: 'Legacy ICE', phone: legacy.ice_contact } : null;
    }

    return {
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone_number
    };
  }

  /**
   * Log a safety incident/commendation linked to the employee.
   */
  async recordSafetyIncident(driverId: string, incidentRef: string, type: 'COMMENDATION' | 'WARNING' | 'INVOLVEMENT', description: string) {
    const [record] = await this.db('safety_incidents').insert({
      driver_id: driverId,
      incident_ref: incidentRef,
      type,
      description
    }).returning('*');

    return record;
  }
}
