Feature: HR Agent - Recruitment Swarm & Cross-Domain Negotiation
  As the Chief HR Agent,
  I want to negotiate recruitment needs with Traffic, Depot, and Finance, and then orchestrate a swarm of specialist agents to hire candidates,
  So that the company scales workforce dynamically based on economic viability without human bottlenecks.

  Background:
    Given the Event Bus is active
    And the HR domain operates a swarm of specialist agents: "AdWriter", "Screener", and "OnboardingBot"

  Scenario: Traffic identifies a long-term resource shortage
    Given the Traffic Planning Agent forecasts a shortage of 3 drivers for "Linje 676" next month
    When Traffic calculates that the shortage will result in 150,000 SEK in penalties (Viten)
    Then Traffic must emit a "ResourceShortageForecast" event requesting 3 new "DRIVER" roles

  Scenario: CFO Agent evaluates the economic viability of hiring
    Given a "ResourceShortageForecast" is received by the Finance domain
    When the CFO Agent calculates the cost of hiring 3 drivers (e.g., 3 * 40,000 SEK = 120,000 SEK)
    And compares it to the projected penalties (150,000 SEK)
    Then the CFO Agent should approve the budget because Cost < Penalties
    And emit a "BudgetApproved" event tagged to the specific recruitment request
    # If Cost > Penalties, the CFO would reject, and Traffic must accept the penalties.

  Scenario: HR Swarm executes the approved recruitment
    Given HR receives a "BudgetApproved" event for 3 "DRIVER" roles
    When the "AdWriter" Agent generates a targeted job listing for "Norrtälje"
    And the "Screener" Agent processes a batch of incoming simulated CVs
    Then the Screener must output a strict JSON evaluation (Zod Schema) for each candidate
    And identity at least 3 candidates passing the "Golden Base-layer" (YKB + Körkort D)
    And the "OnboardingBot" must initiate a "Standard Driver Onboarding" workflow in the Process Engine
    And the Process Engine must orchestrate the cross-domain actions (IAM, Uniform, Training)
    And emit an "EmployeeFleetReady" event once all steps are completed
