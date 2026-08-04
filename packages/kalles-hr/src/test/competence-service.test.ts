import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompetenceService } from '../domain/skills/competence-service';

describe('CompetenceService', () => {
  let dbMock: any;
  let service: CompetenceService;

  beforeEach(() => {
    dbMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      whereIn: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      first: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      returning: vi.fn()
    });
    service = new CompetenceService(dbMock as any);
  });

  describe('hasCompetence (Golden Base-layer Check)', () => {
    it('should return false if Körkort D is missing', async () => {
      // Mock returns only YKB, but no Körkort D
      dbMock().whereIn.mockResolvedValue([
        { type: 'YKB', status: 'Giltigt', expiry_date: new Date('2030-01-01') }
      ]);
      const result = await service.hasCompetence('DRIVER-123');
      expect(result).toBe(false);
    });

    it('should return false if YKB is expired', async () => {
      dbMock().whereIn.mockResolvedValue([
        { type: 'Körkort D', status: 'Giltigt', expiry_date: new Date('2030-01-01') },
        { type: 'YKB', status: 'Giltigt', expiry_date: new Date('2020-01-01') } // Expired
      ]);
      const result = await service.hasCompetence('DRIVER-123');
      expect(result).toBe(false);
    });

    it('should return true if both Körkort D and YKB are valid', async () => {
      dbMock().whereIn.mockResolvedValue([
        { type: 'Körkort D', status: 'Giltigt', expiry_date: new Date('2030-01-01') },
        { type: 'YKB', status: 'Giltigt', expiry_date: new Date('2030-01-01') }
      ]);
      const result = await service.hasCompetence('DRIVER-123');
      expect(result).toBe(true);
    });

    it('should return false if a specific Type Rating is requested but missing', async () => {
      dbMock().whereIn.mockResolvedValue([
        { type: 'Körkort D', status: 'Giltigt', expiry_date: new Date('2030-01-01') },
        { type: 'YKB', status: 'Giltigt', expiry_date: new Date('2030-01-01') },
        { type: 'Typ-utbildning', reference_name: 'BUSS-A', status: 'Godkänd', expiry_date: new Date('2030-01-01') }
      ]);
      // Requesting BUSS-B, which is missing
      const result = await service.hasCompetence('DRIVER-123', 'BUSS-B');
      expect(result).toBe(false);
    });
  });
});
