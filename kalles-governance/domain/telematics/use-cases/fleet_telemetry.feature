Feature: IoT Integration - Telematics (Real-time Fleet Data)
  As the Telematics Integration Layer,
  I want to process high-frequency sensor data from the electric bus fleet,
  So that operational domains (Traffic, Energy, Finance) can react to real-world conditions.

  Background:
    Given the Telematics domain is strictly decoupled from the static Asset Register (Depot)
    And it receives raw IoT payloads via MQTT/AMQP from the vehicles

  Scenario: High-frequency Vehicle Telemetry Update
    Given a bus "BUSS-101" is currently executing a tour on line "676"
    When the vehicle transmits its 5-second telemetry heartbeat
    Then the Telematics service should sanitize and publish a "VehicleTelemetryUpdate" event
    And the event must contain "VehicleId", "GPS_Coordinates", "CurrentSOC", "Speed", and "Odometer"
    And the Traffic domain should consume this to update the Live Map

  Scenario: Passenger Load Monitoring (APC Sensors)
    Given a bus passes an Automated Passenger Counter (APC) at a bus stop
    When the total passenger count on board exceeds 80
    Then the Telematics service should immediately emit a "PassengerLoadUpdate" event
    And the event should be flagged as a "LoadAlert" (Capacity Warning)
    And the Traffic domain should evaluate if a relief bus (insatsbuss) is required

  Scenario: Critical Fault Detection (IoT Diagnostics)
    Given a bus "BUSS-102" is in motion
    When the onboard diagnostics report a severe battery thermal runaway risk
    Then the Telematics service must emit a "CriticalFaultDetected" event with highest priority
    And the Traffic domain must immediately schedule an operational stop
    And the HR domain should instruct the driver to evacuate
