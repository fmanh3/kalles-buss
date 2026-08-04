Feature: HR Agent - Life Cycle Management & Self-Service
  As the HR System,
  I want to process employee leave requests and lifecycle transitions,
  So that the Process Engine can orchestrate cross-domain impacts.

  Scenario: Orchestrated Parental Leave (Process Engine integration)
    Given an employee submits an application for 30 days of "Föräldraledighet" (Parental Leave)
    When the HR Agent validates the request
    Then HR should initiate a "Parental Leave Workflow" in the Process Engine
    And the Process Engine should notify Traffic to mark the driver as "UNAVAILABLE"
    And the Process Engine should notify Finance/Payroll to calculate supplements
