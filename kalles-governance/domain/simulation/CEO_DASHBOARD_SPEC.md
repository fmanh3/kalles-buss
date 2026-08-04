# Specification: CEO Executive Dashboard (Management by Exception)

## 1. Vision: "The Autonomous Pulse"
The CEO Dashboard provides a high-level executive overview of the company's health across four strategic dimensions. It follows the "Management by Exception" principle: if the system is operating within the defined autonomous boundaries (Golden Base-layers), the status remains Green.

## 2. Core Strategic Views

### 2.1 Economy (Finance Domain)
*   **Metrics:** Current Bank Balance, 30-day Liquidity Forecast, Total Revenue for the current run.
*   **Status Triggers:** 
    *   YELLOW: Overdue customer invoices.
    *   RED: Liquidity drops below the operating reserve.

### 2.2 Traffic (Traffic Domain)
*   **Metrics:** Planned vs. Actual Service Journeys. Number of active Blocks (vehicle chains).
*   **Visuals:** A list of daily runs grouped by Depot. Detailed view of driver-to-tour assignments.
*   **Status Triggers:** 
    *   YELLOW: Minor delays (>10 mins) on major routes (Line 676).
    *   RED: Unassigned tours or critical driver shortages.

### 2.3 Depot (Depot Domain)
*   **Metrics:** Fleet availability percentage. Inventory status for critical components.
*   **Status Triggers:** 
    *   YELLOW: Spare part stock below safety threshold.
    *   RED: More than 20% of the fleet grounded for maintenance.

### 2.4 IT (Infrastructure)
*   **Metrics:** Microservice health (Heartbeat). Event bus latency.
*   **Status Triggers:** 
    *   RED: Any Cloud Run service reported as DOWN.

## 3. Implementation Plan
1.  **BFF Aggregator:** Add `/api/ceo/status` in the BFF to collect summarized KPIs from all four domain databases.
2.  **Portal Role:** Implement a `CEO` role in the React frontend with a high-level "Traffic Light" landing page.
3.  **Navigation:** Allow the CEO to drill down from a "Yellow" status light directly into the offending domain (e.g., clicking on a Yellow Depot light shows the missing part).
