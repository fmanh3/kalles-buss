# Kalles Buss – Arkitektur- och konfigurationsramverk

## Översikt

Kalles Buss är en mjukvarudefinierad plattform för upphandlad kollektivtrafik. Systemet är designat som en "Transport-as-Code"-lösning där hela verksamheten – från personalplanering till fordonsoptimering – styrs av agenter och policys. Den första operativa instansen av plattformen hanterar trafiken mellan **Norrtälje Resecentrum** och **Tekniska högskolan** i Stockholm på uppdrag av SL.

## Verksamhetsmodell (Elastic Scaling)

Verksamheten är designad för att vara resursagnostisk och skalas horisontellt utifrån deklarerad kapacitet:

- **Uppdragsgivare:** SL (Storstockholms Lokaltrafik).
- **Linjesträckning:** Norrtälje Resecentrum ↔ Tekniska högskolan.
- **Fordon & Personal:** Dimensioneras dynamiskt via topologifiler. Systemet optimerar driften oavsett om flottan består av 10 eller 1000 eldrivna bussar.
- **Infrastruktur:** Depåer, laddstationer och verkstäder betraktas som externa tjänster med definierade API-gränssnitt och kapacitetsbegränsningar.
- **Data-källa:** All tidtabellsdata hämtas via externa API:er (t.ex. Trafiklab/Samtrafiken) och utgör grunden för systemets planering.

---

## Målbild för Agentdriven Drift

Kalles Buss fungerar som en testbädd där nästan all mjukvara utvecklas och driftas av agenter, styrda av policys definierade i ett centralt **governance-repo**.

### Grundprinciper för Agenter

1.  **Policy-as-Code (PaC):** Policys är inte bara dokument; de är exekverbara constraints. Agenter ska översätta textuella policys till unit-tester och guardrails i koden.
2.  **Traceability (Spårbarhet):** Varje rad kod, varje schemaändring och varje operativt beslut ska kunna härledas till en specifik policy-paragraf i Governance-repot.
3.  **Definition of Done (DoD):** En uppgift är klar först när koden är testad mot policys, dokumenterad för människor och inkluderar nödvändig observability (loggar/metrics).
4.  **Enkelhet framför komplexitet:** Agenter ska prioritera läsbar kod och beprövade mönster (DDD) för att minimera kognitiv last för mänskliga granskare.

---

## Arkitektur: Event-Driven & Decoupled

Systemet kommunicerar via en distribuerad event-buss. Varje domän är en "Bounded Context" som reagerar på och publicerar händelser.

### Exempel på kritiska Events:
* **Planering:** `TrafikSchemaPublicerat`, `FörareTilldeladPass`.
* **Operativt:** `BussAnkommitHållplats`, `LaddningPåbörjad`.
* **Felhantering (Failure Events):** `LaddningMisslyckad`, `FörareEjTillgänglig`, `TidtabellsavvikelseIdentifierad`.

---

## Governance och Domänstruktur

Verksamheten delas upp i tydliga domäner som styrs av versionshanterade policys i root-katalogen `/governance`:

| Domän | Ansvar | Exempel på Policy-constraint |
| :--- | :--- | :--- |
| **Trafik & Omlopp** | Optimering av fordonsrörelser. | "Minimera tomkörning mellan depå och linjestart." |
| **Personal (HR)** | Schemaläggning och arbetsrätt. | "Minst 11 timmars dygnsvila mellan arbetspass." |
| **Energi & Depå** | Laddstrategier och underhåll. | "Bussar ska ha minst 20% SOC (State of Charge) vid linjestart." |
| **Ekonomi** | Fakturering, viten och löner. | "Automatisera avvikelseapportering för att undvika viten från SL." |
| **Compliance** | Lagar, GDPR och avtal. | "All personuppgiftsbehandling ska loggas och rensas enligt GDPR-policy." |

---

## Tekniska Riktlinjer

- **Licens:** All källkod publiceras under **GPL-3.0**.
- **Infrastruktur:** Definieras som kod (Terraform/Pulumi).
- **Observability:** Inbyggd spårbarhet (Distributed Tracing) är ett krav för att agenter ska kunna analysera och självläka systemet.
- **Simulering:** Systemet ska kunna köras i "Shadow Mode" där agenter testar policyförändringar mot historisk data innan de deployas.

## Syfte med detta dokument

Detta dokument utgör den primära kontexten för alla agenter som verkar inom Kalles Buss. Det definierar spelreglerna för hur mjukvaran ska byggas, valideras och skalas för att skapa ett helt mjukvarudefinierat bussimperium.

---

## Aktuell Status & Operativ Kontext (April 2026)

### Milstolpe 7: Monorepo & Teknisk Standardisering (KLAR ✅)
För att lösa grundläggande problem med testbarhet och inkonsistens har en omfattande teknisk omstrukturering genomförts.
- **Monorepo:** Tjänsterna `kalles-hr`, `kalles-traffic` och `kalles-energy-depot` har migrerats till ett enhetligt monorepo som hanteras med `npm workspaces`.
- **Testramverk:** `Jest` har bytts ut mot `Vitest` i samtliga tjänster för en snabbare och mer stabil testupplevelse.
- **Teknikstack:** Beroenden har standardiserats och uppdaterats till stabila versioner. TypeScript-konfigurationen har gjorts robust för en monorepo-miljö.
- **Policy:** Styrande policydokument har uppdaterats för att reflektera den nya tekniska standarden (TypeScript/Node.js).

### Milstolpe 6: Den Kompletta Förarupplevelsen (PÅGÅR 🏗️)
Vi transformerar portalen från en attrapp till ett operativt verktyg. Inkluderar förarprofiler, licensbevakning, digitala tvillingar för fordon och interaktiva säkerhetskontroller.

### Infrastruktur & Deployment
- **GCP Projekt:** `joakim-hansson-lab`.
- **Provisionering:** Terraform hanterar samtliga tjänster och databaser.
- **URL:** [https://kalles-portal-625737625145.europe-west1.run.app](https://kalles-portal-625737625145.europe-west1.run.app)

### Domänstatus
- **Traffic:** Digital Tvilling Level 2 live. Stöd för fordonsregister och inspektioner.
- **Finance:** Fullt integrerad.
- **HR:** Utökad profil- och certifieringsdata live.
- **Customer Success:** Portal v2.0 rullas ut med full funktionalitet för förare.

### Operativ Checklist för Utveckling
1. **Lokal körning:** Använd `docker-compose up` i `kalles-governance/` för att starta hela miljön lokalt.
2. **Databasåtkomst:** För att ansluta till molndatabaser manuellt, starta Cloud SQL Auth Proxy:
   `./cloud-sql-proxy joakim-hansson-lab:europe-west1:kalles-finance-97d0dd7d --port 5432`
3. **Testanvändare:** Logga in i portalen som **Förare** för att se live-data för `DRIVER-007`.
