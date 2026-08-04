# Specification: The World Engine (Event-Replay & Chaos Simulator)

## 1. Vision: "The Reality Sandbox"
To ensure the AI Agents (Traffic, Depot, HR, Finance) make correct decisions under pressure, they must be tested against "The Nasty Reality". The World Engine is a stochastic simulation framework running alongside the core domains. It acts as the physical world, injecting delays, sick leaves, and vehicle failures into the Anti-Corruption Layer (ACL).

## 2. Core Modules to Implement

### 2.1 The KoDa Backtester (Data Ingestion)
*   **Purpose:** We cannot rely on polling live external APIs for reproducible testing. Instead, the Simulator acts as a "Time Machine" using Trafiklab's **KoDa (Kollektivtrafikens Datalabb) API**.
*   **Mechanics:** Given a specific historical date (e.g., `2023-01-15`), the Simulator downloads the 7-zip archive containing that day's GTFS-RT Protocol Buffers. It extracts the archives, filters for specific lines (e.g., Line 676), and processes every second of that day.
*   **Artifact:** Saves the extracted and flattened stream as a "Golden Tape" (a JSON file) in `src/tapes/tape_676_2023-01-15.json`. This allows QA to perfectly recreate severe weather days or major traffic incidents.

### 2.2 The Tape Replayer (Event Playback)
*   **Purpose:** Replays a Golden Tape into the system's Event Bus (`telematics-events`).
*   **Constraint (1:1 Real-time):** The replayer MUST respect the time deltas between events in the tape. If bus A sent a GPS ping at 08:00 and the next at 08:01, the replayer waits 1 minute. Fast-forwarding breaks the asynchronous nature of the Agent negotiation.
*   **Data Enrichment:** External APIs only provide GPS/delays. The Replayer must synthesize proprietary metrics like `currentSOC` (State of Charge) and `occupancy` before emitting the event.

### 2.3 The NPC State Machine (The Human Factor)
*   **Purpose:** Simulates the health and behavior of the staff.
*   **Mechanics:** Maintains a list of "NPCs" (Drivers, Mechanics) with attributes like `PhysicalHealth` and `StressLevel`.
*   **The Sickness Dice:** Periodically rolls a weighted dice based on health. On failure, it triggers a `SickLeaveEvent` via the HR API, forcing the Traffic Agent to re-schedule.

### 2.4 Technical Failure Engine (The Chaos Monkey)
*   **Purpose:** Simulates physical breakdowns of the fleet.
*   **Mechanics:** Rolls a dice to inject `CriticalFaultDetected` events (e.g., "Cracked Windshield") on active vehicles via the Telematics Pub/Sub topic, forcing the Depot Agent into a "Repair Negotiation".

### 2.5 The Scenario Engine (State Manager)
*   **Purpose:** To run scientific, deterministic benchmarks, the Simulator must control the entire initial state of the company.
*   **The Sandbox Seeder:** Before a Scenario starts, the Simulator calls a `/api/sandbox/seed` endpoint on all Core Domains (Finance, HR, Traffic, Depot) to purge their databases and inject the `Initial State` (Roster, Cash, Fleet).
*   **Virtual Time Controller:** The Simulator must be able to broadcast "Virtual End-Of-Day" events to trigger Batch jobs (like Payroll or NeTEx updates) if running accelerated timelines.

## 3. The 4 Benchmark Scenarios (Acceptance Criteria)
The true test of the "Transport-as-Code" architecture is to pass these four scenarios autonomously.

### Scenario 1: The Genesis (Day Zero)
*   **Initial State:** The company has cash (Finance), a fleet of buses with known odometer readings (Depot), and a roster of employees with valid, GDPR-compliant pseudo-IDs (e.g., `19800101-ABCD`) and certifications (HR).
*   **Action:** The Simulator triggers a NeTEx Timetable sync for a specific date.
*   **Expected Outcome:** The Traffic Agent automatically creates the `tours`, and the Resource Solver successfully assigns all buses and drivers without violating HR compliances or charging constraints.

### Scenario 2: The Sunny Day (Normal Operations)
*   **Action:** The KoDa Backtester replays a full period (e.g., a week) of historical GPS data with normal delays. The SMHI weather feed is benign. Chaos Monkey is disabled.
*   **Expected Outcome:** "Dumb-Flow Automation" handles everything. Drivers log in/out, buses run their tours, EcoDriving bonuses are calculated, and the Finance domain automatically processes billing and payload. The system remains stable.

### Scenario 3: The Nasty Reality (Incidents)
*   **Action:** The KoDa Backtester runs a "Sunny Day", but the Chaos Monkey injects `SickLeaveEvents` at 04:30 AM and `CriticalFaultDetected` (broken windshields) during rush hour. Weather is set to 'EXTREME_COLD'.
*   **Expected Outcome:** "Agentic Intelligence" takes over. The Resource Solver re-assigns drivers dynamically. The Repair Negotiator (Depot) queries Finance and Traffic to negotiate between internal (slow/cheap) vs external (fast/expensive) repair.

### Scenario 4: The Expansion (Scaling)
*   **Action:** During a running simulation, the Simulator injects "In-flight Master Data Mutations" (e.g., a new Depot is opened, 5 new buses are bought, 10 new drivers are onboarded).
*   **Expected Outcome:** The architecture proves its elasticity. The Resource Solver immediately begins utilizing the new assets and the new depot for the next day's NeTEx schedule without requiring a system restart.

## 4. The QA Mission Control GUI (The Dashboard)
The Simulator must provide a visual interface for QA Engineers to monitor and manipulate the world state. This is implemented as a dedicated administrative view in the Portal.

### 3.1 System Health Radar
*   **Live Status:** Real-time health indicators (UP/DOWN/ERROR) for all domains (Finance, HR, Traffic, Depot, etc.).
*   **Trace Stream:** A live feed of the latest `DecisionEvents` and `AuditLogs` flowing through the Event Bus.

### 3.2 The Sandbox Dashboard
*   **Telemetry Monitor:** Visualization of the data flow from Trafiklab. List of available "Golden Tapes" with their duration and start/end times.
*   **NeTEx Tracker:** Metadata about the current timetable (Last sync date, active line IDs).
*   **Environmental State:** Current weather conditions (Temp, Wind, Risk) currently active in the simulation.
*   **NPC Roster:** A list of all simulated employees (Drivers, Mechanics) with their live stats (Health, Stress) and current activity (Driving/Idle).

### 3.3 The Financial Mirror (External Counterparts)
Since the Simulator acts as the "Outer World", it must visualize the endpoints that the Company interacts with:
*   **Virtual Bank & Tax Agency:** View generated payments (salaries), VAT reports, and incoming Bankgiro settlements.
*   **Supplier Agent Queue:** View pending invoices from simulated service partners (e.g., Ryds Bilglas) based on the "Repair Negotiator" decisions.

## 4. Execution Workflow (For the coding agent)
1.  Initialize `packages/simulation-engine` as a Node/Express service.
2.  Implement endpoints to control the simulation (`/world/record`, `/world/replay`, `/world/chaos/start`).
3.  Add "Counterpart Mocks" (Bank, Tax, Suppliers) within the Simulation domain to track incoming company actions.
4.  Expose the internal world state to the BFF for visualization.
5.  Add the QA Mission Control view to the React Portal (`packages/kalles-customer-success/apps/portal`).
6.  Ensure the Simulator uses `shared-utils` for Zod contracts.
7.  Add the Simulator to `cloudbuild.yaml` and `infrastructure/gcp/cloudrun.tf` for deployment.
