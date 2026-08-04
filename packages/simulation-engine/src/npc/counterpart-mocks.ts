import { Logger } from '@kalles-buss/shared-utils';

export interface CounterpartState {
  bankgiro: {
    pendingIncomingSettlements: number;
    processedOutgoingSalaries: number;
  };
  skatteverket: {
    lastVATReportReceived: string | null;
  };
  suppliers: {
    pendingInvoices: any[];
  };
}

export class CounterpartMocks {
  private state: CounterpartState = {
    bankgiro: { pendingIncomingSettlements: 125000, processedOutgoingSalaries: 0 },
    skatteverket: { lastVATReportReceived: null },
    suppliers: { pendingInvoices: [] }
  };

  getState() {
    return this.state;
  }

  // Simulated Webhook from Finance Domain (Paying salaries)
  receiveSalaryPayment(amount: number) {
    Logger.info(`[Simulator Counterpart: Bankgiro] Received salary instruction for ${amount} SEK`);
    this.state.bankgiro.processedOutgoingSalaries += amount;
  }

  // Simulated Webhook from Finance Domain (VAT)
  receiveVATReport(reportData: any) {
    Logger.info(`[Simulator Counterpart: Skatteverket] Received VAT report`);
    this.state.skatteverket.lastVATReportReceived = new Date().toISOString();
  }

  // Simulated Supplier issuing an invoice after Depot Negotiation
  generateSupplierInvoice(supplierName: string, amount: number) {
    Logger.info(`[Simulator Counterpart: Supplier] ${supplierName} generating invoice for ${amount} SEK`);
    this.state.suppliers.pendingInvoices.push({ supplierName, amount, date: new Date().toISOString() });
  }
}
