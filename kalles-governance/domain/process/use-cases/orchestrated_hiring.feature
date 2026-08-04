Feature: Process Engine - Orchestrated Hiring & Onboarding
  As the Kalles Buss Process Engine,
  I want to orchestrate the lifecycle of an employee across multiple domains,
  So that onboarding is efficient, context-isolated, and compliant with the Elevator Principle.

  Background:
    Given the standalone Process Engine is running on port 8086
    And the HR domain is running on port 8082
    And a "Standard Driver Onboarding" template exists in the Process Smörgåsbord
    And the Event Bus is active

  Scenario: Successful hiring and automated onboarding initiation (Happy Flow)
    Given an HR Administrator submits a "Hire Employee" form for "Bengt Broms" as a "DRIVER"
    When the HR domain creates the core employee record (Våning 0)
    Then the HR domain must notify the Process Engine to initiate the onboarding (Våning 1)
    And the Process Engine should create an active workflow with status "ACTIVE"
    And the workflow should contain 5 steps: "Verify Identity", "Collect Bank Details", "Provision Email", "Order Uniform", and "Safety Certification"

  Scenario: Agent-driven task completion in the onboarding process
    Given an active onboarding workflow for "Bengt Broms"
    And the step "Provision Email" is of type "AGENT_TRIGGER"
    When the IT Agent receives the trigger via the Event Bus
    And the IT Agent successfully creates the account "bengt.broms@kallesbuss.se"
    And the IT Agent marks the step as "COMPLETED" via the Process Engine API
    Then the step "Provision Email" status must be "COMPLETED"
    And the "result_data" must contain the new email address

  Scenario: Transition to Operational State (Fleet-Ready)
    Given an active onboarding workflow for "Bengt Broms" with 4 of 5 steps completed
    When the HR Administrator completes the final step "Safety Certification"
    Then the Process Engine must mark the entire workflow as "COMPLETED"
    And the Process Engine must emit a "WorkflowCompleted" event on the Event Bus
    And the Traffic domain should receive the event and mark the driver as "FLEET_READY"

  Scenario: Idempotent step completion to avoid race conditions
    Given an active onboarding workflow for "Bengt Broms"
    And the step "Order Uniform" is already marked as "COMPLETED"
    When a Depot Agent accidentally tries to complete the "Order Uniform" step again
    Then the Process Engine should return the current state without creating a duplicate record
    And the workflow must remain in a consistent state
