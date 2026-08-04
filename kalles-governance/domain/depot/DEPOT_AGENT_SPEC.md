# Specification: Depot Agent & Asset Management (v2.0)

## 1. Vision: "The Autonomous Workshop & Inventory"
To transform the Depot domain into a proactive center for MRO (Maintenance, Repair, Operations) and Energy Management. The Depot Agent ensures assets are operational, compliant, and powered cost-effectively.

## 2. Integrated Modules

### 2.1 EAM & Inventory (Standard MRO)
*   **Asset Master:** Central registry for all physical assets (Buses, Lifts, Tools).
*   **VMRS Taxonomy:** Adherence to the Vehicle Maintenance Reporting Standards (VMRS) for component and failure coding.
*   **Auto-Procurement:** Real-time stock tracking with agent-driven reorder logic (Refer to `INVENTORY_RULES.md`).

### 2.2 Energy Management (Laddning & Effekt)
*   **Smart Charging:** Optimization of charging cycles based on spot-prices and traffic demand (Refer to `ENERGY_MANAGEMENT.md`).
*   **SOC Monitoring:** Real-time battery state tracking via IoT telematics.

### 2.3 Proactive Maintenance & IoT
*   **Odometer Tracking:** Consume the `VehicleTelemetryUpdate` event from the Event Bus to track real-time mileage.
*   **Interval Servicing:** Automatically generate Work Orders when service intervals (e.g., 15,000 km) are reached, constrained by local `maintenance_capacity` at the depot.
*   **Battery Health (SOC):** Monitor battery degradation. Raise alerts if effective range drops below the required operational threshold for assigned lines.

### 2.3 The Repair Negotiator (Agentic Decision Layer)
*   **The Windshield Principle:** When a `Defect` is reported (e.g., cracked windshield), the Agent builds a cost/revenue calculation.
*   **Cross-Domain Negotiation:** The Depot Agent queries *Finance* (for budget availability) and *Traffic* (for penalty costs if the bus is grounded). It decides whether to use an internal mechanic (cheaper but requires waiting for part lead times) or an external partner (expensive but immediate).
*   **Decision Logging:** The final negotiated outcome MUST be logged as a `DecisionRecord` (Decision, Alternatives, Economic Rationale) and emitted to the Event Bus for future RLHF (Reinforcement Learning from Human Feedback) evaluations by the CEO/Board.

### 2.4 Smart Energy Charging (CFO alignment)
*   Implement a charging algorithm within `ChargerAgent` that schedules charging sessions during low spot-price windows, provided it does not violate the Traffic schedule requirements.

## 3. Gherkin Scenarios (Use Cases)
*   **Scenario: Auto-Procurement on Stock Breach.** Given a safety stock level of 5 for "Wiper Blades", when the current stock drops to 4, then the system should automatically emit a `PurchaseOrderCreated` event for the predefined reorder quantity.
*   **Scenario: External vs Internal Repair Negotiation.** Given a critical defect and a 5-day lead time for internal parts, when the Traffic penalty exceeds the cost of an external partner, then the Negotiator should decide on `USE_EXTERNAL_PARTNER` and log the rationale.
*   **Scenario: Preventive Maintenance Scheduling.** Given a bus exceeds the 15,000 km threshold, when the Telematics listener processes the odometer update, then a new `WorkOrder` should be created and the vehicle status set to `AWAITING_MAINTENANCE`.

## 4. Execution Workflow (For the coding agent)
1.  **Gherkin first:** Write the `.feature` files for MRP logic (Inventory/Procurement) and the Repair Negotiation in `kalles-governance/domain/depot/use-cases/`.
2.  Create Knex migrations for `sku_catalog`, `inventory_levels`, `purchase_orders`, and `decision_logs`.
3.  Implement business logic in TypeScript under `packages/kalles-energy-depot` and attach `tracingMiddleware`.
4.  Validate with Vitest suites and ensure readiness for Terraform deployment.
5.  **Scenario Testing:** Create a "The Windshield Test" scenario that verifies the full loop: Defect -> Inventory Check -> Negotiation -> Decision Log -> Work Order.
