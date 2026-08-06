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
   * Processes the incoming data formats (pain.001, AGI, FORA) sent from the Adapters.
   * Auto-generates a matching FORA vendor invoice back to Kalles Buss.
   */
  async receivePayrollData(payload: any) {
    const { runId, bankXml, agiXml, foraReport, netAmount, grossAmount, taxAmount, employerContributions } = payload;
    
    Logger.info(`[Simulator Counterpart: Bankgiro] Processing pain.001 XML bank file for payroll run ${runId}`);
    this.state.bankgiro.processedOutgoingSalaries += netAmount;
    this.state.bankgiro.receivedPain001Files.push({
      runId,
      timestamp: new Date().toISOString(),
      netAmount,
      xml: bankXml
    });

    Logger.info(`[Simulator Counterpart: Skatteverket] Processing AGI XML report for period`);
    this.state.skatteverket.receivedAgiReports.push({
      runId,
      timestamp: new Date().toISOString(),
      grossAmount,
      taxAmount,
      employerContributions,
      xml: agiXml
    });

    Logger.info(`[Simulator Counterpart: FORA] Processing pension report for period`);
    this.state.fora.receivedReports.push({
      runId,
      timestamp: new Date().toISOString(),
      grossAmount,
      foraReport
    });

    // Trigger automated FORA Pension Invoice generation (4.5% of total gross salary)
    const totalForaPremium = grossAmount * 0.045;
    Logger.info(`[Simulator Counterpart: FORA] Pension report processed. Issuing matching pension premium invoice for ${totalForaPremium} SEK...`);

    const financeUrl = process.env.FINANCE_SERVICE_URL || 'http://localhost:8084';
    try {
      const invoiceResponse = await axios.post(`${financeUrl}/cfo/ap/invoice`, {
        vendorName: 'FORA Pensioner',
        invoiceReference: `FORA-PREM-${runId}`,
        amountTotal: totalForaPremium,
        amountVat: 0, // Pensions are VAT-exempt
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().substring(0, 10), // Due in 30 days
        category: 'Operating Costs - Pensions (FORA)'
      });

      this.state.fora.sentPensionInvoices.push({
        invoiceId: invoiceResponse.data.invoiceId,
        timestamp: new Date().toISOString(),
        amount: totalForaPremium,
        reference: `FORA-PREM-${runId}`
      });
      Logger.info(`[Simulator Counterpart: FORA] Pension invoice successfully sent to Finance (ID: ${invoiceResponse.data.invoiceId}).`);
    } catch (err: any) {
      Logger.error(`[Simulator Counterpart: FORA] Failed to send pension invoice to Finance: ${err.message}`);
    }
  }
}
