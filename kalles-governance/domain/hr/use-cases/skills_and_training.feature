Feature: HR Agent - Skills & Training (Kompetensmatris)
  As the HR System,
  I want to maintain a strict matrix of driver competencies and type ratings,
  So that Traffic only schedules qualified drivers and skill gaps are proactively closed.

  Background:
    Given the HR domain holds the "Master of People" data
    And driver competencies have expiration dates (e.g., YKB, specific vehicle types)

  Scenario: Traffic queries driver competence for a specific vehicle
    Given Traffic needs to assign a driver to a "Boggi-buss" (Type: BOGGI_15M)
    When Traffic queries the HR Interface "Has driver DRIVER-007 competence for BOGGI_15M today?"
    Then the HR system should check the competence matrix
    And return "true" only if the Type Rating exists, is active, and has not expired
    And log the authorization check for compliance tracking

  Scenario: Skill Gap Event initiates a training workflow
    Given the Traffic domain publishes a "SkillGapIdentified" event for "Electric Double-Decker"
    When the HR Agent receives the event
    Then it should query the employee database for candidates with "Excellent" safety records
    And generate a "Recommended Training Cohort" list
    And propose an internal training schedule to close the gap within 30 days

  Scenario: Compliance base-layer prevents unqualified driving
    Given a driver is assigned to a shift
    When the HR system evaluates the driver's competence
    Then it must first verify the "Golden Trio" of base compliance
    And the driver must possess a valid "Körkort D"
    And the driver must possess a valid "YKB" (Yrkeskompetensbevis)
    And if any of these are expired, the system must immediately return "false" regardless of specific Type Ratings
    And it should alert Traffic that the driver is grounded

  Scenario: Tracking YKB periodic training
    Given a driver's YKB expires in 12 months
    When the HR system runs the "Compliance Forecast"
    Then it should automatically schedule the driver for "YKB Delkurs 1-5"
    And notify Traffic to block out training days in the roster
