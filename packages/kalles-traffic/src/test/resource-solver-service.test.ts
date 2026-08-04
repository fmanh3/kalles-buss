import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceSolverService } from '../domain/orchestrator/resource-solver-service';

describe('ResourceSolverService', () => {
  let dbMock: any;
  let service: ResourceSolverService;

  beforeEach(() => {
    dbMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      whereNotIn: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      whereNotNull: vi.fn().mockReturnThis(),
      first: vi.fn(),
      update: vi.fn().mockResolvedValue(1)
    });
    // Add raw mock for db.raw
    dbMock.raw = vi.fn().mockResolvedValue(true);
    service = new ResourceSolverService(dbMock as any, 'http://mock.local');
  });

  describe('assignDriverToTour (Certifieringsstopp)', () => {
    it('should reject a driver who lacks line knowledge', async () => {
      dbMock().first.mockResolvedValue({ id: 'TOUR-1', line_id: '676', start_depot_id: 'DEPOT-1' });

      await expect(service.assignDriverToTour('TOUR-1', 'NO_LINE_KNOWLEDGE', 'URBAN'))
        .rejects.toThrow('No line knowledge for 676');
    });

    it('should reject an unqualified driver', async () => {
      dbMock().first.mockResolvedValue({ id: 'TOUR-1', line_id: '676', start_depot_id: 'DEPOT-1' });

      await expect(service.assignDriverToTour('TOUR-1', 'UNQUALIFIED_DRIVER', 'URBAN'))
        .rejects.toThrow('Missing valid YKB');
    });

    it('should assign a qualified driver successfully', async () => {
      dbMock().first.mockResolvedValue({ id: 'TOUR-1', line_id: '676', start_depot_id: 'DEPOT-1' });

      const result = await service.assignDriverToTour('TOUR-1', 'DRIVER-007', 'URBAN');
      expect(result.success).toBe(true);
      expect(result.driverId).toBe('DRIVER-007');
    });
  });

  describe('handleFleetMigration (Depåflytt)', () => {
    it('should update the vehicles depot successfully', async () => {
      dbMock().first.mockResolvedValue({ id: 'DEPOT-2', name: 'Tekniska Depot' });

      await service.handleFleetMigration('BUSS-101', 'Tekniska Depot');

      expect(dbMock().where).toHaveBeenCalledWith({ id: 'BUSS-101' });
      expect(dbMock().update).toHaveBeenCalledWith({ current_depot_id: 'DEPOT-2' });
    });
  });
});
