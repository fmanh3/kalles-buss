# Energy & Depot Domain: Förmågekartläggning (v1.0)

## Vision
Att garantera maximal fordonsberedskap till lägsta möjliga energikostnad genom intelligent styrning av depåinfrastruktur och laddningscykler.

## Kärnförmågor (Capabilities)

### 1. Energy Management (Energistyrning)
*   **Spot-price Optimization:** Anpassning av laddningsmönster baserat på realtidspriser från Nordpool.
*   **Load Balancing:** Balansering av effektuttaget i depån för att undvika dyra effekttoppar (Peak Shaving).
*   **V2G Readiness:** (Framtida) Möjlighet att sälja tillbaka batterikapacitet till nätet vid extrema pristoppar.

### 2. Depot Operations (Depådrift)
*   **Physical State Machine:** Håller reda på var bussen står fysiskt (Ficka A-12, Tvätt, Verkstad).
*   **Ready-for-Service:** Validering av att bussen är städad, laddad och säkerhetskontrollerad inför utsläpp.

### 3. Charger Gateway (Yttre Ring)
*   **OCPP Integration:** Kommunikation med de fysiska laddstationerna.
*   **Handshake Monitoring:** Säkerställa att kontakten mellan buss och laddare är stabil.
