Feature: CFO Agent - Financial Reporting (Bokslut & Rapportering)
  As the CFO Agent at Kalles Buss,
  I want to provide the CEO with high-signal financial reporting,
  So that the company's "Walking Skeleton" grows into a profitable bus empire.

  Background:
    Given all ledger entries for the period are finalized

  Scenario: Intelligent Quarterly Reporting (Kvartalsrapport)
    Given I have reached the end of Q1 (March 31st)
    When I aggregate the data from Traffic (production KM) and Ledger
    Then I should generate a Balance Sheet (Balansräkning)
    And I should generate a Profit & Loss (Resultaträkning)
    And I should highlight the "EBITDA Margin" for the CEO
    And I should compare performance against the "Business Case for Norrtälje-Sthlm"

  Scenario: Automated Yearly Closing (Årsbokslut)
    Given I have reached the end of the fiscal year (December 31st)
    When I reach the closing deadline
    Then I should perform final stock-taking of energy inventory (Depot)
    And I should reconcile all bank statements against the General Ledger
    And I should produce a draft "Förvaltningsberättelse" for the Annual Report
    And I should propose the amount for "Utdelning" or "Balanserad vinst"
