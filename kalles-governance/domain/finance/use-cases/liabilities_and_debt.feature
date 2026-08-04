Feature: CFO Agent - Debt & Liabilities Management (Skulder & Amortering)
  As the CFO Agent at Kalles Buss,
  I want to automatically track and manage loans and long-term liabilities,
  So that I can execute amortization schedules correctly and calculate interest expenses.

  Background:
    Given the company has financed the electric bus fleet via a bank loan
    And the loan is structured with monthly amortization and a variable interest rate

  Scenario: Executing a monthly amortization schedule
    Given a long-term loan "LOAN-1" with a principal of 10,000,000 SEK
    And an amortization schedule requiring 100,000 SEK in monthly principal repayment
    When the CFO Agent processes the month-end for April
    Then it should generate a bank transfer for 100,000 SEK
    And debit "2350 Andra långfristiga skulder till kreditinstitut" by 100,000 SEK
    And credit "1930 Företagskonto" by 100,000 SEK
    And update the remaining principal balance of "LOAN-1"

  Scenario: Calculating and booking variable interest
    Given the "LOAN-1" has a variable interest rate of STIBOR 3M + 1.5%
    When the Bank API integration provides the monthly interest invoice of 45,000 SEK
    Then the CFO Agent should verify the calculation against the current STIBOR rate
    And if verified, it should book the interest expense as a debit to "8400 Räntekostnader"
    And credit "1930 Företagskonto"

  Scenario: Reclassifying long-term debt to short-term debt
    Given the financial year ends on December 31st
    When the annual closing process (Årsbokslut) is initiated
    Then the CFO Agent should calculate the total amortization for the upcoming 12 months for "LOAN-1" (1,200,000 SEK)
    And reclassify that amount by debiting "2350 Andra långfristiga skulder"
    And crediting "2800 Övriga kortfristiga skulder"
