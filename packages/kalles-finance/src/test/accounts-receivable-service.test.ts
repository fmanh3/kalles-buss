import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountsReceivableService } from '../domain/ledger/accounts-receivable-service';
import { LedgerService } from '../domain/ledger/ledger-service';

describe('AccountsReceivableService', () => {
  let dbMock: any;
  let ledgerMock: any;
  let service: AccountsReceivableService;

  beforeEach(() => {
    const queryBuilderMock: any = {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      first: vi.fn(),
      update: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      insert: vi.fn().mockReturnThis()
    };

    dbMock = vi.fn().mockReturnValue(queryBuilderMock);
    dbMock.transaction = vi.fn().mockImplementation(async (cb) => {
      return cb(dbMock());
    });
    
    ledgerMock = {
      recordTransactionWithTrx: vi.fn().mockResolvedValue('TRX-123')
    };

    service = new AccountsReceivableService(dbMock as any, ledgerMock as unknown as LedgerService);
  });

  describe('runAgingAnalysis', () => {
    it('should flag invoices past their due date as OVERDUE', async () => {
      // Overriding the dbMock specifically for the non-transaction query in runAgingAnalysis
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'INV-1' }]);
      const mockUpdate = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockAndWhere = vi.fn().mockReturnValue({ update: mockUpdate });
      const mockWhere = vi.fn().mockReturnValue({ andWhere: mockAndWhere });
      
      service = new AccountsReceivableService(vi.fn().mockReturnValue({ where: mockWhere }) as any, ledgerMock);

      const result = await service.runAgingAnalysis();

      expect(mockWhere).toHaveBeenCalledWith('due_date', '<', expect.any(Date));
      expect(mockAndWhere).toHaveBeenCalledWith('status', 'PENDING_PAYMENT');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'OVERDUE' });
      expect(result).toHaveLength(1);
    });
  });

  describe('processBankgirotPayment', () => {
    it('should mark invoice as PAID if fully paid', async () => {
      const mockTrx: any = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'INV-123',
          ocr_number: 'OCR-500',
          amount_total: 1000,
          amount_paid: 0,
          status: 'PENDING_PAYMENT'
        }),
        update: vi.fn().mockResolvedValue(1)
      });

      dbMock.transaction.mockImplementationOnce(async (cb: any) => cb(mockTrx));

      const result = await service.processBankgirotPayment('OCR-500', 1000);

      expect(result.status).toBe('PAID');
      expect(result.amount_paid).toBe(1000);
      expect(ledgerMock.recordTransactionWithTrx).toHaveBeenCalled();
    });

    it('should handle currency differences / bank fees', async () => {
      const mockTrx: any = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'INV-123',
          ocr_number: 'OCR-501',
          amount_total: 1000,
          amount_paid: 0,
          status: 'PENDING_PAYMENT'
        }),
        update: vi.fn().mockResolvedValue(1)
      });

      dbMock.transaction.mockImplementationOnce(async (cb: any) => cb(mockTrx));

      // Paying 1050 (50 SEK fee/diff)
      const result = await service.processBankgirotPayment('OCR-501', 1050);

      expect(result.status).toBe('PAID');
      expect(result.amount_paid).toBe(1050);
      
      // Verify ledger entries include bank fee account
      expect(ledgerMock.recordTransactionWithTrx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entries: expect.arrayContaining([
            expect.objectContaining({ account_code: '6570', credit: 50 })
          ])
        })
      );
    });
  });
});
