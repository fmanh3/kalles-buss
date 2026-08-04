import type { Knex } from 'knex';
import { LedgerService, LedgerTransactionRequest } from './ledger-service';

export interface Invoice {
  id?: string;
  invoice_number: string;
  customer_name: string;
  amount_total: number;
  amount_vat: number;
  currency?: string;
  due_date: Date;
  status?: 'DRAFT' | 'PENDING_PAYMENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  reference_id?: string;
  ocr_number: string;
  amount_paid?: number;
}

export class AccountsReceivableService {
  constructor(private db: Knex, private ledgerService: LedgerService) {}

  async createInvoice(invoice: Invoice) {
    return this.db.transaction(async (trx) => {
      const [newInvoice] = await trx('invoices').insert({
        ...invoice,
        status: 'PENDING_PAYMENT',
        amount_paid: 0
      }).returning('*');

      // Create ledger transaction for AR
      const ledgerReq: LedgerTransactionRequest = {
        description: `Invoice ${invoice.invoice_number} to ${invoice.customer_name}`,
        source_type: 'AR_INVOICE',
        source_reference: newInvoice.id,
        entries: [
          { account_code: '1510', debit: invoice.amount_total, credit: 0 }, // Kundfordringar
          { account_code: '3000', debit: 0, credit: invoice.amount_total - invoice.amount_vat }, // Försäljning
          { account_code: '2611', debit: 0, credit: invoice.amount_vat } // Utgående moms
        ]
      };

      await this.ledgerService.recordTransactionWithTrx(trx, ledgerReq);

      return newInvoice;
    });
  }

  async processBankgirotPayment(ocrNumber: string, amount: number) {
    return this.db.transaction(async (trx) => {
      const invoice = await trx('invoices').where({ ocr_number: ocrNumber }).first();

      if (!invoice) {
        throw new Error(`Invoice with OCR ${ocrNumber} not found.`);
      }

      const newAmountPaid = Number(invoice.amount_paid) + amount;
      let newStatus = invoice.status;

      let currencyDifference = 0;

      if (newAmountPaid >= invoice.amount_total) {
        newStatus = 'PAID';
        // Handle overpayment/currency diff if any
        currencyDifference = newAmountPaid - invoice.amount_total;
      } else if (newAmountPaid > 0) {
        newStatus = 'PENDING_PAYMENT'; // Still partial
      }

      await trx('invoices')
        .where({ id: invoice.id })
        .update({ amount_paid: newAmountPaid, status: newStatus });

      // Book the payment in the ledger
      const entries = [
        { account_code: '1930', debit: amount, credit: 0 }, // Företagskonto
        { account_code: '1510', debit: 0, credit: amount - currencyDifference } // Kundfordringar
      ];

      if (currencyDifference > 0) {
         // E.g. Bank fee or currency diff. Booking as cost/loss.
         entries.push({ account_code: '6570', debit: 0, credit: currencyDifference }); // Bankkostnader
      } else if (currencyDifference < 0) {
         // This logic is mostly for matching exact or slight overpayments. If partial, it remains open.
      }

      const ledgerReq: LedgerTransactionRequest = {
        description: `Payment for Invoice ${invoice.invoice_number} (OCR: ${ocrNumber})`,
        source_type: 'AR_PAYMENT',
        source_reference: invoice.id,
        entries
      };

      await this.ledgerService.recordTransactionWithTrx(trx, ledgerReq);

      return { invoice_id: invoice.id, status: newStatus, amount_paid: newAmountPaid };
    });
  }

  async runAgingAnalysis() {
    const today = new Date();

    const overdueInvoices = await this.db('invoices')
      .where('due_date', '<', today)
      .andWhere('status', 'PENDING_PAYMENT')
      .update({ status: 'OVERDUE' })
      .returning('*');

    // In a real system, we might trigger events here to send reminders (Påminnelser)
    // or flag them in a risk dashboard.

    return overdueInvoices;
  }
}
