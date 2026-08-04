import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EcoTrackerService } from '../domain/orchestrator/eco-tracker-service';

describe('EcoTrackerService', () => {
  let dbMock: any;
  let service: EcoTrackerService;

  beforeEach(() => {
    dbMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      returning: vi.fn()
    });
    service = new EcoTrackerService(dbMock as any);
  });

  describe('finalizeTourAndCalculateEcoScore (Eco-Driving)', () => {
    it('should flag a driver for EcoBonus if score is >= 85', async () => {
      dbMock().first.mockResolvedValue({ id: 'TOUR-1', assigned_driver_id: 'DRIVER-007', estimated_consumption_kwh: 100 });
      dbMock().returning.mockResolvedValue([{ 
        id: 'STAT-1', driver_id: 'DRIVER-007', tour_id: 'TOUR-1', eco_score: 95 
      }]);

      // Provide values that calculate to >= 85
      const result = await service.finalizeTourAndCalculateEcoScore('TOUR-1', 90, 80);

      expect(result.bonus_candidate).toBe(true);
      expect(dbMock().insert).toHaveBeenCalledWith(expect.objectContaining({
        driver_id: 'DRIVER-007',
        energy_consumed_kwh: 90,
        regenerated_kwh: 80
      }));
    });

    it('should NOT flag a driver for EcoBonus if score is < 85', async () => {
      dbMock().first.mockResolvedValue({ id: 'TOUR-1', assigned_driver_id: 'DRIVER-007', estimated_consumption_kwh: 100 });
      dbMock().returning.mockResolvedValue([{ 
        id: 'STAT-1', driver_id: 'DRIVER-007', tour_id: 'TOUR-1', eco_score: 50 
      }]);

      // Inefficient: 120 kWh consumed, only 5 kWh regenerated.
      const result = await service.finalizeTourAndCalculateEcoScore('TOUR-1', 120, 5);

      expect(result.bonus_candidate).toBe(false);
    });
  });
});
