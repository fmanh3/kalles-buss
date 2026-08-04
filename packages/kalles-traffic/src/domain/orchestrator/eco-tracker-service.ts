import { Knex } from 'knex';
import { Logger } from '@kalles-buss/shared-utils';

export class EcoTrackerService {
  constructor(private db: Knex) {}

  /**
   * Finalizes a tour and calculates the EcoScore based on telemetry.
   */
  async finalizeTourAndCalculateEcoScore(tourId: string, energyConsumedKwh: number, regeneratedKwh: number) {
    const tour = await this.db('tours').where({ id: tourId }).first();
    if (!tour || !tour.assigned_driver_id) {
      throw new Error('Tour or driver not found');
    }

    // Calculate EcoScore (Simplified):
    // Higher regeneration and lower overall consumption yields a higher score (0-100)
    // Formula mock: (regenerated / consumed) * 100 * (expected / consumed)
    
    // Fallback if no estimated consumption was set
    const expected = tour.estimated_consumption_kwh || energyConsumedKwh; 
    
    let rawScore = (regeneratedKwh / Math.max(energyConsumedKwh, 1)) * 100 * (expected / Math.max(energyConsumedKwh, 1));
    // Normalize to 0-100
    const ecoScore = Math.min(Math.max(rawScore, 0), 100);

    const [stat] = await this.db('eco_driving_stats').insert({
      driver_id: tour.assigned_driver_id,
      tour_id: tour.id,
      energy_consumed_kwh: energyConsumedKwh,
      regenerated_kwh: regeneratedKwh,
      eco_score: ecoScore
    }).returning('*');

    Logger.info(`[EcoTracker] Tour ${tourId} finalized. Driver ${tour.assigned_driver_id} achieved EcoScore: ${ecoScore.toFixed(2)}`);

    // If score is > 85, flag as candidate for HR EcoBonus
    if (ecoScore >= 85) {
      Logger.info(`[EcoBonus] Driver ${tour.assigned_driver_id} qualified for an EcoBonus!`);
      return { stat, bonus_candidate: true };
    }

    return { stat, bonus_candidate: false };
  }
}
