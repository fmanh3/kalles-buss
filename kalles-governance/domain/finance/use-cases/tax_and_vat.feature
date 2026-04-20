Feature: CFO Agent - Tax Compliance & VAT (Skatt & Moms)
  As the CFO Agent at Kalles Buss,
  I want to automate the Swedish "Skattedeklaration" process,
  So that the company is always compliant with Skatteverket rules and VAT is handled correctly.

  Background:
    Given the current accounting month has ended
    And all "Invoices Out" (Utgående fakturor) and "Invoices In" (Leverantörsfakturor) have been finalized

  Scenario: Monthly VAT Settlement (Momsredovisning)
    Given the revenue from SL had "Utgående Moms" (Output VAT) of 6% (Transport rate)
    And the electricity and parts purchases had "Ingående Moms" (Input VAT) of 25% (Standard rate)
    When I reach the tax reporting deadline (12th of month n+1)
    Then I should calculate the net VAT to pay or be refunded
    And I should generate a ready-to-sign "Momsdeklaration" for the CEO
    And I should book the transfer from "2641 Ingående moms" and "2611 Utgående moms" to "2650 Momsredovisningskonto"

  Scenario: Intelligent detection of non-deductible items
    Given a new receipt for "Företagsfest - Underhållning" is submitted
    When the amount exceeds 450 SEK per person excl. VAT
    Then I should automatically split the booking between deductible and non-deductible accounts
    And I should correctly adjust the "Momslyft" (VAT deduction) according to current Swedish rules
    And I should notify the employee of the adjustment
