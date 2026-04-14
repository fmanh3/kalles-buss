# Kalles Buss - Mjukvarudefinierad Plattform för Kollektivtrafik

## Översikt

Kalles Buss är en mjukvarudefinierad plattform designad för upphandlad kollektivtrafik, baserad på konceptet "Transport-as-Code". Hela verksamheten, från personalplanering till fordonsoptimering, styrs av intelligenta agenter och policys. Systemets första operativa instans hanterar trafiken mellan **Norrtälje Resecentrum** och **Tekniska högskolan** i Stockholm, på uppdrag av **SL**.

## Målbild för Agentdriven Drift

Systemet fungerar som en testbädd där nästan all mjukvara utvecklas och driftas av agenter, styrda av policys definierade i ett centralt **governance-repo**.

### Grundprinciper för Agenter

-   **Policy-as-Code (PaC):** Policys är exekverbara constraints. Agenter översätter textuella policys till unit-tester och guardrails i koden.
-   **Traceability (Spårbarhet):** All kod, schemaändringar och operativa beslut kan härledas till specifika policy-paragrafer i Governance-repot.
-   **Definition of Done (DoD):** En uppgift är klar först när koden är testad mot policys, dokumenterad och inkluderar nödvändig observability.
-   **Enkelhet framför komplexitet:** Agenter prioriterar läsbar kod och beprövade mönster för att minimera kognitiv last för mänskliga granskare.

## Arkitektur: Event-Driven & Decoupled

Kalles Buss kommunicerar via en distribuerad event-buss. Varje domän fungerar som en "Bounded Context" som reagerar på och publicerar händelser.

### Exempel på kritiska Events:
-   **Planering:** `TrafikSchemaPublicerat`, `FörareTilldeladPass`.
-   **Operativt:** `BussAnkommitHållplats`, `LaddningPåbörjad`.
-   **Felhantering:** `LaddningMisslyckad`, `FörareEjTillgänglig`, `TidtabellsavvikelseIdentifierad`.

## Governance och Domänstruktur

Verksamheten delas in i tydliga domäner, styrda av versionshanterade policys:

| Domän | Ansvar | Exempel på Policy-constraint |
| :--- | :--- | :--- |
| **Trafik & Omlopp** | Optimering av fordonsrörelser. | "Minimera tomkörning mellan depå och linjestart." |
| **Personal (HR)** | Schemaläggning och arbetsrätt. | "Minst 11 timmars dygnsvila mellan arbetspass." |
| **Energi & Depå** | Laddstrategier och underhåll. | "Bussar ska ha minst 20% SOC (State of Charge) vid linjestart." |
| **Ekonomi** | Fakturering, viten och löner. | "Automatisera avvikelseapportering för att undvika viten från SL." |
| **Compliance** | Lagar, GDPR och avtal. | "All personuppgiftsbehandling ska loggas och rensas enligt GDPR-policy." |

## Tekniska Riktlinjer

-   **Licens:** All källkod publiceras under **GPL-3.0**.
-   **Infrastruktur:** Definieras som kod (Terraform/Pulumi).
-   **Observability:** Inbyggd spårbarhet (Distributed Tracing) är ett krav.
-   **Simulering:** Stöd för "Shadow Mode" för policytestning mot historisk data.

## Aktuell Status & Operativ Kontext (April 2026)

### Milstolpe 7: Monorepo & Teknisk Standardisering (KLAR ✅)
Projektet har genomgått en omfattande teknisk omstrukturering till ett monorepo med `npm workspaces`. `Vitest` har ersatt `Jest` som testramverk.

### Milstolpe 6: Den Kompletta Förarupplevelsen (PÅGÅR 🏗️)
Portalen transformerar från attrapp till operativt verktyg med förarprofiler, licensbevakning, digitala tvillingar för fordon och interaktiva säkerhetskontroller.

### Infrastruktur & Deployment
-   **GCP Projekt:** `joakim-hansson-lab`.
-   **Provisionering:** Terraform hanterar samtliga tjänster och databaser.
-   **URL:** [https://kalles-portal-625737625145.europe-west1.run.app](https://kalles-portal-625737625145.europe-west1.run.app)

### Operativ Checklist för Utveckling
1.  **Lokal körning:** Använd `docker-compose up` i `kalles-governance/` för att starta hela miljön lokalt.
2.  **Databasåtkomst:** För att ansluta till molndatabaser manuellt, starta Cloud SQL Auth Proxy:
    `./cloud-sql-proxy joakim-hansson-lab:europe-west1:kalles-finance-97d0dd7d --port 5432`
3.  **Testanvändare:** Logga in i portalen som **Förare** för att se live-data för `DRIVER-007`.
