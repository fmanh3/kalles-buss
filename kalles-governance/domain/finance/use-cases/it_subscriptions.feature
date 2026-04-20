Feature: CFO Agent - IT & Subscription Management
  As the CFO Agent,
  I want to track and optimize IT-related expenditures,
  So that our technology stack remains cost-effective and hardware assets are accounted for.

  Scenario: Capitalization of hardware for new employees
    Given HR has notified of a new "Driver" or "Office" hire
    And I receive an invoice for a "MacBook Pro" and "iPhone 15"
    When I process the payment
    Then I should record these in the "IT Asset Register"
    And I should set a 3-year linear depreciation (avskrivning) schedule
    And I should assign the cost center to the respective department

  Scenario: SaaS Subscription Audit
    Given we have recurring monthly costs for "Google Workspace", "Slack", and "AWS"
    When the monthly "Software Burn Rate" increases by more than 10%
    Then I should identify which domain (HR, Traffic, Depot) caused the increase
    And I should generate a "Subscription Optimization" report for the CEO
