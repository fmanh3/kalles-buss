Feature: CFO Agent - Accounts Receivable & Payments (Kundreskontra)
  As the CFO Agent at Kalles Buss,
  I want to manage outgoing invoices and match them against incoming bank payments,
  So that I can maintain an accurate cash flow forecast and handle overdue payments automatically.

  Background:
    Given the company issues invoices to SL and other B2B partners
    And we receive daily payment files from "Bankgirot" (CAMT.054 / BG Max)

  Scenario: Matching incoming Bankgirot payments to invoices
    Given an outstanding invoice "INV-2026-001" to "SL" for 1,500,000 SEK
    When the daily "Bankgirot" file is ingested via the integration layer
    And the file contains a payment of 1,500,000 SEK with OCR reference matching "INV-2026-001"
    Then the invoice status should be updated to "PAID"
    And a ledger transaction should be created to debit "1930 Företagskonto" and credit "1510 Kundfordringar"

  Scenario: Handling partial payments and currency differences
    Given an outstanding invoice "INV-2026-002" for 50,000 SEK
    When a Bankgirot payment is received for 49,950 SEK with the correct OCR
    Then the invoice status should remain "PENDING_PAYMENT" (Partial)
    And the CFO Agent should evaluate if the 50 SEK difference is a "Bank Fee" or "Currency Difference"
    And if identified as a fee, it should automatically book the 50 SEK to account "6570 Bankkostnader" and mark the invoice "PAID"

  Scenario: Aging analysis and overdue invoice handling
    Given an invoice "INV-2026-003" to a private charter client is 15 days past its due date
    When the CFO Agent runs the daily "Aging Analysis" (Åldersanalys)
    Then the invoice should be flagged as "OVERDUE"
    And the system should automatically generate a "Påminnelse" (Reminder) with statutory reminder fees
    And the CFO Dashboard should update the "Doubtful Debt Risk" metric
