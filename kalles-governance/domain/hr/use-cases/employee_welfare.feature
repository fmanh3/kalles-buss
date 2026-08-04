Feature: HR Agent - Employee Welfare & Safety
  As the HR System,
  I want to ensure the safety and security of all personnel,
  So that in the event of an incident, we have immediate access to necessary emergency protocols.

  Scenario: Emergency contact retrieval during an incident
    Given the Depot domain reports a "Severe Vehicle Incident" involving DRIVER-101
    When the Incident Commander requests emergency contacts
    Then the HR system should bypass standard query delays (Break-glass procedure)
    And provide the verified "Next of Kin" (Anhörig) details instantly
    And log the emergency access to the audit trail

  Scenario: Linking incident reports to personal safety records
    Given an incident report is finalized where a driver acted to prevent an accident
    When the event "SafetyIncidentClosed" is consumed
    Then the HR system should append a "Safety Commendation" to the driver's profile
