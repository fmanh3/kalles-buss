import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiabilitiesAndDebtService } from '../domain/ledger/liabilities-and-debt-service';
import { LedgerService } from '../domain/ledger/ledger-service';

describe('LiabilitiesAndDebtService', () => {
  let dbMock: any;
  let ledgerMock: any;
  let service: LiabilitiesAndDebtService;

  beforeEach(() => {
    const queryBuilderMock: any = {
      first: vi.fn().mockResolvedValue({
        id: '123',
        liability_id: 'LOAN-1',
        type: 'BANK_LOAN',
        remaining_balance: 1000000,
        monthly_amortization: 50000,
        account_code: '2350'
      }),
      update: vi.fn().mockResolvedValue(1)
    };
    
    queryBuilderMock.where = vi.fn().mockImplementation((key, operator, val) => {
        if (key === 'remaining_balance') {
            return [
              {
                id: '123',
                liability_id: 'LOAN-1',
                type: 'BANK_LOAN',
                remaining_balance: 1000000,
                monthly_amortization: 50000,
                account_code: '2350'
              }
            ];
        }
        return queryBuilderMock;
    });

    const trxMock: any = vi.fn().mockReturnValue(queryBuilderMock);

    dbMock = vi.fn().mockReturnValue(trxMock);
    dbMock.transaction = vi.fn().mockImplementation(async (cb) => {
      return cb(trxMock);
    });
    
    ledgerMock = {
      recordTransactionWithTrx: vi.fn().mockResolvedValue('TRX-123')
    };

    service = new LiabilitiesAndDebtService(dbMock as any, ledgerMock as unknown as LedgerService);
  });

  describe('reclassifyDebtAtYearEnd', () => {
    it('should reclassify 12 months of amortization to short-term debt', async () => {
      const result = await service.reclassifyDebtAtYearEnd();
      
      // 12 * 50,000 = 600,000
      expect(result.total_reclassified).toBe(600000);
      expect(ledgerMock.recordTransactionWithTrx).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        source_type: 'YEAR_END_RECLASSIFICATION',
        entries: [
          { account_code: '2350', debit: 600000, credit: 0 },
          { account_code: '2800', debit: 0, credit: 600000 }
        ]
      }));
    });
  });
});
