Feature: Depot Agent - Asset Lifecycle & Maintenance
  As the Depot System,
  I want to maintain the definitive state of all physical assets and their components,
  So that Traffic never schedules a broken bus and maintenance is proactive.

  Scenario: Grounding a vehicle upon Critical Safety Failure
    Given a bus "BUSS-101" is "OPERATIONAL"
    When the Traffic domain signals a "SafetyCheckFail" for "BUSS-101"
    Then the Depot system must immediately change the asset status to "IN_REPAIR"
    And it must generate an open "Work Order" for the workshop
    And it must emit a "FleetCapacityReduced" event to notify Traffic

  Scenario: Component Swap (Battery Replacement)
    Given a bus "BUSS-200" has a degraded battery pack "BAT-001"
    When a mechanic completes a Work Order to replace "BAT-001" with "BAT-002"
    Then the system must update the Bill of Materials (BOM) for "BUSS-200"
    And "BAT-001" must be marked as "DECOMMISSIONED" or "SENT_FOR_RECYCLING"
    And the new battery capacity metrics must be synced to the Traffic domain

  Scenario: Enforcing Statutory Inspections
    Given a vehicle requires an annual inspection by "2026-08-01"
    When the system runs the monthly compliance check
    Then it should automatically schedule a "Statutory Inspection" Work Order 30 days prior
    And if the date passes without a passed inspection, the vehicle must be forced to "DECOMMISSIONED"
