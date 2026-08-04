# Specification: World Engine IDE (The God Mode Upgrade)

## 1. Vision
To transform the World Engine from a simple API-triggering dashboard into a professional Simulation IDE. The UI shall empower QA engineers to manage complex transport scenarios by treating datasets (NeTEx, Synthetic, Telemetry Tapes) as interchangeable resources.

## 2. Milestone 11: The IDE Shell & Library
**Goal:** Establish the professional "Mission Control" layout and the resource library.
- **IDE Layout:** Shift from 3-column grid to a "Workbench" layout (Left: Library, Middle: Config, Right: Live View, Bottom: Logs).
- **Resource Tree:** Implement a hierarchical tree view for:
    - 📁 **Scenarios** (Persisted JSON definitions)
    - 📁 **Data Assets** (Trafiklab ZIPs, Synthetic Profiles, CSV Exports)
    - 📁 **Environment** (Weather profiles, Infrastructure configs)
- **Top Bar:** Global controls (Hard Reset, Simulation Time, Master Run).

## 3. Milestone 12: The Scenario & Resource Editor
**Goal:** Make scenarios dynamic and configurable.
- **Resource Binder:** In the Scenario Editor, allow users to "bind" a specific Data Asset (e.g., `netex_2026_05.zip`) to a scenario.
- **Asset Manager:** A dedicated view to upload/download/generate new Data Assets (e.g., the Synthetic Generator config).
- **Initial State Config:** Set fleet size, starting cash, and driver roster via the UI.

## 4. Milestone 13: The Event Horizon & Telemetry
**Goal:** Advanced observability and playback.
- **Finitary Log:** Color-coded event stream (Blue=Traffic, Green=Depot, Gold=Finance) with level-based filtering.
- **Chaos Timeline:** Visual timeline to inject "Stimuli" (Faults, Weather changes) during a live run.
- **Persistence:** Save "Simulation Tapes" for regression testing.

## 5. Visual Guidelines
- **Contrast:** IDE must remain Dark Mode (Deep Black/Slate) to contrast the light-themed Portal.
- **Aesthetic:** "High-Tech / Low-Latency" feel. Use mono-spaced fonts for data and terminal-like elements.
