# HR & Payroll Compliance Coverage (Kalles Buss)

Denna rapport dokumenterar hur systemet uppfyller de legala och professionella krav som identifierats för svensk transportverksamhet och EU:s lönetransparensdirektiv.

## 1. Säkerhet & GDPR (Artikel 6 & 9)
- [x] **Separation av data:** Administrativa data (lön, namn) och känsliga hälsodata (rehab, intyg) lagras i separata aggregat.
- [x] **Kryptering:** Stöd för person-unika krypteringsnycklar (PersonalDEK/HealthDEK) för att möjliggöra "Rätten att bli glömd" via crypto-shredding.
- [x] **Audit Trail:** Varje åtkomst till personuppgifter loggas i `audit_events`.

## 2. EU:s Lönetransparensdirektiv
- [x] **Job Architecture:** Implementerat SSYK-inspirerade `job_levels` (1-7) och `job_definitions` för gruppering av likvärdigt arbete.
- [x] **Lönegapsanalys:** Automatiserad API-slutpunkt för realtidsanalys av löneskillnader mellan kön inom samma yrkeskategori.
- [x] **Lönespann:** Stöd för att definiera och kommunicera min/max-spann per befattning.
- [x] **Beslutsmotivering:** Tabellen `pay_change_logs` loggar objektiva skäl för lönejusteringar (t.ex. kompetenshöjning).

## 3. Svensk Löneadministration & Lagkrav
- [x] **Anhöriglista (ICE):** Dedikerad hantering för krisberedskap (Duty of Care).
- [x] **Saldohantering:** Ledger-baserad spårning av semester (sparade/årets/förskott), komp och flex i `balance_ledger`.
- [x] **Skatte-motor:** Stöd för Skatteverkets tabellskatt, statlig skatt och adress-baserad skatteresolution.
- [x] **Pensionsavsättningar:** Stöd för tjänstepensionsregler (t.ex. ITP1) direkt i kollektivavtalskonfigurationen.
- [x] **Sociala Avgifter:** Automatisk beräkning av arbetsgivaravgifter baserat på bruttolön.

## 4. Operativ Personalvård
- [x] **Utläggshantering:** Modul för digital kvittohantering och ad-hoc utlägg (t.ex. "pizza-testet").
- [x] **Traktamenten & Resor:** Logik för beräkning av inrikes/utrikes traktamenten och milersättning.
- [x] **Rehab-spårning:** Lagstadgad dokumentation av rehabiliteringssteg och koppling till Försäkringskassan.

## 5. Processorkestrering & "Hiss-principen"
- [x] **Kontextisolering:** Separering av dataägarskap (HR) och processtyrning (Process Engine) för att minimera kognitiv belastning för agenter.
- [x] **Deterministiska flöden:** Automatiserad hantering av "Happy Path" för onboarding för att garantera att inga legala steg (t.ex. ID-kontroll) missas.
- [x] **Idempotens:** Garanterad systemintegritet vid asynkrona agent-förhandlingar.

---
*Senast uppdaterad: 2026-06-12 av Gemini CLI (Architect Hat)*
