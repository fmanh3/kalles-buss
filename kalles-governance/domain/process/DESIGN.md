# Process-domänen: Arkitektur & Design

## Syfte
Process-domänen (`kalles-process-engine`) agerar som företagets nervsystem. Den orkestrerar flöden som skär tvärs över funktionella domäner (HR, Depot, Finance) och fungerar som gränssnittet mellan strategiska agenter och deterministisk affärslogik.

## Kärnprinciper

### 1. Hiss-principen (Context Isolation)
Systemet är skiktat för att minimera kognitiv belastning (olater) hos både människor och AI:
*   **Våning 0 (Data/Funktion):** Idempotenta mikrotjänster som utför specifika handlingar (t.ex. `createAccount`, `assignVehicle`).
*   **Våning 1 (Process):** Processmotorn som håller reda på sekvenser och tillstånd (t.ex. "Onboarding steg 2 av 5").
*   **Våning 2 (Strategi):** Agenter som fattar beslut och hanterar avvikelser som processen inte kan lösa själv.

### 2. Separation av State
*   **Domain State:** Information om objektet (Vem är Bengt? Var bor han?). Ägs av funktionsdomänen (t.ex. HR).
*   **Process State:** Information om skeendet (Var i flödet är vi? Vilka actions är kvar?). Ägs av Process-domänen.

### 3. Idempotens (Mandat)
Alla funktioner i domänerna som kan triggas av Processmotorn **måste vara idempotenta**. 
*   Om processmotorn skickar samma kommando två gånger (vid t.ex. nätverksfel eller omstart) ska mål-domänen kunna identifiera att handlingen redan är utförd och svara med nuvarande status istället för att skapa dubbletter eller fel.

### 4. Dubbelriktad Trigger-logik
*   **Engine -> Domain/Agent:** Processen triggar en automatisk funktion eller ber en agent om ett beslut.
*   **Agent -> Engine:** En agent upptäcker en anomali (t.ex. en trasig buss) och initierar en relevant process (t.ex. "Incident & Reparation") i motorn.

## Tekniskt mönster: Smörgåsbordet
Process-domänen tillhandahåller en katalog av "Actions". Dessa kan vara:
1.  **Manual Check:** Kräver mänsklig interaktion i UI:t.
2.  **Deterministisk API-anrop:** Triggar en funktion i en annan domän.
3.  **Agent Task:** Publicerar ett meddelande på Event-bussen som en specifik agent lyssnar på.

## Gränssnitt (Checklistan)
Checklistan i Portalen är en direkt projektion av Process State. Den visar samarbetet mellan människa och maskin i realtid.
