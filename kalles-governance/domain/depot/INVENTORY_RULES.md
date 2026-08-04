# Inventory & Parts Domain (Lager & Reservdelar)

## Övergripande syfte
Att säkerställa att rätt reservdelar finns tillgängliga på rätt plats (depå) för att minimera stilleståndstid för vagnparken, samtidigt som kapitalbindningen optimeras.

## Kärnkoncept
*   **Part (Artikel):** En unik reservdel (t.ex. "Vindruta Buss 104", "Bromsbelägg Fram"). Identifieras med SKU.
*   **Location (Lagerställe):** En fysisk plats där delar förvaras, oftast kopplat till en specifik depå (t.ex. "Norrtälje Depå - Huvudlager").
*   **Stock Level (Lagersaldo):** Mängden av en specifik artikel på ett specifikt lagerställe.
    *   *OnHand:* Faktiskt fysiskt saldo.
    *   *Reserved:* Saldo som är bokat för en planerad reparation.
*   **Reorder Point (Beställningspunkt):** Det saldo-tröskelvärde där systemet automatiskt bör föreslå eller genomföra ett inköp.

## Agent-interaktioner (The Triple Ring)
Inventory-agenten agerar som en förhandlare mellan det fysiska behovet och den ekonomiska verkligheten.

1.  **Behovsidentifiering (Input från Depot):**
    *   När en reparation planeras i `Depot`, frågar systemet `Inventory`: "Finns del X på plats Y?"
    *   Om ja: Reservera delen.
    *   Om nej: Trigga inköpsprocess.

2.  **Inköpsförhandling (Agent Negotiation):**
    *   `Inventory Agent` identifierar brist.
    *   Hämtar offerter/ledtider från leverantörer.
    *   Presenterar alternativ för `Finance Agent`:
        *   *Alternativ A:* Express (Hög kostnad, 4h leverans).
        *   *Alternativ B:* Standard (Låg kostnad, 3 dagar leverans).
    *   `Traffic Agent` ger input om konsekvens: "Om vi tar alternativ B står bussen still i 3 dagar, vilket kostar 15 000 SEK i vite."
    *   Beslut fattas baserat på totalekonomisk optimering.

3.  **Ankomst (Input från Outer Ring):**
    *   När en leverans anländer (via Integration Adapter från leverantör/fraktbolag), uppdateras `OnHand` och en händelse publiceras på Event Horizon.

## Affärsregler
*   Inget uttag ur lager får ske utan en kopplad arbetsorder (Work Order).
*   Säkerhetslager (Safety Stock) måste upprätthållas för kritiska artiklar (t.ex. däck, lampor).
*   Vid inventeringsdifferens ska `DecisionEvent` loggas för att förklara avvikelsen.
