import { Logger, PubSubClient } from '@kalles-buss/shared-utils';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export interface NPCStats {
  id: string;
  name: string;
  physicalHealth: number; // 0-100
  stressLevel: number; // 0-100
}

export class ChaosMonkey {
  private npcs: NPCStats[] = [
    { id: 'DRIVER-007', name: 'Kalle Karlsson', physicalHealth: 80, stressLevel: 10 },
    { id: 'DRIVER-101', name: 'Anna Andersson', physicalHealth: 30, stressLevel: 50 } // Sickly candidate
  ];

  constructor(private pubsub: PubSubClient, private hrApiUrl: string) {}

  getNPCs() {
    return this.npcs;
  }

  /**
   * Starts the chaos cycle. Periodically rolls the dice for sickness and faults.
   */
  start(intervalMs: number = 60000) {
    Logger.info('--- THE CHAOS MONKEY IS LOOSE 🐒 ---');

    setInterval(async () => {
      await this.rollForSickness();
      await this.rollForVehicleFault();
    }, intervalMs);
  }

  private async rollForSickness() {
    for (const npc of this.npcs) {
      // The Sickness Dice: Higher probability if health is low
      const threshold = (100 - npc.physicalHealth) / 2; // e.g. 35% if health is 30
      const dice = Math.random() * 100;

      if (dice < threshold) {
        Logger.warn(`[Chaos Monkey] NPC ${npc.name} (${npc.id}) has fallen sick! (Dice: ${dice.toFixed(1)} < ${threshold})`);
        
        // Trigger Sick Leave in HR Domain via API
        try {
          await axios.post(`${this.hrApiUrl}/simulate/sick-leave`, { driverId: npc.id });
          Logger.info(`[Chaos Monkey] Sick leave recorded for ${npc.id}`);
        } catch (e) {
          Logger.error(`[Chaos Monkey] Failed to trigger sick leave for ${npc.id}: ${e}`);
        }
      }
    }
  }

  private async rollForVehicleFault() {
    const dice = Math.random() * 100;
    // 5% chance of a critical fault per interval
    if (dice < 5) {
      const faultEvent = {
        eventType: 'CriticalFaultDetected',
        vehicleId: 'BUSS-101',
        timestamp: new Date().toISOString(),
        faultCode: 'ERR-BATT-01',
        severity: 'CRITICAL',
        description: 'Critical Battery Thermal Imbalance Detected',
        requiresEvacuation: true
      };

      await this.pubsub.publish('telematics-events', faultEvent);
      Logger.error(`[Chaos Monkey] INJECTED CRITICAL FAULT on BUSS-101!`);
    }
  }
}
