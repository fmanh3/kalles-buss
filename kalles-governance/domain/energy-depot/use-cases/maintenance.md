# Use Cases: Depot & Maintenance Operations

## UC-DEP-01: Rapportering av kritiskt fel (Grounding)
**Aktör:** Förare & Depot Agent
**Beskrivning:** Ett fel som påverkar säkerheten stoppar bussen från att rulla ut.

### Gherkin Scenario
```gherkin
Feature: Maintenance Severity Logic
  Scenario: Sprucken vindruta stoppar utsläpp
    Given förare "DRIVER-007" utför säkerhetskontroll på "BUSS-101"
    When föraren rapporterar "Vindruta: Sprucken" (Kategori: Glas)
    Then "Depot-Agenten" klassificerar felet som "LEVEL 3 (Critical)"
    And bussen markeras som "OUT_OF_SERVICE" i Traffic-domänen
    And en arbetsorder skickas automatiskt till "Ryds Bilglas"
    And "Scheduling-Agent" får larm om att ersättningsbuss krävs för Tur 676-01
```

## UC-DEP-02: Rapportering av kosmetiskt fel
**Aktör:** Förare & Depot Agent

### Gherkin Scenario
```gherkin
Feature: Maintenance Logistics
  Scenario: Klotter loggas för framtida åtgärd
    Given förare "DRIVER-007" rapporterar "Klotter på bakre dörr"
    When "Depot-Agenten" utvärderar felet
    Then klassificeras det som "LEVEL 1 (Cosmetic)"
    And bussen får status "SERVICEABLE" (Fortsatt trafik)
    And felet läggs i kön för "Nästa planerade depåstopp"
```
