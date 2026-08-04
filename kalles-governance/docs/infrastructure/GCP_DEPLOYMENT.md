# Steg 2: IaC och GCP-Testning (Kalles Buss)

Detta dokument beskriver hur vi tar systemet från att köra lokalt ("Dancing Skeleton") till att provisionera och kommunicera med riktig infrastruktur i Google Cloud (GCP) via Terraform.

## Syfte
Att verifiera att vår Event-Driven Arkitektur fungerar över internet genom Cloud Pub/Sub och att våra mikrotjänster kan provisionera och ansluta till dedikerade Cloud SQL-databaser.

---

## Instruktioner för att rulla ut

### 1. Autentisera mot GCP
Eftersom du kör från din lokala maskin använder vi dina personliga credentials för att låta både Terraform och koden prata med Google Cloud.

```bash
# Logga in i gcloud CLI
gcloud auth login

# Låt dina applikationer (Node.js) använda dina credentials
gcloud auth application-default login
```

### 2. Rulla ut Infrastrukturen (Terraform)
Byt ut `<DITT-GCP-PROJEKT-ID>` mot ditt faktiska projekt-ID i Google Cloud.

```bash
cd kalles-governance/infrastructure/gcp

# Initiera terraform (redan gjort, men bra för säkerhets skull)
terraform init

# Planera utrullningen
terraform plan -var="project_id=<DITT-GCP-PROJEKT-ID>"

# Applicera utrullningen (Detta skapar Pub/Sub topics och Cloud SQL instanser)
# OBS: Detta kan ta 10-15 minuter då databaserna ska skapas.
terraform apply -var="project_id=<DITT-GCP-PROJEKT-ID>"
```

### 3. Generera Miljövariabler för Mikrotjänsterna
För att domänerna (Finance, Traffic, HR) ska veta var deras nyskapade databaser finns och vilket lösenord de ska använda, har jag skapat ett hjälpscript. 

*Detta script rör **inte** din rot `.env`-fil, utan uppdaterar endast de lokala filerna i respektive sub-katalog.*

Gå tillbaka till rot-katalogen för kalles-buss och kör:
```bash
node kalles-governance/scripts/generate-env.js
```

### 4. Anslut till Databasen lokalt (Cloud SQL Auth Proxy)
Om du vill att `kalles-finance` ska köra lokalt men prata med databasen i molnet, behöver du starta Google Cloud SQL Auth Proxy i en separat terminal.

Scriptet ovan kommer att skriva ut det exakta kommandot du behöver köra, men det ser ut ungefär så här:
```bash
# Ladda ner proxyn (om du inte redan har den)
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.1.0/cloud-sql-proxy.darwin.arm64
chmod +x cloud-sql-proxy

# Starta proxyn för Finance DB
./cloud-sql-proxy <PROJECT>:<REGION>:<INSTANCE-NAME> --port 5432
```

### 5. Starta systemet
Nu kan du starta upp komponenterna precis som tidigare. Trafiken och APC-eventen kommer nu routas över molnet!

**Terminal 1 (Finance):**
```bash
cd kalles-finance
# Migrera den riktiga molndatabasen!
npx knex migrate:latest
# Starta lyssnaren
npx ts-node src/index.ts
```

**Terminal 2 (Trafik-simulatorn):**
```bash
cd kalles-traffic
npx ts-node src/index.ts
```

---

## Sammanfattning av Status (Innan kaffepausen)
*   **Arkitektur:** ADR-004 implementerad för dynamisk prissättning.
*   **Domäner:** Finance räknar ut avtalspriser inklusive passagerarbonusar från simulerade Trafiklab-APC-event. HR blockerar förare utan dygnsvila.
*   **IaC:** Terraform moduler för Pub/Sub och PostgreSQL färdigställda. Scripts redo för att byggebryggan till molnet.

När du är tillbaka och har kört detta, kan vi titta på att automatisera detta via GitHub Actions eller börja orkestrera själva container-körningen!