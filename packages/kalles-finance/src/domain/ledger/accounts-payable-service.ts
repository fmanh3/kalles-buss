import type { Knex } from 'knex';
import { LedgerService } from './ledger-service';

export interface VendorInvoiceRequest {
  vendorName: string;
  invoiceReference: string;
  amountTotal: number;
  amountVat: number;
  dueDate: Date;
  category: string;
}

/**
 * CFO Agent Service for Accounts Payable.
 * Handles intelligent prioritization and recording of vendor invoices.
 */
export class AccountsPayableService {
  constructor(private db: Knex, private ledger: LedgerService) {}

  /**
   * Records a new vendor invoice and proposes a payment strategy.
   * Matches Scenario: Intelligent prioritization of incoming electricity invoice
   */
  async recordVendorInvoice(req: VendorInvoiceRequest) {
    console.log(`[CFO Agent] Analyzing vendor invoice from ${req.vendorName}...`);

    const invoiceId = await this.db.transaction(async (trx) => {
      // 1. Persist the vendor invoice
      const [id] = await trx('vendor_invoices').insert({
        vendor_name: req.vendorName,
        invoice_reference: req.invoiceReference,
        amount_total: req.amountTotal,
        amount_vat: req.amountVat,
        due_date: req.dueDate,
        category: req.category,
        status: 'PENDING'
      }).returning('id');

      // 2. Book in General Ledger (Double Entry)
      // Debit Expense (based on category), Credit 2440 (Accounts Payable)
      // For this skeleton, we assume a simplified mapping or use a default expense account
      const expenseAccount = this.getAccountForCategory(req.category);
      const amountExclVat = req.amountTotal - req.amountVat;

      await this.ledger.recordTransactionWithTrx(trx, {
        description: `Leverantörsfaktura ${req.invoiceReference} - ${req.vendorName}`,
        source_type: 'VENDOR_INVOICE',
        source_reference: id.id || id,
        entries: [
          { account_code: expenseAccount, debit: amountExclVat, credit: 0 },
          { account_code: '2641', debit: req.amountVat, credit: 0 }, // Ingående moms
          { account_code: '2440', debit: 0, credit: req.amountTotal } // Leverantörsskulder
        ]
      });

      return id.id || id;
    });

    // 3. Intelligent Analysis (The "Agent" part)
    const paymentStrategy = this.proposePaymentStrategy(req);
    
    return {
      invoiceId,
      analysis: {
        category: req.category,
        paymentStrategy,
        vatRecorded: req.amountVat
      }
    };
  }

  private proposePaymentStrategy(req: VendorInvoiceRequest) {
    // Logic from Gherkin: "propose to pay the invoice 2 days before the due date to maximize interest on cash"
    const payDate = new Date(req.dueDate);
    payDate.setDate(payDate.getDate() - 2);

    return {
      action: 'SCHEDULED_PAYMENT',
      scheduledDate: payDate,
      reason: 'Optimize cash flow interest'
    };
  }

  private getAccountForCategory(category: string): string {
    if (category.includes('Energy')) return '4010'; // Direct Operating Cost - Energy
    if (category.includes('Maintenance')) return '4020';
    return '4000'; // Default Expense
  }
}
