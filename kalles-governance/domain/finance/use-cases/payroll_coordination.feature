Feature: CFO Agent - Payroll & Tax Coordination (Bridge with HR)
  As the CFO Agent,
  I want to coordinate with the HR Domain to process salaries and taxes,
  So that employees are paid correctly and "Arbetsgivardeklaration" is filed on time.

  Background:
    Given HR has finalized the monthly "Salary Basis" (Löneunderlag)

  Scenario: Processing Monthly Payroll & Social Fees
    Given I have received the total gross salary amount of 1,200,000 SEK from HR
    When I calculate the monthly financial impact
    Then I should calculate "Arbetsgivaravgifter" (31.42%) of 377,040 SEK
    And I should provision the "Personalens källskatt" (Preliminary tax)
    And I should schedule the bank transfer for the 25th of the month
    And I should record the debit in "7010 Löner till kollektivanställda"

  Scenario: Automated AGI Reporting to Skatteverket
    Given the payroll cycle is complete
    When the date is the 12th of the following month
    Then I should aggregate individual employee tax data from the HR domain
    And I should generate the "Arbetsgivardeklaration på individnivå" (AGI) file
    And I should submit the payment for social fees and tax to the "Skattekonto"
