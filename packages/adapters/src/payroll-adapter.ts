import { PubSubClient, Logger } from '@kalles-buss/shared-utils';
import axios from 'axios';

export class PayrollAdapter {
  private payrollUrl: string;
  private engineUrl: string;

  constructor(private pubsub: PubSubClient) {
    this.payrollUrl = process.env.PAYROLL_SERVICE_URL || 'http://localhost:8083';
    const enginePort = process.env.VITE_ENGINE_URL ? '' : ':8087';
    this.engineUrl = process.env.VITE_ENGINE_URL || `http://localhost${enginePort}`;
  }

  start() {
    Logger.info('[PayrollAdapter] Starting Payroll-to-Gateway ACL translator...');
    
    this.pubsub.subscribe('integration-events', 'adapters-payroll-sub', async (event: any) => {
      try {
        if (event.eventType === 'ExecuteBankPayment' && event.source === 'PAYROLL') {
          const runId = event.reference;
          Logger.info(`[PayrollAdapter] CFO Approved payroll run ${runId}. Translating into decoupled gateway events...`);

          // 1. Fetch individual employee payroll records from Payroll Service
          const response = await axios.get(`${this.payrollUrl}/api/payroll/runs/${runId}/records`);
          const records = response.data;
          
          if (!records || records.length === 0) {
             Logger.warn(`[PayrollAdapter] No payroll records found for run ${runId}.`);
             return;
          }
          Logger.info(`[PayrollAdapter] Retrieved ${records.length} individual employee payroll line items`);

          const netAmount = records.reduce((sum: number, r: any) => sum + Number(r.net_amount), 0);
          const grossAmount = records.reduce((sum: number, r: any) => sum + Number(r.gross_amount), 0);
          const taxAmount = records.reduce((sum: number, r: any) => sum + Number(r.tax_amount), 0);
          const employerContributions = records.reduce((sum: number, r: any) => sum + Number(r.employer_contributions), 0);

          // 2. Publish BankTransferRequested event for the Central Bankgirot Gateway
          Logger.info(`[PayrollAdapter] Publishing BankTransferRequested on integration-events...`);
          await this.pubsub.publish('integration-events', {
            eventType: 'BankTransferRequested',
            source: 'PAYROLL',
            reference: runId,
            netAmount,
            payments: records.map((r: any) => ({
              id: r.employee_id,
              amount: Number(r.net_amount),
              recipientName: `Employee ${r.employee_id}`,
              iban: `SE882440000000${r.employee_id.replace(/[^0-9]/g, '').substring(0, 8)}`,
              referenceText: `Lön Run ${runId}`
            }))
          });

          // 3. Publish PayrollTaxDeclarationRequested event for the Central Skatteverket Gateway
          Logger.info(`[PayrollAdapter] Publishing PayrollTaxDeclarationRequested on integration-events...`);
          await this.pubsub.publish('integration-events', {
            eventType: 'PayrollTaxDeclarationRequested',
            reference: runId,
            period: new Date().toISOString().substring(0, 7),
            grossAmount,
            taxAmount,
            employerContributions,
            employeeDeclarations: records.map((r: any) => ({
              employeeId: r.employee_id,
              employeeName: `Employee ${r.employee_id}`,
              personNumber: `19${Math.floor(Math.random()*20+70)}0101-1234`, // Mocked for privacy
              grossAmount: Number(r.gross_amount),
              taxAmount: Number(r.tax_amount)
            }))
          });

          // 4. Generate and send FORA Pension Report directly to the Simulator's FORA counterpart receiver
          Logger.info(`[PayrollAdapter] Sending FORA pension report directly to FORA simulator...`);
          const foraReport = {
            orgNumber: '556123-4567',
            period: new Date().toISOString().substring(0, 7),
            employees: records.map((r: any) => ({
              employeeId: r.employee_id,
              grossSalary: Number(r.gross_amount),
              calculatedPensionPremium: Number(r.gross_amount) * 0.045
            }))
          };
          
          await axios.post(`${this.engineUrl}/world/counterpart/fora/received`, {
            runId,
            grossAmount,
            report: foraReport
          });

          Logger.info(`[PayrollAdapter] Translation complete. Decoupled gateways and FORA reported.`);
        }
      } catch (err: any) {
        Logger.error(`[PayrollAdapter] Translation failed: ${err.message}`);
      }
    });
  }
}
