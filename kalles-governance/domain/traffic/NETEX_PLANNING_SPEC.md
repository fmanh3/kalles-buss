# Specification: NeTEx Timetable Engine (Traffic Planning Agent)

## 1. Vision: "The Master Schedule"
To ensure Kalles Buss scales nationally, the Traffic domain must dynamically ingest and adapt to changes in public transport schedules. To support complex operations like electric bus charging cycles and cross-depot vehicle assignments, we discard legacy GTFS in favor of the European standard **NeTEx** (Network Timetable Exchange).

## 2. Core Modules to Implement

### 2.1 Trafiklab NeTEx Adapter (Outer Ring / ACL)
*   **Source:** Poll the Trafiklab NeTEx API for the Stockholm region (specifically filtering for Line 676).
*   **XML Parsing:** NeTEx uses deeply nested XML. The Adapter MUST use stream-based parsing (e.g., SAX) to avoid memory crashes on Cloud Run.
*   **Anti-Corruption:** The Adapter translates NeTEx concepts (`ServiceJourney`, `Block`, `ScheduledStopPoint`) into a flattened, internal JSON contract defined in `shared-utils/src/contracts/`.
*   **Event Output:** Emits a `TimetableUpdated` event to the Event Bus.

### 2.2 The Scheduler (Middle Ring / Traffic Domain)
*   **Ingestion:** Listens to `TimetableUpdated`. It drops or archives old `DRAFT` tours for the upcoming period and creates fresh entries in the `tours` database table.
*   **Block Handling:** It groups individual trips that are chained together (a NeTEx `Block`) so that the Resource Solver knows a single vehicle must service all of them sequentially without returning to the depot.

### 2.3 The Resource Solver Upgrade
*   Once the Scheduler finalizes the DRAFT generation, the Orchestrator automatically assigns drivers and vehicles.
*   It evaluates the total expected energy consumption for a complete `Block`. If the expected kWh exceeds the bus's capacity, the Solver flags a scheduling error or schedules an interim charge at the Depot.

## 3. Gherkin Scenarios (Use Cases)
*   **Scenario: Successful NeTEx Ingestion.** Given a valid NeTEx XML file for Line 676, when the Adapter processes the stream, then it should emit a `TimetableUpdated` event containing the correct number of `ServiceJourneys`.
*   **Scenario: Block-based Scheduling.** Given a NeTEx `Block` containing 4 sequential trips, when the Scheduler processes the block, then it should create 4 linked `tours` in the database, and the Resource Solver should attempt to assign the same vehicle to all 4.
*   **Scenario: Ingestion Failure / Corrupt XML.** Given a malformed NeTEx file, when the Adapter attempts to parse it, then it should log a critical error and NOT emit any events, keeping the existing `DRAFT` schedules intact.

## 4. Execution Workflow (For the coding agent)
1.  **Gherkin first:** Write the `.feature` files for NeTEx ingestion and block-based scheduling in `kalles-governance/domain/traffic/use-cases/`.
2.  Define the internal Zod schema for `TimetableUpdated` in `shared-utils`.
3.  Build the XML streaming parser in `packages/adapters/src/netex-adapter.ts`.
4.  Implement `ScheduleService.ts` in `packages/kalles-traffic/` to consume the events and populate the database.
5.  Add Vitest suites mocking a subset of NeTEx XML to prove the Anti-Corruption Layer translates data correctly.
6.  **Scenario Testing:** Create an end-to-end integration test that simulates a complete NeTEx update cycle followed by automated resource assignment.
