import { Logger } from '@kalles-buss/shared-utils';
import axios from 'axios';

export interface CounterpartState {
  bankgiro: {
    pendingIncomingSettlements: number;
    processedOutgoingSalaries: number;
    receivedPain001Files: any[];
  };
  skatteverket: {
    lastVATReportReceived: string | null;
    receivedAgiReports: any[];
  };
  suppliers: {
    pendingInvoices: any[];
  };
  fora: {
    receivedReports: any[];
    sentPensionInvoices: any[];
  };
}

export class CounterpartMocks {
  private state: CounterpartState = {
    bankgiro: { 
      pendingIncomingSettlements: 125000, 
      processedOutgoingSalaries: 0,
      receivedPain001Files: [] 
    },
    skatteverket: { 
      lastVATReportReceived: null,
      receivedAgiReports: [] 
    },
    suppliers: { 
      pendingInvoices: [] 
    },
    fora: {
      receivedReports: [],
      sentPensionInvoices: []
    }
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

  /**
   * Bankgirot Simulator: Receives and processes valid pain.001 bank files.
   */
  receiveBankgiroFile(payload: any) {
    const { reference, netAmount, xml, source } = payload;
    Logger.info(`[Simulator Counterpart: Bankgiro] Processing pain.001 XML file for '${reference}' from source '${source}' totaling ${netAmount} SEK`);
    this.state.bankgiro.processedOutgoingSalaries += Number(netAmount);
    this.state.bankgiro.receivedPain001Files.push({
      runId: reference,
      timestamp: new Date().toISOString(),
      netAmount: Number(netAmount),
      xml
    });
  }

  /**
   * Skatteverket Simulator: Receives and registers Employer Monthly AGI declarations.
   */
  receiveSkatteverketAgi(payload: any) {
    const { reference, period, grossAmount, taxAmount, employerContributions, xml } = payload;
    Logger.info(`[Simulator Counterpart: Skatteverket] Registering AGI declaration for period '${period}' (Gross: ${grossAmount} SEK, Tax: ${taxAmount} SEK)`);
    this.state.skatteverket.receivedAgiReports.push({
      runId: reference,
      timestamp: new Date().toISOString(),
      grossAmount: Number(grossAmount),
      taxAmount: Number(taxAmount),
      employerContributions: Number(employerContributions),
      xml
    });
  }

  /**
   * FORA Simulator: Receives pension reports, updates state, and auto-generates a supplier pension invoice back to Kalles Buss.
   */
  async receiveForaReport(payload: any) {
    const { runId, grossAmount, report } = payload;
    Logger.info(`[Simulator Counterpart: FORA] Received pension report for run ${runId} (Gross salaries: ${grossAmount} SEK)`);
    
    this.state.fora.receivedReports.push({
      runId,
      timestamp: new Date().toISOString(),
      grossAmount: Number(grossAmount),
      report
    });

    // Auto-generate matching FORA Pension Invoice back to Kalles Buss AP (4.5% of total gross salary)
    const totalForaPremium = Number(grossAmount) * 0.045;
    Logger.info(`[Simulator Counterpart: FORA] Issuing matching pension premium invoice for ${totalForaPremium} SEK...`);

    const financeUrl = process.env.FINANCE_SERVICE_URL || 'http://localhost:8084';
    try {
      const invoiceResponse = await axios.post(`${financeUrl}/cfo/ap/invoice`, {
        vendorName: 'FORA Pensioner',
        invoiceReference: `FORA-PREM-${runId}`,
        amountTotal: totalForaPremium,
        amountVat: 0, // Pensions are VAT-free in Sweden
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().substring(0, 10), // Due in 30 days
        category: 'Operating Costs - Pensions (FORA)'
      });

      this.state.fora.sentPensionInvoices.push({
        invoiceId: invoiceResponse.data.invoiceId,
        timestamp: new Date().toISOString(),
        amount: totalForaPremium,
        reference: `FORA-PREM-${runId}`
      });
      Logger.info(`[Simulator Counterpart: FORA] Pension invoice successfully dispatched to Finance AP (ID: ${invoiceResponse.data.invoiceId}).`);
    } catch (err: any) {
      Logger.error(`[Simulator Counterpart: FORA] Failed to send pension invoice to Finance: ${err.message}`);
    }
  }
}
