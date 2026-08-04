# Specification: Visual Verification & Map Tracking

## 1. Vision: "The Live Map"
To verify that the World Engine's Replayer is functioning correctly (1:1 real-time playback, correct GPS coordinates), we must provide visual, immediate feedback in the Driver Portal. The driver should see their assigned vehicle moving on a map, driven entirely by the simulated telemetry stream.

## 2. Core Modules to Implement

### 2.1 BFF Telemetry Stream (SSE)
*   **Purpose:** The Backend-For-Frontend (BFF) must push live telemetry data to connected clients.
*   **Implementation:** Create an endpoint `/api/driver/telemetry/stream` using Server-Sent Events (SSE). The BFF subscribes to the `telematics-events` Pub/Sub topic and broadcasts `VehicleTelemetryUpdate` events to any client listening for that specific `vehicleId`.

### 2.2 Driver Portal Map View
*   **Library:** Integrate `react-leaflet` (or similar lightweight map library) into the Driver Portal.
*   **Workflow:**
    1. Driver logs in and views their Schedule (Generated from NeTEx).
    2. Driver accepts a `DRAFT` tour and clicks "Start Tour" for `BUSS-101`.
    3. The portal connects to the BFF SSE stream for `BUSS-101`.
    4. A Map component renders. Whenever a telemetry event is received (via the World Engine replaying a KoDa tape), the bus marker physically moves to the new `latitude`/`longitude`.

### 3. QA Benefit
This eliminates abstract log-reading. If the KoDa historical tape contains a severe delay or detour, the QA Engineer will visually see the bus stall on the map, and can concurrently verify if the Traffic Orchestrator generated the correct `DelayAlert` event.
