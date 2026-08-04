Feature: HR Agent - Payroll Integration (Bridge to Finance)
  As the HR System,
  I want to act as a passive listener for operational shifts and transform them to financial data,
  So that the CFO Agent can accurately book salaries and provisions.

  Scenario: Transforming completed shifts to ledger orders
    Given the Traffic domain publishes a "ShiftCompleted" event for a driver (8 hours regular, 2 hours OB-tillägg)
    When the HR Agent's passive listener consumes the event
    Then it should calculate the gross pay impact using the driver's individual salary matrix
    And transform the data into a "PayrollProvisionOrder"
    And emit an event to the Finance domain to provision the expense in the General Ledger
