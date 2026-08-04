# Specification: Frontend Decoupling & Micro-Frontend Architecture

## 1. Vision: "The Separation of Powers"
Kalles Buss ecosystem consists of two fundamentally different user experiences that must never share the same production bundle.

1.  **The World Engine Control (God Mode):** An administrative laboratory for QA and Architects to manipulate reality.
2.  **Kalles Buss OS (The Product):** The actual operational software used by employees (Drivers, Mechanics, Executives).

## 2. Directory Structure
All frontend applications reside under `kalles-customer-success/apps/`.

*   `apps/simulation-control/`: A standalone React/Vite app for the World Engine. This is the **Host Application** during demo/dev.
*   `apps/portal/`: A standalone React/Vite app for the company's business logic. This is the **Guest Application**.
*   `packages/ui-components/`: (Future) Shared design system and stateless UI elements used by both apps.

## 3. Demo Orchestration (The Frame Pattern)
To provide a seamless demo experience without polluting the Portal's code:
1.  The `simulation-control` app provides a side-bar or overlay with world controls (Chaos, Time travel, Scenarios).
2.  The main viewport of `simulation-control` embeds the `portal` application (via iFrame or Module Federation).
3.  As the user triggers events in the control panel, they see the immediate effects in the embedded Portal.

## 4. Production Constraints
*   The `simulation-control` app is **NEVER** deployed to production environments.
*   The `portal` app must be fully functional on its own, with its own PWA manifest and service workers.
*   Feature flags or distinct roles (CEO, DRIVER) in the `portal` are controlled via the BFF, never via "leaked" QA parameters.

## 5. Implementation Workflow (The Refactor)
1.  Create `apps/simulation-control` by scaffolding a fresh Vite app.
2.  Move `QaDashboard.tsx` and related CSS from the portal to the new app.
3.  Remove the "Toggle QA" button and logic from `apps/portal/App.tsx`.
4.  Update the root `package.json` and build scripts to manage two separate frontend deployments.
