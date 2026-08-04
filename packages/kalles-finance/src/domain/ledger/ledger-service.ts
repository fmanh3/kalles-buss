import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export interface Account {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE' | 'EQUITY';
  balance_side: 'DEBIT' | 'CREDIT';
  vat_code?: string;
  is_active: boolean;
}

export interface LedgerEntry {
  account_code: string;
  debit: number;
  credit: number;
  cost_center?: string;
  project_code?: string;
}

export interface LedgerTransactionRequest {
  description: string;
  source_type: string;
  source_reference?: string;
  entries: LedgerEntry[];
}

export class LedgerService {
  constructor(private db: Knex) {}

  async createAccount(account: Account) {
    await this.db('accounts').insert(account);
    return account;
  }

  async getAccount(code: string): Promise<Account | undefined> {
    return this.db('accounts').where({ code }).first();
  }

  /**
   * Modifying a posted transaction is strictly forbidden in Kalles Buss.
   * This method exists solely as a honey-pot/guardrail to enforce immutability and create an audit trail.
   */
  async modifyTransaction(transactionId: string, agentId: string, requestedChanges: any) {
    await this.db('audit_logs').insert({
      entity_type: 'LEDGER_ENTRY',
      entity_id: transactionId,
      action: 'ILLEGAL_MODIFICATION_ATTEMPT',
      new_value: requestedChanges,
      agent_id: agentId
    });

    throw new Error(`Immutable Record: General Ledger transactions cannot be modified. Please use a reversing transaction (Stornobokning). Transaction ID: ${transactionId}`);
  }

  async recordTransaction(req: LedgerTransactionRequest) {
    // 1. Verify Double-Entry Balance
    const totalDebit = req.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = req.entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Unbalanced Transaction: Debit (${totalDebit}) != Credit (${totalCredit})`);
    }

    const transactionId = uuidv4();

    await this.db.transaction(async (trx) => {
      await this.recordTransactionWithTrx(trx, req);
    });

    return transactionId;
  }

  async recordTransactionWithTrx(trx: Knex.Transaction, req: LedgerTransactionRequest) {
    // 1. Verify Double-Entry Balance
    const totalDebit = req.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = req.entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Unbalanced Transaction: Debit (${totalDebit}) != Credit (${totalCredit})`);
    }

    const transactionId = uuidv4();

    // 2. Insert Transaction Header
    await trx('ledger_transactions').insert({
      id: transactionId,
      description: req.description,
      source_type: req.source_type,
      source_reference: req.source_reference
    });

    // 3. Insert Entries
    const entryRows = req.entries.map(e => ({
      id: uuidv4(),
      transaction_id: transactionId,
      account_code: e.account_code,
      debit: e.debit,
      credit: e.credit,
      cost_center: e.cost_center,
      project_code: e.project_code
    }));

    await trx('ledger_entries').insert(entryRows);

    return transactionId;
  }

  async getTrialBalance() {
    return this.db('ledger_entries')
      .select('account_code')
      .sum('debit as total_debit')
      .sum('credit as total_credit')
      .groupBy('account_code');
  }

  /**
   * Seeder: Enures that the standard BAS accounts for Kalles Buss exist.
   */
  async ensureBasAccounts() {
    const counts = await this.db('accounts').count('code as count').first();
    if (Number(counts?.count || 0) > 0) return;

    console.log('[LedgerService] Populating initial BAS Chart of Accounts...');
    const initialAccounts: Account[] = [
      { code: '1930', name: 'Företagskonto (Bank)', type: 'ASSET', balance_side: 'DEBIT', is_active: true },
      { code: '1510', name: 'Kundfordringar', type: 'ASSET', balance_side: 'DEBIT', is_active: true },
      { code: '2440', name: 'Leverantörsskulder', type: 'LIABILITY', balance_side: 'CREDIT', is_active: true },
      { code: '2611', name: 'Utgående moms (6%)', type: 'LIABILITY', balance_side: 'CREDIT', is_active: true },
      { code: '2641', name: 'Ingående moms (25%)', type: 'ASSET', balance_side: 'DEBIT', is_active: true },
      { code: '2710', name: 'Personalskatt', type: 'LIABILITY', balance_side: 'CREDIT', is_active: true },
      { code: '2730', name: 'Lagstadgade soc.avg.', type: 'LIABILITY', balance_side: 'CREDIT', is_active: true },
      { code: '2820', name: 'Kortfristiga skulder anställda', type: 'LIABILITY', balance_side: 'CREDIT', is_active: true },
      { code: '3010', name: 'Biljettintäkter', type: 'REVENUE', balance_side: 'CREDIT', is_active: true },
      { code: '4010', name: 'Inköp El/Energi', type: 'EXPENSE', balance_side: 'DEBIT', is_active: true },
      { code: '4020', name: 'Underhåll Fordon', type: 'EXPENSE', balance_side: 'DEBIT', is_active: true },
      { code: '7010', name: 'Löner till anställda', type: 'EXPENSE', balance_side: 'DEBIT', is_active: true },
      { code: '2091', name: 'Balanserad vinst', type: 'EQUITY', balance_side: 'CREDIT', is_active: true }
      ];


    await this.db('accounts').insert(initialAccounts).onConflict('code').ignore();
  }
}
