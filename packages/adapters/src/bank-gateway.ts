import { PubSubClient, Logger } from '@kalles-buss/shared-utils';

export interface BankgirotPayment {
  amount: number;
  reference: string;
  paymentDate: string;
}

export class BankGateway {
  constructor(private pubsub: PubSubClient) {}

  /**
   * Simulates receiving a file from Bankgirot.
   * This is the "Outer Ring" that translates external formats to domain events.
   */
  async processIncomingPayments(payments: BankgirotPayment[]) {
    Logger.info(`[BankGateway] Received ${payments.length} payments from Bankgirot. Translating to events...`);

    for (const payment of payments) {
      const event = {
        eventType: 'BankgirotPaymentReceived',
        ocrNumber: payment.reference,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        timestamp: new Date().toISOString()
      };
      
      await this.pubsub.publish('finance-events', event);
      Logger.info(`[BankGateway] Published BankgirotPaymentReceived event for OCR ${payment.reference}.`);
    }
  }
}
