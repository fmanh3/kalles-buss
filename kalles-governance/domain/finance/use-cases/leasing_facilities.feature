Feature: CFO Agent - Leasing & Facilities
  As the CFO Agent,
  I want to manage lease agreements for buildings and depot infrastructure,
  So that our long-term liabilities are accurately reported in the Balance Sheet.

  Scenario: Monthly Depot Lease Processing
    Given we have a lease agreement for "Norrtälje Depot"
    When the monthly rental invoice is received
    Then I should verify the amount against the "Consumer Price Index" (KPI) adjustment clause
    And I should record the payment, splitting it between "Lease Liability" and "Interest Expense"
    And I should update the "Right-of-Use" asset value in the ledger

  Scenario: Recognition of new Charging Infrastructure Lease
    Given the Depot domain has signed a new lease for "Super-Fast DC Chargers"
    When the contract metadata is ingested
    Then I should calculate the "Net Present Value" (NPV) of the lease
    And I should recognize the liability in account "2800 Övriga kortfristiga skulder"
