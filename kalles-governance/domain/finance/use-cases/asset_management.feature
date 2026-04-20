Feature: CFO Agent - Asset & Investment Management (Anläggningstillgångar)
  As the CFO Agent at Kalles Buss,
  I want to intelligently manage bus fleet and infrastructure investments,
  So that our Balance Sheet correctly reflects the value of our "Transport-as-Code" assets.

  Background:
    Given the electric bus fleet is capitalized (Anläggningstillgångar)
    And we have a depreciation plan for 10 years (fleet) and 5 years (batteries)

  Scenario: Automatic monthly depreciation of bus fleet
    Given the start of a new month
    And I have 20 "Volvo 7900 Electric" buses in the asset register
    When I reach the month-end closing (Bokslut)
    Then I should calculate the monthly "Avskrivning" (Write-off) based on linear 10-year model
    And I should record the debit in account "7834 Avskrivningar på inventarier"
    And I should record the credit in account "1249 Ackumulerade avskrivningar på bilar"

  Scenario: Periodization of large expenses (Periodisering)
    Given I have received an invoice for "Helårsförsäkring Flotta" of 600,000 SEK
    And the payment was made in January
    When I process the monthly closing for February
    Then I should recognize only 50,000 SEK as an expense
    And I should move the remaining 500,000 SEK to "1700 Förutbetalda kostnader" (Prepaid expenses)
    And I should repeat this monthly allocation for the rest of the year
