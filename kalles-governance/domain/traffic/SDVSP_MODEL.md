# Single‑Depot VSP (SDVSP) som **min‑cost flow** – minimal men utbyggbar grund

> Syfte: Ge en **implementerbar** beskrivning av hur du löser ett Vehicle Scheduling Problem med **en depå** (single‑depot) med en min‑cost‑flow/assignment‑liknande modell. Den är medvetet skriven så att du kan klippa ut delar till en kodagent.
>
> Källstöd (bakgrund): SDVSP är känt som polynomiellt lösbart och kan formuleras som bl.a. **minimum‑cost flow** och **assignment**.citeturn17search23turn17search24

---

## 0. Terminologi och “datamodell i botten”

### 0.1 NeTEx → VSP‑projektion
Du kan betrakta varje **ServiceJourney** (NeTEx) som en **Trip** i VSP:

- `trip.id` ← `ServiceJourney/@id`
- `trip.start_time`, `trip.end_time` ← tidsfält i TimetableFrame (exakta fält varierar per profil)
- `trip.start_loc`, `trip.end_loc` ← *terminalnivå* (t.ex. StopPlaceRef). Börja grovt – du kan förfina till Quay senare.

I VSP behöver du dessutom **deadhead** (tomkörning) mellan platser och depåanslutning. MIT‑material beskriver exakt denna input‑typ: revenue trips + layover‑bågar + deadhead‑bågar inkl depå.citeturn17search24

### 0.2 Vad är output?
Output är en uppsättning **Blocks** (= omlopp): varje block är en sekvens av trips (service) med tomkörningar mellan, från depå till depå. I litteraturen beskrivs block som depå‑utgång → sekvens av trips → depå‑retur.citeturn17search23

---

## 1. Problemdefinition (single‑depot VSP)

**Givet**:
- En depå `D`
- En mängd trips `T = {1..n}`
- Varje trip `i` har:
  - startplats `s(i)`
  - slutplats `e(i)`
  - starttid `t_start(i)`
  - sluttid `t_end(i)`
- Restid för tomkörning `dh(a,b)` mellan platser (inkl depå till/från platser)
- Minsta återställning/layover `L` (minuter)

**Kompatibilitet**: trip `i` kan följas av trip `j` om

` t_end(i) + dh(e(i), s(j)) + L <= t_start(j)`

Detta är den standardmässiga kompatibilitetsregeln i VSP‑föreläsningar och översikter.citeturn17search24turn17search31

**Mål** (vanligast i praktiken):
1) minimera antal fordon (antal blocks)
2) givet minsta antal fordon: minimera tomkörning / icke‑intäktskostnad

---

## 2. Min‑cost‑flow‑formulering (lexikografiskt mål med “stor konstant”)

Det finns flera ekvivalenta formuleringar. Den mest kodvänliga för en första implementation är en **assignment/min‑cost‑flow** på en kompatibilitetsgraf.

### 2.1 Bygg grafen
Skapa en riktad acyklisk graf (tidsordning):

- En nod för varje trip `i`.
- En båge `i -> j` om `i` är kompatibel före `j`.
- En “source” `SRC` och “sink” `SNK`.
- Bågar från `SRC -> i` (starta ett nytt block med trip i)
- Bågar från `i -> SNK` (avsluta block efter trip i)

**Kostnader**:
- `c(i,j)` = tomkörningskostnad mellan trips, t.ex. `w_time * dh(e(i), s(j))`.
- `c_start(i)` = **F** + `w_time * dh(D, s(i))`  (startkostnad + pull‑out)
- `c_end(i)` = `w_time * dh(e(i), D)`            (pull‑in)

Där **F** är en stor konstant (“vehicle fixed cost”) som gör att modellen primärt minimerar antal fordon. Samma idé används ofta: min‑cost‑flow med bågar som representerar trips och depåanslutningar.citeturn17search24turn17search23

### 2.2 Variabler
Definiera binära variabler:
- `x_ij ∈ {0,1}` för varje kompatibel båge `i -> j`
- `y_i ∈ {0,1}` för startbåge `SRC -> i` (trip i är första i ett block)
- `z_i ∈ {0,1}` för slutbåge `i -> SNK` (trip i är sista i ett block)

### 2.3 Flödes-/täckningsrestriktioner
Varje trip ska ha **exakt en föregångare** (antingen från en annan trip eller från depån):

(1) `y_i + Σ_{k: k->i} x_ki = 1`  för alla `i`

Varje trip ska ha **exakt en efterföljare** (antingen till en annan trip eller till depån):

(2) `z_i + Σ_{j: i->j} x_ij = 1`  för alla `i`

Detta gör att trips länkas ihop till disjunkta kedjor (paths) från `SRC` till `SNK` som täcker alla trips exakt en gång.

### 2.4 Mål (minimera fordon först, sedan tomkörning)

Minimera:

`min  Σ_i c_start(i)*y_i  +  Σ_{i,j} c(i,j)*x_ij  +  Σ_i c_end(i)*z_i`

Med `c_start(i) = F + pullout(i)`.

**Varför funkar det?**
- `Σ_i y_i` = antal blocks (antal fordon). Varje block måste starta från `SRC` exakt en gång.
- Om `F` är mycket större än alla rimliga skillnader i tomkörningskostnad kommer optimeraren först minimera `Σ_i y_i`.

Praktisk tumregel för **F**:
- Låt `maxArcCost` = max tomkörningskostnad för någon kompatibel båge eller depåbåge.
- Sätt `F = (n+1) * maxArcCost` (räcker för lexikografisk prioritet i de flesta vardagliga fall).

> Alternativ (ren lexikografisk optimering): kör två steg: (A) minimera `Σ y_i`, (B) fixera den nivån och minimera deadhead. Men “stor F” är enklare att implementera.

---

## 3. Hur du extraherar **Blocks** ur lösningen

När du löst modellen har du:
- vilka trips som är starts (`y_i=1`)
- vilka länkar som används (`x_ij=1`)

Algoritm:
1. Bygg en map `next[i] = j` för alla `x_ij=1`.
2. För varje starttrip `i` där `y_i=1`:
   - följ `i, next[i], next[next[i]], ...` tills ingen nästa (dvs `z_k=1`).
   - detta är ett block.

Blockets “dead runs” är implicit:
- Depå → starttrip (pull‑out)
- mellan varje par i kedjan (deadhead)
- sista trip → depå (pull‑in)

Det kan du sedan serialisera till en intern NeTEx VehicleScheduleFrame (Block + DeadRuns) om du vill.

---

## 4. Minimal exempeldata (2 linjer, 1 depå)

> Poängen är att visa strukturen. Algoritmen bryr sig inte om att det är “två linjer”. Linje är metadata. Utbyggbarhet = lägg till fler trips.

### 4.1 Platser
- Depå: `D`
- Terminaler: `X, Y, U, V`

### 4.2 Trips
```json
[
  {"id":"t1","line":"L1","from":"X","to":"Y","start":"06:00","end":"06:30"},
  {"id":"t2","line":"L1","from":"Y","to":"X","start":"06:40","end":"07:10"},
  {"id":"t3","line":"L1","from":"X","to":"Y","start":"07:20","end":"07:50"},

  {"id":"t4","line":"L2","from":"U","to":"V","start":"06:05","end":"06:35"},
  {"id":"t5","line":"L2","from":"V","to":"U","start":"06:45","end":"07:15"},
  {"id":"t6","line":"L2","from":"U","to":"V","start":"07:25","end":"07:55"}
]
```

### 4.3 Deadhead‑tider (minuter)
```json
{
  "D->X":5, "D->U":5,
  "Y->D":5, "V->D":5,
  "X->U":10, "U->X":10,
  "Y->V":10, "V->Y":10,
  "X->X":0, "Y->Y":0, "U->U":0, "V->V":0,
  "X->Y":10, "Y->X":10,
  "U->V":10, "V->U":10
}
```

### 4.4 Layover
`L = 5` minuter.

### 4.5 Förväntad lösning
Kompatibilitet ger två naturliga kedjor:
- `t1 -> t2 -> t3`
- `t4 -> t5 -> t6`

⇒ **2 blocks** (2 fordon). Fleet‑minimering via matching är ett känt specialfall; flow‑/assignment‑modellen ger samma blockantal när `F` är stor.citeturn17search29turn17search23

---

## 5. Implementationstips (kodagent‑vänligt)

### 5.1 Preprocessing
1. Konvertera tider till minuter från midnatt.
2. Normalisera platser (sträng‑id).
3. Bygg en funktion `dh(a,b)` som slår i en matris eller ett routing‑API (internt).

### 5.2 Generera kompatibla bågar
Pseudokod:
```text
arcs = []
for i in trips:
  for j in trips:
    if end(i) + dh(to(i), from(j)) + L <= start(j):
       arcs.append((i,j,cost=dh(to(i), from(j))))
```

Eftersom tidsordning gäller kan du sortera trips på starttid och bryta tidigt.

### 5.3 Lösningsteknik
- Detta är ett 0–1 problem, men den här strukturen är ofta lösbar effektivt.
- För prototyp: använd en MILP‑solver (CBC/OR‑Tools/GLPK/Gurobi)
- För ren min‑cost flow: går ofta att reducera till min‑cost matching/assignment.

Litteraturen och kursmaterial anger att SDVSP kan formuleras som min‑cost flow och lösas effektivt i single‑depot‑fallet.citeturn17search23turn17search24

### 5.4 Bygg blocks ur lösningen
```text
next = {i: j for (i,j) if x_ij==1}
starts = [i for i if y_i==1]
blocks = []
for s in starts:
  b = [s]
  while b[-1] in next:
    b.append(next[b[-1]])
  blocks.append(b)
```

---

## 6. Design för framtida multi‑depot (utan att bygga om allt)

Det du gör nu är single‑depot.

När du går till **multi‑depot** blir problemet snabbt NP‑svårt och man använder andra strategier (heuristik, decomposition, branch‑and‑cut/price). Multi‑depot‑VSP är känd som NP‑hard och beskrivs så i modern och klassisk litteratur.citeturn17search32turn17search26

**Hur du gör din single‑depot‑kod redo**:
- Låt `Depot` vara en parameter i cost‑funktionen, inte hårdkodad.
- Modellera depåkapacitet separat (för multi‑depot kommer du ha `r_k` fordon per depå).
- Låt `c_start(i)` bli `c_start(k,i)` per depå `k`.

---

## 7. Vidare utveckling (vanliga nästa steg)

1) **Interlining‑regler**: tillåt/avvisa att fordon byter linje (en extra kompatibilitetsregel).
2) **Fordons­typer**: flera typer (elbuss/diesel/ledbuss). Då blir kompatibilitet/kapacitet typberoende.
3) **Elbussar**: laddfönster → lägg resursconstraint (det blir en annan problemklass, ofta heuristik/MIP).citeturn17search25
4) **Integrerat vehicle+crew**: gör inte direkt; kör duty scheduling som nästa lager (column generation etc.).citeturn16search1

---

## 8. Referenser (för fördjupning)
- MIT OCW “Vehicle Scheduling” – time‑space network & min‑cost flow‑modellering.citeturn17search24
- Freling/Wagelmans/Paixão – SDVSP, polynomisk lösbarhet och flera formuleringar inkl min‑cost flow.citeturn17search23
- Rehfeldt – översikt; SDVSP som min‑cost flow och multi‑depot NP‑hard.citeturn17search26

