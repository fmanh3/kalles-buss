Feature: External Integration - Weather Service
  As the Weather Integration Layer,
  I want to provide deterministic weather forecasts and real-time alerts,
  So that the Traffic domain can adjust schedules and Depot can prepare the fleet (e.g. pre-heating).

  Scenario: Requesting an Operational Weather Forecast
    Given the Traffic domain is generating the roster for the next 24 hours
    When it queries "GetForecast" for location "Norrtälje RC" with a 24h "timeWindow"
    Then the Weather service should return temperature, wind speed, and precipitation
    And it should calculate and append an "Operational Risk Level" (e.g., LOW, MEDIUM, HIGH)
    And Traffic should increase buffer times if the risk level is HIGH

  Scenario: Real-time Weather Alert (e.g. Sudden Ice)
    Given the current weather conditions change rapidly
    When the meteorological API reports "Plötslig Halka" (Sudden Ice) in the operational area
    Then the Weather service should emit a "WeatherAlert" event
    And the Traffic domain should broadcast a speed reduction warning to all active vehicles via Telematics
