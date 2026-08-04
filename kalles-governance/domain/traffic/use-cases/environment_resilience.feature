Feature: Traffic Agent - Environment & Resilience
  As the Traffic System,
  I want to process real-time telematics and weather data,
  So that I can reward eco-driving and dynamically recover from operational hazards.

  Scenario: Eco-Driving (Energy savings measurement on completed tour)
    Given a bus completes a tour on line "676"
    When the Telematics stream indicates a highly efficient energy consumption profile and smooth braking
    Then the Traffic domain should calculate an "EcoScore"
    And if the EcoScore is in the top 10%, it should emit an "EcoBonusCandidate" event to HR

  Scenario: Dynamic Range Recovery on Extreme Cold
    Given the Weather Integration Layer emits a "WeatherAlert" for "EXTREME_COLD"
    When the Traffic system receives the alert
    Then it should instantly recalculate the expected battery drain for all electric buses
    And it should either shorten active tours or mandate increased charging intervals at depots

  Scenario: Pre-departure Safety Check Fail
    Given driver "DRIVER-007" performs a pre-departure safety check on "BUSS-101"
    When the check fails due to a critical defect
    Then the Traffic system should instantly invalidate "BUSS-101"
    And it should automatically search the local Depot for an equivalent replacement bus
    And if a replacement is found, assign it to the tour without human intervention
