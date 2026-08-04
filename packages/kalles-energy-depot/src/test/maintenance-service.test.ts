import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaintenanceService } from '../domain/maintenance/maintenance-service';

describe('MaintenanceService', () => {
  let dbMock: any;
  let service: MaintenanceService;

  beforeEach(() => {
    const trxMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'ASSET-123' }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'MOCK-ID' }])
    });

    dbMock = vi.fn().mockReturnValue(trxMock);
    dbMock.transaction = vi.fn().mockImplementation(async (cb) => {
      return cb(trxMock);
    });

    service = new MaintenanceService(dbMock as any);
  });

  describe('handleSafetyCheckFail', () => {
    it('should ground the asset, create a defect, and generate a work order', async () => {
      const result = await service.handleSafetyCheckFail('BUSS-101', 'DRIVER-007', 'Brakes unresponsive');

      expect(result.asset_id).toBe('ASSET-123');
      expect(result.defect_id).toBe('MOCK-ID');
      expect(result.work_order_id).toBe('MOCK-ID');
    });
  });
});
