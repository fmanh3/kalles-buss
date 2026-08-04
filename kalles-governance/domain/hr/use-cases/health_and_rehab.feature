Feature: HR Agent - Health & Rehabilitation
  As the HR System,
  I want to manage employee health proactively while strictly adhering to GDPR,
  So that we fulfill Swedish rehabilitation laws without compromising privacy.

  Background:
    Given strict RBAC is enforced on all health-related endpoints

  Scenario: Proactive absence pattern detection
    Given a driver has had 3 short-term sick leaves within a 6-month period
    When the HR Agent runs the weekly welfare analysis
    Then it should flag the pattern as "Risk for Long-term Sickness"
    And send a secure, confidential notification to the direct manager to initiate a "Välmåendesamtal" (Welfare check-in)

  Scenario: Secure handling of medical certificates and rehab plans
    Given a driver is on long-term sick leave (more than 14 days)
    When a medical certificate (Läkarintyg) is uploaded to the portal
    Then it must be encrypted and stored in the "Secure Health Vault"
    And access must be restricted strictly to authorized HR Rehabilitation Specialists
    And the system should automatically generate a draft "Rehabiliteringsplan" aligned with Swedish Försäkringskassan guidelines

  Scenario: Tracking mandatory periodic medical examinations for license renewal
    Given a driver holds a "Körkort D"
    And the driver is approaching a 5-year renewal cycle (age > 45)
    When the HR system runs the "Compliance Forecast" 6 months before expiry
    Then it should flag the requirement for "Periodisk Läkarkontroll" and "Synundersökning"
    And create an automated booking request to the occupational health service (Företagshälsovården)
    And block the Körkort D renewal in the system until the medical certificate is securely uploaded
