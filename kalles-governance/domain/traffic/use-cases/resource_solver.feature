Feature: Traffic Agent - Multi-Depot Resource Solver & HR Integration
  As the Traffic System,
  I want to orchestrate resources across multiple depots and strictly enforce compliance,
  So that schedules are optimal and illegal driving is prevented.

  Scenario: Certifieringsstopp (Driver without route knowledge is denied)
    Given a tour requires a driver on line "676" originating from "Norrtälje Depot"
    When the Resource Solver attempts to assign driver "DRIVER-007"
    And the HR system's Skills API returns false for "Line Knowledge 676"
    Then the assignment must be rejected
    And an alternative driver must be selected from the "Norrtälje Depot" pool

  Scenario: Depåflytt (Fleet Migration)
    Given a bus "BUSS-300" is currently registered at "Norrtälje Depot"
    When a "FleetMigration" event is received stating "BUSS-300" has been transferred to "Tekniska Depot"
    Then the Traffic domain should update its internal capacity view
    And "BUSS-300" should no longer be available for tours originating from "Norrtälje Depot"
    And "BUSS-300" should become available for tours from "Tekniska Depot"
