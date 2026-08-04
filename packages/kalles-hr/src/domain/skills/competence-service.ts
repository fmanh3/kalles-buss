import type { Knex } from 'knex';

export class CompetenceService {
  constructor(private db: Knex) {}

  /**
   * Interface for Traffic: Check if a driver is legally allowed to drive a specific vehicle type today.
   * Enforces the "Golden Base-layer Check" (Körkort D + YKB) before checking Type Ratings.
   */
  async hasCompetence(driverId: string, requiredType?: string, date: Date = new Date()): Promise<boolean> {
    // Fetch all active certifications for the driver
    const certs = await this.db('certifications')
      .where({ driver_id: driverId })
      .whereIn('status', ['Giltigt', 'Godkänd']);

    // 1. Base Compliance Check: Körkort D
    const hasLicense = certs.find(c => c.type === 'Körkort D' && (!c.expiry_date || new Date(c.expiry_date) >= date));
    if (!hasLicense) {
      console.warn(`[COMPLIANCE BLOCK] Driver ${driverId} lacks valid Körkort D.`);
      return false;
    }

    // 2. Base Compliance Check: YKB (Yrkeskompetensbevis)
    const hasYkb = certs.find(c => c.type === 'YKB' && (!c.expiry_date || new Date(c.expiry_date) >= date));
    if (!hasYkb) {
      console.warn(`[COMPLIANCE BLOCK] Driver ${driverId} lacks valid YKB.`);
      return false;
    }

    // 3. Type Rating Check (If a specific vehicle type is requested)
    if (requiredType) {
      const hasTypeRating = certs.find(c => 
        c.type === 'Typ-utbildning' && 
        c.reference_name === requiredType && 
        (!c.expiry_date || new Date(c.expiry_date) >= date)
      );
      if (!hasTypeRating) {
        console.warn(`[COMPLIANCE BLOCK] Driver ${driverId} lacks Type Rating for ${requiredType}.`);
        return false;
      }
    }

    return true; // Driver is fully compliant
  }

  /**
   * Proactively find certifications (YKB, Körkort, Läkarkontroll) expiring within a given timeframe.
   */
  async getExpiringCompliance(monthsThreshold: number = 6) {
    const thresholdDate = new Date();
    thresholdDate.setMonth(thresholdDate.getMonth() + monthsThreshold);

    const expiringCerts = await this.db('certifications')
      .where('expiry_date', '<=', thresholdDate)
      .andWhere('status', 'Giltigt');

    return expiringCerts.map(cert => ({
      driver_id: cert.driver_id,
      type: cert.type,
      expiry_date: cert.expiry_date,
      action_required: cert.type === 'YKB' ? 'Schedule 35h Periodic Training' : 
                       cert.type === 'Körkort D' ? 'Require Periodisk Läkarkontroll & Transportstyrelsen Renewal' : 'Renew Certification'
    }));
  }

  /**
   * Handles a "SkillGapIdentified" event from Traffic.
   */
  async handleSkillGapEvent(targetTypeRating: string) {
    const allDrivers = await this.db('drivers').select('id');
    
    const candidates = [];
    for (const driver of allDrivers) {
      // Check if they are generally compliant (Körkort + YKB), but lack the specific Type Rating
      const isGenerallyCompliant = await this.hasCompetence(driver.id);
      const hasSpecificRating = await this.hasCompetence(driver.id, targetTypeRating);
      
      if (isGenerallyCompliant && !hasSpecificRating) {
        candidates.push(driver.id);
      }
    }

    const [training] = await this.db('trainings').insert({
      title: `Urgent Type Rating: ${targetTypeRating}`,
      type_rating_target: targetTypeRating,
      scheduled_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Schedule in 14 days
      status: 'PLANNED'
    }).returning('*');

    const cohort = candidates.slice(0, 5);
    const enrollments = cohort.map(driverId => ({
      training_id: training.id,
      driver_id: driverId,
      result: 'ENROLLED'
    }));

    if (enrollments.length > 0) {
      await this.db('driver_trainings').insert(enrollments);
    }

    return {
      training_id: training.id,
      target: targetTypeRating,
      enrolled_candidates: cohort
    };
  }
}
