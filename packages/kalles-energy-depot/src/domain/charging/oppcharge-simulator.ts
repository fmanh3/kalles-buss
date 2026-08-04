import { Logger } from '@kalles-buss/shared-utils';

export interface TourSimulationData {
  id: string;
  from: string;
  to: string;
  startTime: number;
  endTime: number;
  distanceKm: number;
  type: 'SERVICE' | 'DEAD_RUN';
}

export interface ChargerConfig {
  id: string;
  locationId: string;
  powerKw: number;
}

interface ChargerSlot {
  startTime: number;
  endTime: number;
  vehicleId: string;
}

export class OppChargeSimulator {
  private consumptionPerKm = 2.0; // Vinter-worst-case (kWh/km)
  private minAllowedSocKwh = 65; // ~10% av 650kWh
  
  // Det tänkta Gantt-schemat i minnet under simuleringen
  private chargerGantt: Record<string, ChargerSlot[]> = {};
  
  // Vår hårdkodade infrastruktur för simuleringen (Steg 2)
  private chargers: ChargerConfig[] = [];

  constructor() {
    this.setupInfrastructure();
  }

  private setupInfrastructure() {
    // 12 laddare i Norrtälje (RC)
    for (let i = 1; i <= 12; i++) {
      const chargerId = `CHG-NRT-${i.toString().padStart(2, '0')}`;
      this.chargers.push({ id: chargerId, locationId: 'STOP:Norrtalje:RC', powerKw: 450 });
      this.chargerGantt[chargerId] = [];
    }
    // 5 laddare vid Tekniska Högskolan
    for (let i = 1; i <= 5; i++) {
      const chargerId = `CHG-TEK-${i.toString().padStart(2, '0')}`;
      this.chargers.push({ id: chargerId, locationId: 'STOP:Tekniska:Hogskolan', powerKw: 450 });
      this.chargerGantt[chargerId] = [];
    }
  }

  /**
   * Försöker hitta en ledig laddare på en specifik plats under ett tidsfönster.
   * Om den hittar en, "bokas" den i Gantt-schemat.
   */
  private tryBookCharger(locationId: string, startTimeMs: number, endTimeMs: number, vehicleId: string): ChargerConfig | null {
    const availableChargers = this.chargers.filter(c => c.locationId === locationId);
    
    for (const charger of availableChargers) {
      const slots = this.chargerGantt[charger.id];
      // Kolla om laddaren har någon krock under detta fönster
      const hasConflict = slots.some(slot => 
        (startTimeMs < slot.endTime && endTimeMs > slot.startTime)
      );

      if (!hasConflict) {
        // Boka den!
        slots.push({ startTime: startTimeMs, endTime: endTimeMs, vehicleId });
        return charger;
      }
    }
    return null; // Alla laddare upptagna (eller inga laddare finns på denna plats)
  }

  /**
   * Kör en fullständig energisimulering av ett block.
   */
  public simulateBlock(blockId: string, tours: TourSimulationData[], startingSocKwh: number = 650) {
    let currentSoc = startingSocKwh;
    const socLog: { time: string, action: string, soc: number, details?: string }[] = [];
    
    socLog.push({ time: new Date(tours[0].startTime).toISOString(), action: 'BLOCK_START', soc: currentSoc });

    for (let i = 0; i < tours.length; i++) {
      const tour = tours[i];
      
      // 1. Dränera energi under turen
      const energyUsed = tour.distanceKm * this.consumptionPerKm;
      currentSoc -= energyUsed;
      
      socLog.push({ 
        time: new Date(tour.endTime).toISOString(), 
        action: `TOUR_${tour.type}`, 
        soc: currentSoc,
        details: `Drove ${tour.distanceKm}km. Used ${energyUsed}kWh.`
      });

      if (currentSoc < this.minAllowedSocKwh) {
        Logger.warn(`[EnergyDepot] Block ${blockId} failed energy validation! Battery dropped below safe threshold at ${new Date(tour.endTime).toISOString()}`);
        return { isValid: false, finalSoc: currentSoc, failurePoint: tour.id, log: socLog };
      }

      // 2. Kolla efter möjlig OppCharge (Layover) innan nästa tur
      if (i < tours.length - 1) {
        const nextTour = tours[i + 1];
        const layoverMs = nextTour.startTime - tour.endTime;
        
        // Vi kräver minst 3 minuters layover för att det ska vara lönt att koppla in pantografen
        if (layoverMs > 3 * 60 * 1000) {
          const charger = this.tryBookCharger(tour.to, tour.endTime, nextTour.startTime, blockId);
          
          if (charger) {
            // Vi laddar! (Exempel: 450kW. Om vi laddar i 10 min: (10/60) * 450 = 75 kWh)
            const chargeHours = layoverMs / (1000 * 60 * 60);
            const energyAdded = chargeHours * charger.powerKw;
            
            // Fysisk spärr: Vi kan inte ladda batteriet mer än fullt
            const actualEnergyAdded = Math.min(energyAdded, 650 - currentSoc);
            currentSoc += actualEnergyAdded;

            socLog.push({ 
              time: new Date(nextTour.startTime).toISOString(), 
              action: `OPPCHARGE`, 
              soc: currentSoc,
              details: `Charged at ${charger.id} for ${Math.round(layoverMs/60000)}m. Added +${Math.round(actualEnergyAdded)}kWh.`
            });
          } else {
             socLog.push({ 
              time: new Date(nextTour.startTime).toISOString(), 
              action: `LAYOVER_NO_CHARGE`, 
              soc: currentSoc,
              details: `Layover of ${Math.round(layoverMs/60000)}m at ${tour.to}, but no chargers available or installed.`
            });
          }
        }
      }
    }

    return { isValid: true, finalSoc: currentSoc, log: socLog };
  }
}