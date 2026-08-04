import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LifeCycleService } from '../domain/lifecycle/life-cycle-service';

describe('LifeCycleService', () => {
  let dbMock: any;
  let service: LifeCycleService;

  beforeEach(() => {
    dbMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      returning: vi.fn()
    });
    service = new LifeCycleService(dbMock as any);
  });

  describe('processLeaveRequest', () => {
    it('should calculate 10% parental supplement correctly based on collective agreement', async () => {
      // Mock inserting the request
      dbMock().returning.mockResolvedValue([{ id: 'REQ-123' }]);
      
      // Mock driver data
      dbMock().first.mockResolvedValue({ id: 'DRIVER-007', hourly_rate: 200 }); // 200 SEK/h

      const startDate = new Date('2026-05-01');
      const endDate = new Date('2026-05-31'); // exactly 30 days difference
      
      const result = await service.processLeaveRequest('DRIVER-007', startDate, endDate, 'PARENTAL');
      
      // Hourly: 200. Monthly base: 200 * 160 = 32,000 SEK.
      // 10% supplement: 3,200 SEK per 30 days.
      // Diff days = 30.
      expect(result.payroll_supplement).toBeDefined();
      expect(result.payroll_supplement?.amount).toBeCloseTo(3200, 2);
      expect(result.payroll_supplement?.days).toBe(30);
      expect(result.traffic_event.type).toBe('EmployeeUnavailable');
    });

    it('should not calculate supplement for standard VACATION', async () => {
      dbMock().returning.mockResolvedValue([{ id: 'REQ-123' }]);
      
      const result = await service.processLeaveRequest('DRIVER-007', new Date(), new Date(), 'VACATION');
      expect(result.payroll_supplement).toBeNull();
    });
  });
});
