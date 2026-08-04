Feature: Depot Agent - The Repair Negotiator (The Windshield Principle)
  As the Depot Agent,
  I want to autonomously negotiate repair strategies for vehicle defects,
  So that I can balance immediate operational needs against financial constraints.

  Background:
    Given a bus "BUSS-101" reports a critical defect "DEFECT-WINDSHIELD"
    And the part "PART-WINDSHIELD" has an internal lead time of 5 days
    And the external partner "Ryds Bilglas" can fix it in 1 day but costs 250% more

  Scenario: External vs Internal Repair Negotiation (High Traffic Penalty)
    Given the Traffic Planning Agent indicates a penalty cost of 15,000 SEK/day for a grounded bus at this depot
    When the Repair Negotiator evaluates the defect
    Then it calculates the total cost of internal repair (Parts + Labor + 6 days of penalties)
    And it calculates the total cost of external repair (External Invoice + 1 day of penalties)
    And since the external partner results in lower total economic loss
    And the CFO Agent approves the immediate liquidity
    Then the Negotiator should decide on `USE_EXTERNAL_PARTNER`
    And log the rationale in a `DecisionRecord`

  Scenario: Preventive Maintenance Scheduling (Telematics integration)
    Given bus "BUSS-200" has a service interval of 15,000 km
    When the Telematics listener processes a `VehicleTelemetryUpdate` indicating an odometer reading of 15,050 km
    Then the Depot Agent should create a new `WorkOrder` for "15k Service"
    And update the vehicle's technical asset status to `AWAITING_MAINTENANCE`
    And publish a `FleetCapacityReduced` event to Traffic
