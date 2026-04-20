Feature: CFO Agent - Accounts Payable (Leverantörsskulder)
  As the CFO Agent at Kalles Buss,
  I want to intelligently manage incoming vendor invoices,
  So that I can optimize our cash flow while maintaining strong supplier relationships.

  Background:
    Given the company is in an active operating period
    And we have a current cash flow forecast for the next 30 days

  Scenario: Intelligent prioritization of incoming electricity invoice
    Given I have received a digital invoice from "Vattenfall" for "Laddstation Norrtälje"
    And the invoice amount is 125,000 SEK (including 25% VAT)
    And the due date is in 10 days
    When I analyze the current liquidity and upcoming SL settlement
    Then I should categorize the expense as "Direct Operating Cost - Energy"
    And I should propose to pay the invoice 2 days before the due date to maximize interest on cash
    And I should record the "Ingående Moms" (Input VAT) of 25,000 SEK in the tax sub-ledger

  Scenario: Risk identification for disputed vendor invoice
    Given I have received an invoice from "Scania Verkstad" for "Reparation BUSS-102"
    And the cost exceeds the standard maintenance budget by 15%
    When I cross-reference with the Depot Maintenance log for BUSS-102
    Then I should flag this invoice for "CEO Review"
    And I should pause the automated payment workflow until the discrepancy is resolved
    And I should update the "Maintenance Risk" status in the CFO dashboard
