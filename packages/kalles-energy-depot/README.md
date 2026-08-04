# Kalles Buss - Energy & Depot Domain

Denna mikrotjänst ansvarar för den fysiska driften i depån, med fokus på autonom energistyrning och underhållshantering.

## Översikt
Energy & Depot-domänen agerar brygga mellan det finansiella systemet (CFO) och den fysiska fordonsflottan.

### Huvudfunktioner:
*   **Energy Management:** Tar emot optimeringsorder från CFO-agenten för att ladda bussar vid låga spotpriser (Nordpool-hedging).
*   **Maintenance & Work Orders:** Hanterar felrapporter från säkerhetskontroller och skapar automatiskt arbetsorder till interna och externa verkstäder.
*   **Fleet Readiness:** Håller koll på vilka bussar som är laddade, hela och redo för trafik.

## Arkitektur
Tjänsten är byggd med **Node.js (TypeScript)** och kommunicerar via händelsebussen (GCP Pub/Sub). Den använder **PostgreSQL** (via Knex) för att hålla reda på depåns status.

## Komma igång

### Förutsättningar
*   Node.js v22+
*   PostgreSQL
*   Application Default Credentials (ADC) för GCP Pub/Sub

### Installation
```bash
npm install
```

### Köra lokalt
```bash
# Kör migrationer
npx knex migrate:latest

# Starta tjänsten
npm start
```

## API Endpoints (Exempel)
*   `POST /maintenance/report-defect`: Rapportera ett nytt fel på en buss.
*   `GET /sessions`: Se historik över genomförda laddningar.

## Licens
Publicerad under **GNU GPL-v3**.
