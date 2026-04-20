Feature: CFO Agent - Sick Leave & Sickness Expenses
  As the CFO Agent,
  I want to manage the financial impact of employee sick leave,
  So that "Sjuklön" is paid correctly and provisions for long-term sickness are made.

  Scenario: Financial calculation of short-term sick leave (Sjuklön)
    Given HR has reported a sick leave period of 5 days for a driver
    When I process the salary for that period
    Then I should apply the "Karensavdrag" (Qualifying deduction)
    And I should calculate "Sjuklön" at 80% of the gross salary for days 2-5
    And I should record this cost specifically in account "7210 Sjuklöner"

  Scenario: Tracking long-term sickness risk and provisions
    Given an employee has been sick for more than 14 days
    When the responsibility shifts to "Försäkringskassan"
    Then I should stop the internal salary payment for that employee
    And I should flag the case for HR's "Rehabiliteringsansvar" (Rehabilitation responsibility)
    And I should report the "Sjukfrånvaro" statistics in the quarterly report to the CEO
