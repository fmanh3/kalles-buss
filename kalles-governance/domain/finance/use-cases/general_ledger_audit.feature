Feature: CFO Agent - General Ledger & Immutable Audit Trail (Huvudbok)
  As the CFO Agent at Kalles Buss,
  I want to maintain a strict, immutable double-entry ledger with dimensions,
  So that all financial records are completely traceable and ready for auditing.

  Background:
    Given the ledger is configured with the standard BAS chart of accounts
    And tracking is enabled for dimensions "Cost Center" (Kostnadsställe) and "Project" (Projekt)

  Scenario: Booking a transaction with multiple dimensions
    Given a ledger transaction is initiated for "Marketing Campaign Norrtälje"
    When the transaction includes a debit of 50,000 SEK to account "5900 Reklam och PR"
    And it is tagged with Cost Center "HQ" and Project "Kampanj-2026"
    And the transaction includes a credit of 50,000 SEK to account "1930 Företagskonto"
    Then the ledger should accept the transaction because debit equals credit
    And the dimension tags "HQ" and "Kampanj-2026" should be saved immutably on the debit entry

  Scenario: Enforcing immutable audit trail for transactions
    Given a posted ledger transaction with ID "TRX-1001" exists in the General Ledger
    When a user or agent attempts to modify the "amount" or "account" of "TRX-1001"
    Then the system should reject the modification with an "Immutable Record" error
    And any necessary corrections must be forced through a new reversing transaction (Stornobokning)
    And an audit event "ILLEGAL_MODIFICATION_ATTEMPT" must be logged with the actor's identity

  Scenario: Enforcing immutable audit trail for Posting Rules
    Given a Posting Rule "RULE-001" defines how bus repairs are booked
    When the CFO Agent updates "RULE-001" to change the expense account
    Then the old rule should be versioned or archived, not overwritten
    And the update event must be logged with a timestamp and the agent's ID
