# Kalles Buss – Arkitektur- och konfigurationsramverk

## Huvudinstruktion till Kodningsagenten: Projekt "Kalles-Buss Autonomi"

### Övergripande Filosofi
Du bygger ryggraden för världens första helt agent-drivna transportföretag. Arkitekturen vilar på två pelare:

*   **Dumb-Flow Automation:** Alla rutinmässiga, regelstyrda flöden (bokföring, tidrapportering, laddningsscheman, "Golden Base-layer" compliance) ska hanteras av deterministisk kod för att spara beräkningsresurser och garantera extrem tillförlitlighet.
*   **The Elevator Principle (Hiss-principen):** Arkitekturen är skiktad för att hantera kognitiv belastning för både agenter och människor. Vi "åker hiss" mellan detaljnivå (Data/Funktion), samordning (Process) och strategi (Agent). Varje våning har ett välavgränsat kontextfönster.
*   **Process-as-a-Domain:** Affärsprocesser (Onboarding, Offboarding, Incidenthantering) är en egen, fristående domän. Den agerar dirigent mellan agenter och funktionella domäner (HR, Depot, Finance).
*   **Agentic Intelligence:** AI-agenter ingriper endast vid avvikelser, komplexa optimeringar och strategiska beslut som kräver avvägningar mellan flera domäner (t.ex. säkerhet vs. ekonomi vs. logistik).

### Din roll som kodare
Du ska implementera domänsystemen (Finance, HR, Depot, Traffic) som robusta, händelsestyrda moduler i ett Monorepo. Varje modul ska exponera ett gränssnittet som en intelligent Agent kan förstå och styra.

### Domänernas samspel (The Windshield Principle)
När en avvikelse uppstår (t.ex. en sprucken ruta), ska systemet facilitera följande asynkrona flöde:
1.  **Depot Agent:** Identifierar skadan (IoT/SafetyCheck), bedömer omedelbart körförbud och hämtar reparations-offerter.
2.  **Traffic Agent:** Analyserar hur körförbudet påverkar omloppen (ex. Linje 676) och beräknar kostnaden för missad trafik eller insättande av reservbuss.
3.  **Finance (CFO) Agent:** Kontrollerar bolagets likviditet och väger "reparera nu" mot "vänta 7 dagar" baserat på totalekonomisk påverkan och kassaflöde.
4.  **Beslut & Förhandling:** Agenterna förhandlar fram en lösning. Vid konflikt styrs beslutet av hårdkodad bolagsprioritet: *Säkerhet > Regelefterlevnad > Intäkt > Kostnad.*

### Arkitektonisk design: The Triple Ring & Anti-Corruption Layers
Systemet är designat enligt principen om tre ringar för att skydda affärslogiken och möjliggöra asynkron agent-förhandling:
1.  **Inner Ring (The Source of Truth):** Domänernas databaser (Double-Entry Ledger i Finance, Medical Vault i HR, Asset Master i Depot). Ändringar här sker endast via strikt validerade domän-tjänster.
2.  **Middle Ring (Agentic Intelligence):** Domänlogiken, "The Repair Negotiator", "Resource Solver", etc. Här sker den kognitiva förhandlingen mellan agenterna.
3.  **Outer Ring (Integration Adapters & ACL):** **Kritiskt mönster.** Inflöden från den fysiska och externa världen (Väderdata, Bankgirot, Skatteverket, Telematik från fordon, Kivra) hanteras av fristående **Integration Adapters**. Dessa agerar som ett Anti-Corruption Layer (ACL). De tar emot externt brus/format, transformerar det, och publicerar rena, interna, typ-säkra händelser (Events) på Event-bussen. Om ett externt API ändras, uppdateras endast adaptern, aldrig core-domänen.

### Arkitektoniska krav

*   **Modularitet & IaC:** Systemet ska kunna skala från en depå i Norrtälje till global expansion genom att infrastrukturen (Terraform) och koden (Docker/Cloud Run) är 100% reproducerbar.
*   **Data Abstraction (Privacy by Design):** En domän exponerar aldrig sin rådata (särskilt HR-data & GDPR). Endast absolut nödvändiga insikter (t.ex. status "Tillgänglig/Ej Tillgänglig") delas mellan domänerna.
*   **Events som språk:** All tvärfunktionell kommunikation sker via den asynkrona Event-bussen (GCP Pub/Sub). Core-domäner pratar aldrig direkt med externa parter, utan lyssnar på interna events från Outer Ring.
*   **Audit & Retrospektiv (The Decision Log):** Varje agent-drivet beslut avger ett `DecisionEvent`. Detta fångas upp av en oberoende stödtjänst som oföränderligt arkiverar kontext, resonemang och utfall. Detta dataset används vid ledningsgruppens periodiska "retron" för att utvärdera agenternas arbete och förbättra regelverket.
*   **Single Source of Truth:** `governance`-biblioteket i markdown är den absoluta och enda källan för affärsregler, bolagsstrategi och Use Cases (Gherkin).

---

## Aktuell Status & Operativ Kontext

### Milstolpar
*   **Milstolpe 7-9:** Monorepo, IaC och NeTEx Baseline (KLAR ✅)
*   **Milstolpe 10:** Operational Data Model & Agent Negotiation (KLAR ✅)
    *   Traffic-DB stöder nu normaliserade `journey_calls` och `boarding_rules`.
    *   VSP-Solver är "Range-Aware" (räckviddsbegränsad planering).
    *   **Agent Negotiation:** Depot-agenten validerar energibudget (kWh/km + OppCharge) asynkront och tvingar Traffic att kapa blocks vid brott mot energireglerna.
*   **Milstolpe 11-12:** The World Engine IDE & Persistence (KLAR ✅)
    *   World Engine har fått en egen PostgreSQL-databas (`kalles-simulation-db`) för persistent lagring av scenarier och resurser.
    *   IDE-gränssnittet är ombyggt med `react-arborist` för professionell resurshantering (inklusive Drag & Drop).
    *   Snygga "kebab"-kontextmenyer (`⋮`) inlagda i trädet för mapp- och asset-hantering.
    *   Dynamiska "Generator Forms" adderade för `FLEET_PROFILE`, `ROSTER_PROFILE` och `FINANCE_PROFILE` som förenklar provisionering utan manuell JSON.
    *   Fullt stöd för Folder CRUD och Inline Rename (Optimistic UI).
    *   Playwright-tester implementerade för att garantera UI-integritet mot GCP.
*   **Milstolpe 13: The Event Horizon & Telemetry (KLAR ✅)**
    *   Byggt `Event Horizon`-loggen: En färgkodad, filtrerbar terminal för att spåra Agent-förhandlingar i realtid via Server-Sent Events (SSE).
    *   `Chaos Timeline`: Visuell injicering av stimuli/fel. Vi har implementerat en "⚡ Inject Chaos"-knapp som testkör the Event Horizon.
    *   Dynamisk Räckvidd (Range-Awareness) i Traffic Solvern.
    *   **Tactical Live Map:** Skapat en live-karta i företagsappen där `Traffic`-domänen exponerar "här och nu"-läget, med fordonens förseningar, hastighet och SOC.
    *   **KODA Tapes & NeTEx Realism:** KODA-telemetri kan nu JIT-genereras (Just-In-Time) via Trafiklab eller fallback-syntes. Fullt API för att hämta äkta NeTEx-arkiv per region (SL, UL, Västtrafik, etc.). `journey_calls` och `tripId` stämmer nu perfekt överens.

### Operativ Checklist för Utveckling
1. **Moln-utrullning:** Använd scriptet `./deploy-all.sh` för att bygga och rulla ut alla tjänster till Cloud Run.
2. **Playwright-tester:** Kör `npx playwright test` i `kalles-customer-success/apps/simulation-control` för att verifiera UI-ändringar mot molnet.
3. **Nollställning av data (Hard Reset):** Utförs via knappen "HARD RESET" i `World Engine IDE` (triggar asynkron rensning i alla domäner).
4. **Databas-schema och Knex:** World Engine backend (`simulation-engine`) använder nu Knex med Unix-socket mot Cloud SQL för all lagring av scenarier.
