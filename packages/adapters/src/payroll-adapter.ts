import { PubSubClient, Logger } from '@kalles-buss/shared-utils';
import axios from 'axios';

export class PayrollAdapter {
  private payrollUrl: string;
  private engineUrl: string;

  constructor(private pubsub: PubSubClient) {
    // Port 8083 is local kalles-payroll service
    this.payrollUrl = process.env.PAYROLL_SERVICE_URL || 'http://localhost:8083';
    // Port 8080/8087 is World Engine simulation-engine
    const enginePort = process.env.VITE_ENGINE_URL ? '' : ':8087';
    this.engineUrl = process.env.VITE_ENGINE_URL || `http://localhost${enginePort}`;
  }

  start() {
    Logger.info('[PayrollAdapter] Subscribing to payroll integration events...');
    this.pubsub.subscribe('integration-events', 'adapters-payroll-sub', async (event: any) => {
      try {
        if (event.eventType === 'ExecuteBankPayment' && event.source === 'PAYROLL') {
          const runId = event.reference;
          Logger.info(`[PayrollAdapter] CFO approved payroll detected. Initiating de facto bank transfers, Skatteverket AGI reporting, and FORA pension provision for run ${runId}...`);

          // 1. Fetch individual employee payroll records from Payroll Service
          const response = await axios.get(`${this.payrollUrl}/api/payroll/runs/${runId}/records`);
          const records = response.data;
          
          if (!records || records.length === 0) {
             Logger.warn(`[PayrollAdapter] No payroll records found for run ${runId}.`);
             return;
          }
          Logger.info(`[PayrollAdapter] Retrieved ${records.length} individual employee payroll line items`);

          // 2. Generate ISO 20022 pain.001 XML file for Bankgirot (De facto bank file format)
          const bankXml = this.generatePain001Xml(runId, records);
          Logger.info(`[PayrollAdapter] Successfully generated de facto ISO 20022 pain.001.001.03 XML bank transfer order`);

          // 3. Generate Skatteverket AGI XML file (Employer Monthly Declaration)
          const agiXml = this.generateAgiXml(records);
          Logger.info(`[PayrollAdapter] Successfully generated de facto Skatteverket AGI XML monthly employer declaration`);

          // 4. Generate FORA Pension Report CSV/JSON
          const foraReport = this.generateForaReport(records);
          Logger.info(`[PayrollAdapter] Successfully generated FORA pension reports`);

          // 5. POST the generated formats to the World Engine Simulator (Counterpart Receiver)
          Logger.info(`[PayrollAdapter] Transmitting bank files and declarations to World Engine at ${this.engineUrl}...`);
          await axios.post(`${this.engineUrl}/world/counterpart/received`, {
            runId,
            bankXml,
            agiXml,
            foraReport,
            netAmount: records.reduce((sum: number, r: any) => sum + Number(r.net_amount), 0),
            grossAmount: records.reduce((sum: number, r: any) => sum + Number(r.gross_amount), 0),
            taxAmount: records.reduce((sum: number, r: any) => sum + Number(r.tax_amount), 0),
            employerContributions: records.reduce((sum: number, r: any) => sum + Number(r.employer_contributions), 0)
          });
          Logger.info(`[PayrollAdapter] Handshake complete. World Engine received and validated payroll formats.`);
        }
      } catch (err: any) {
        Logger.error(`[PayrollAdapter] Integration failed: ${err.message}`);
      }
    });
  }

  private generatePain001Xml(runId: string, records: any[]): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">\n`;
    xml += `  <CstmrCdtTrfInitn>\n    <GrpHdr>\n      <MsgId>MSG-PAY-${runId}</MsgId>\n      <CreDtTm>${new Date().toISOString()}</CreDtTm>\n      <NbOfTxs>${records.length}</NbOfTxs>\n    </GrpHdr>\n`;
    
    // Debit Party (Kalles Buss)
    xml += `    <PmtInf>\n      <PmtInfId>PMT-INFO-PAYROLL</PmtInfId>\n      <PmtMtd>TRF</PmtMtd>\n      <Dbtr>\n        <Nm>Kalles Buss AB</Nm>\n      </Dbtr>\n      <DbtrAcct>\n        <Id><IBAN>SE00193000000012345678</IBAN></Id>\n      </DbtrAcct>\n`;

    // Credit Parties (Employees)
    for (const record of records) {
      xml += `      <CdtTrfTxInf>\n        <PmtId><EndToEndId>END-${record.employee_id}</EndToEndId></PmtId>\n        <Amt><InstdAmt Ccy="SEK">${Number(record.net_amount).toFixed(2)}</InstdAmt></Amt>\n        <Cdtr>\n          <Nm>Employee ${record.employee_id}</Nm>\n        </Cdtr>\n        <CdtrAcct>\n          <Id><IBAN>SE882440000000${record.employee_id.substring(0, 8)}</IBAN></Id>\n        </CdtrAcct>\n      </CdtTrfTxInf>\n`;
    }

    xml += `    </PmtInf>\n  </CstmrCdtTrfInitn>\n</Document>`;
    return xml;
  }

  private generateAgiXml(records: any[]): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Arbetsgivardeklaration xmlns="urn:skatteverket:agi:v1">\n`;
    xml += `  <Deklarant>\n    <OrgNr>556123-4567</OrgNr>\n    <Namn>Kalles Buss AB</Namn>\n  </Deklarant>\n`;

    for (const record of records) {
      xml += `  <IndividuelltUppgift>\n    <Skatteavdrag>${Number(record.tax_amount).toFixed(2)}</Skatteavdrag>\n    <Avgiftsunderlag>${Number(record.gross_amount).toFixed(2)}</Avgiftsunderlag>\n    <Period>${new Date().toISOString().substring(0, 7)}</Period>\n  </IndividuelltUppgift>\n`;
    }

    xml += `</Arbetsgivardeklaration>`;
    return xml;
  }

  private generateForaReport(records: any[]): any {
    return {
      orgNumber: '556123-4567',
      period: new Date().toISOString().substring(0, 7),
      employees: records.map(r => ({
        employeeId: r.employee_id,
        grossSalary: Number(r.gross_amount),
        calculatedPensionPremium: Number(r.gross_amount) * 0.045
      }))
    };
  }
}
