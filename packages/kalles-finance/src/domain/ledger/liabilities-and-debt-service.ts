import type { Knex } from 'knex';
import { LedgerService, LedgerTransactionRequest } from './ledger-service';

export interface Liability {
  id?: string;
  liability_id: string;
  type: 'BANK_LOAN' | 'LEASE' | 'BOND';
  principal_amount: number;
  remaining_balance: number;
  interest_rate_expr: string;
  monthly_amortization: number;
  maturity_date: Date;
  account_code: string;
}

export class LiabilitiesAndDebtService {
  constructor(private db: Knex, private ledgerService: LedgerService) {}

  async createLiability(liability: Liability) {
    const [newLiability] = await this.db('liabilities').insert(liability).returning('*');
    return newLiability;
  }

  async processMonthlyAmortization(liabilityId: string) {
    return this.db.transaction(async (trx) => {
      const liability = await trx('liabilities').where({ liability_id: liabilityId }).first();

      if (!liability) {
        throw new Error(`Liability ${liabilityId} not found`);
      }

      if (liability.remaining_balance <= 0) {
         return { status: 'FULLY_PAID' };
      }

      const amountToAmortize = Math.min(liability.monthly_amortization, liability.remaining_balance);

      const newBalance = liability.remaining_balance - amountToAmortize;

      await trx('liabilities')
        .where({ id: liability.id })
        .update({ remaining_balance: newBalance });

      const ledgerReq: LedgerTransactionRequest = {
        description: `Monthly amortization for ${liability.type} ${liabilityId}`,
        source_type: 'AMORTIZATION',
        source_reference: liability.id,
        entries: [
          { account_code: liability.account_code, debit: amountToAmortize, credit: 0 },
          { account_code: '1930', debit: 0, credit: amountToAmortize } // Företagskonto
        ]
      };

      await this.ledgerService.recordTransactionWithTrx(trx, ledgerReq);

      return { liability_id: liabilityId, new_balance: newBalance, amortized_amount: amountToAmortize };
    });
  }

  async bookVariableInterest(liabilityId: string, interestAmount: number, validatedRate: string) {
     return this.db.transaction(async (trx) => {
        const liability = await trx('liabilities').where({ liability_id: liabilityId }).first();
        if (!liability) throw new Error('Liability not found');

        const ledgerReq: LedgerTransactionRequest = {
          description: `Variable Interest (${validatedRate}) for ${liabilityId}`,
          source_type: 'INTEREST_EXPENSE',
          source_reference: liability.id,
          entries: [
            { account_code: '8400', debit: interestAmount, credit: 0 }, // Räntekostnader
            { account_code: '1930', debit: 0, credit: interestAmount }
          ]
        };

        await this.ledgerService.recordTransactionWithTrx(trx, ledgerReq);
        return { booked_interest: interestAmount };
     });
  }

  async reclassifyDebtAtYearEnd() {
    return this.db.transaction(async (trx) => {
       // Find all long term loans
       const loans = await trx('liabilities').where('remaining_balance', '>', 0);
       
       let totalReclassified = 0;

       for (const loan of loans) {
         // Next 12 months amortization
         const upcomingAmortization = Math.min(Number(loan.monthly_amortization) * 12, Number(loan.remaining_balance));
         
         if (upcomingAmortization > 0) {
            const ledgerReq: LedgerTransactionRequest = {
              description: `Reclassifying upcoming amortization to short-term debt for ${loan.liability_id}`,
              source_type: 'YEAR_END_RECLASSIFICATION',
              source_reference: loan.id,
              entries: [
                { account_code: loan.account_code, debit: upcomingAmortization, credit: 0 }, // E.g., 2350 (Long term)
                { account_code: '2800', debit: 0, credit: upcomingAmortization } // Övriga kortfristiga skulder
              ]
            };

            await this.ledgerService.recordTransactionWithTrx(trx, ledgerReq);
            totalReclassified += upcomingAmortization;
         }
       }

       return { total_reclassified: totalReclassified };
    });
  }
}
