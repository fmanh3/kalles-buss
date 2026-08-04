# Specification: Operational NeTEx/Transmodel Database Projection

## 1. Goal
To avoid "reinventing the wheel" and to serve both the macro-level constraints of the VSP-Solver and the micro-level requirements of the Driver Portal, the `kalles-traffic` database will closely mirror the CEN Transmodel (EN 12896) / NeTEx XML structure.

## 2. Core Entities (The "Static" Network)

### 2.1 Line & Route (Linjedefinitioner)
*   **Line:** The commercial line (e.g., "676"). Contains `publicCode`, `name`.
*   **Route / JourneyPattern:** The spatial sequence of stops. A Line can have multiple patterns (e.g., Express vs. Local, Outbound vs. Inbound).

### 2.2 Infrastructure (Infrastruktur)
*   **ScheduledStopPoint:** The logical stop (e.g., "Danderyds Sjukhus").
*   **Quay:** The physical platform at the stop (e.g., "Läge E").
*   **GaragePoint:** Covered by the `Depot` domain (e.g., "Norrtälje Laddplats 1").

## 3. The Schedule (The "Dynamic" Network)

### 3.1 ServiceJourney (Turen)
Represents a planned trip on a `JourneyPattern` at a specific departure time.
*   **Fields:** `id` (e.g., JRN-676-1), `line_id`, `direction`, `day_type_ref` (Crucial for reducing data duplication).

### 3.2 Call (Passerandet)
The relationship between a `ServiceJourney` and a `ScheduledStopPoint`. This is the **Driver's Itinerary**.
*   **Fields:** `service_journey_id`, `stop_sequence`, `arrival_time`, `departure_time`.
*   **Transmodel Metadata:** 
    *   `for_boarding` (boolean)
    *   `for_alighting` (boolean)
    *   `request_stop` (boolean)
    *   `is_timing_point` (boolean - Driver must not depart early).

### 3.3 DayType & Calendar (Kalenderhantering)
*   **DayType:** A concept like "Weekday during School Term".
*   **OperatingDay:** Maps a specific calendar date (e.g., "2026-05-12") to a `DayType`.
*   *Benefit:* A `ServiceJourney` is linked to a `DayType`, not a hardcoded Date. The `Traffic` engine joins these tables to generate the actual daily `Tours` (Operational Execution).

## 4. Vehicle Scheduling (The VSP Layer)
The VSP-Solver operates strictly *above* the ServiceJourney.
*   **Block:** A vehicle's daily work assignment.
*   **DeadRun:** A non-revenue journey linking a `GaragePoint` to a `ServiceJourney` (or linking two incompatible ServiceJourneys).
*   *Execution:* A Block is a sequence of `DeadRuns` and `ServiceJourneys`.

## 5. Implementation Strategy for "Parse & Seed"
1.  **Adapter (NeTEx):** Parses the XML. Emits rich objects matching this schema (Lines, StopPoints, Journeys, Calls, Calendars).
2.  **Traffic (Ingestion):** Stores the raw Transmodel data cleanly.
3.  **Traffic (VSP):** Calculates `Blocks` based *only* on the first and last `Call` of each `ServiceJourney` for the current `OperatingDay`.
4.  **BFF (Driver App):** Fetches the active `Block`, and enriches it with the detailed `Calls` (Platforms, Boarding rules) for the UI.
