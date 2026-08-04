import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepairNegotiatorAgent } from '../domain/negotiator/repair-negotiator';

describe('RepairNegotiatorAgent (The Windshield Principle)', () => {
  let dbMock: any;
  let insertMock: any;
  let whereMock: any;
  let firstMock: any;
  let inventoryMock: any;
  let negotiator: RepairNegotiatorAgent;

  beforeEach(() => {
    insertMock = vi.fn().mockResolvedValue([{ id: 'LOG-1' }]);
    firstMock = vi.fn().mockResolvedValue({ id: 'DEFECT-1', asset_id: 'ASSET-123' });
    whereMock = vi.fn().mockReturnValue({ first: firstMock });

    dbMock = vi.fn().mockImplementation((table) => {
      if (table === 'defects') return { where: whereMock };
      if (table === 'work_orders') return { insert: insertMock };
      return { where: whereMock, insert: insertMock };
    });

    inventoryMock = {
      getPartAvailability: vi.fn()
    };

    negotiator = new RepairNegotiatorAgent(dbMock as any, inventoryMock as any);
  });

  it('should choose USE_EXTERNAL_PARTNER if parts are missing and traffic penalties are high', async () => {
    inventoryMock.getPartAvailability.mockResolvedValue({ 
      availableNow: false, 
      fastestOption: { days: 2, cost: 15000 },
      cheapestOption: { days: 5, cost: 10000 }
    });

    // Norrtälje Depot penalty: 15,000 SEK/day.
    // External: 10000 * 2.5 + 4000 = 29,000. Days: 1. Total loss: 29000 + 15000 = 44,000 SEK.
    // Internal Fast: 15,000 + 2000 = 17,000. Days: 3. Total loss: 17000 + 45000 = 62,000 SEK.
    // Internal Cheap: 10,000 + 2000 = 12,000. Days: 6. Total loss: 12000 + 90000 = 102,000 SEK.
    
    const result = await negotiator.negotiateRepairStrategy('DEFECT-1', 'DEPOT-NTA', 'PART-WINDSHIELD');

    expect(result.decision).toBe('USE_EXTERNAL_PARTNER');
    expect(result.rationale).toContain('External is cheapest overall');
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Repair Strategy: USE_EXTERNAL_PARTNER' }));
  });

  it('should choose USE_INTERNAL_MECHANIC_STANDARD if traffic penalties are zero', async () => {
    inventoryMock.getPartAvailability.mockResolvedValue({ 
      availableNow: false, 
      fastestOption: { days: 2, cost: 15000 },
      cheapestOption: { days: 5, cost: 10000 }
    });

    // DEPOT-SVE penalty: 0 SEK/day.
    // External: 29,000 SEK.
    // Internal Fast: 17,000 SEK.
    // Internal Cheap: 12,000 SEK.
    
    const result = await negotiator.negotiateRepairStrategy('DEFECT-1', 'DEPOT-SVE', 'PART-WINDSHIELD');

    expect(result.decision).toBe('USE_INTERNAL_MECHANIC_STANDARD');
    expect(result.rationale).toContain('Standard internal repair is optimal');
  });

  it('should choose USE_INTERNAL_MECHANIC_EXPEDITE if external is too expensive but penalties exist', async () => {
    inventoryMock.getPartAvailability.mockResolvedValue({ 
      availableNow: false, 
      fastestOption: { days: 0, cost: 12000 }, // Arrives same day, installed next day
      cheapestOption: { days: 10, cost: 10000 }
    });

    // DEPOT-NTA penalty: 15,000 SEK/day.
    // External base calculation: 10,000 * 2.5 + 4000 = 29,000 + 15,000 = 44,000 SEK.
    // Internal Fast (Expedite): 12,000 + 2000 = 14,000. Days: 1. Total loss = 14,000 + 15,000 = 29,000 SEK.
    // Internal Cheap: 10,000 + 2000 = 12,000. Days: 11. Total loss = 12,000 + 165,000 = 177,000 SEK.
    
    const result = await negotiator.negotiateRepairStrategy('DEFECT-1', 'DEPOT-NTA', 'PART-WINDSHIELD');

    expect(result.decision).toBe('USE_INTERNAL_MECHANIC_EXPEDITE');
    expect(result.rationale).toContain('Expedited internal repair is optimal');
  });
});
