import { Logger } from '@kalles-buss/shared-utils';
import { v4 as uuidv4 } from 'uuid';

export interface Trip {
  id: string;
  startLoc: string;
  endLoc: string;
  startTimeMs: number; 
  endTimeMs: number;
}

export interface DetailedBlock {
  id: string;
  startGaragePoint: string;
  endGaragePoint: string;
  accumulatedDistanceKm: number;
  items: {
    type: 'SERVICE' | 'DEAD_RUN';
    tripId?: string;
    from: string;
    to: string;
    start: number;
    end: number;
    distanceKm: number;
  }[];
}

export class VspSolver {
  private readonly MIN_LAYOVER_MS = 5 * 60 * 1000;

  /**
   * Simple distance matrix for Norrtälje - Stockholm corridor
   */
  private getDistanceKm(fromLoc: string, toLoc: string): number {
    const locations: Record<string, any> = {
      'STOP:Norrtalje:RC': { lat: 59.758, lon: 18.705 },
      'STOP:Tekniska:Hogskolan': { lat: 59.345, lon: 18.071 },
      'STOP:Danderyds:Sjukhus': { lat: 59.392, lon: 18.043 },
      'GaragePoint:Norrtalje:GP1': { lat: 59.750, lon: 18.690 }
    };

    const p1 = locations[fromLoc];
    const p2 = locations[toLoc];

    if (!p1 || !p2) {
       // Return realistic defaults for 676 if ID not in map
       if (fromLoc.includes('RC') && toLoc.includes('Hogskolan')) return 68;
       if (fromLoc.includes('Hogskolan') && toLoc.includes('RC')) return 68;
       if (fromLoc === toLoc) return 0;
       return 10; // Default dead run
    }

    // Rough Haversine-ish for local distances
    const dist = Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lon - p2.lon, 2)) * 111;
    return parseFloat(dist.toFixed(1));
  }

  private getDeadheadMs(fromLoc: string, toLoc: string): number {
    if (fromLoc === toLoc) return 0;
    const dist = this.getDistanceKm(fromLoc, toLoc);
    return Math.max(15, (dist / 60) * 60) * 60 * 1000; // 60km/h average
  }

  /**
   * Generates detailed Blocks using Transmodel principles, now with Range Awareness.
   * @param maxRangeKm Configurable heuristic boundary per block (e.g., 300 for EV, 800 for Diesel).
   */
  public solveSingleDepotDetailed(trips: Trip[], garagePointId: string, maxRangeKm: number = 300): DetailedBlock[] {
    const sortedTrips = [...trips].sort((a, b) => a.startTimeMs - b.startTimeMs);
    const blocks: DetailedBlock[] = [];

    for (const trip of sortedTrips) {
      let assigned = false;
      const tripDist = this.getDistanceKm(trip.startLoc, trip.endLoc);
      
      for (const block of blocks) {
        const lastItem = block.items[block.items.length - 1];
        const deadheadDist = this.getDistanceKm(lastItem.to, trip.startLoc);
        const deadheadMs = this.getDeadheadMs(lastItem.to, trip.startLoc);
        
        // Essential: Will the bus make it back to depot after this trip?
        const pullInDist = this.getDistanceKm(trip.endLoc, block.endGaragePoint);
        const projectedTotalDist = block.accumulatedDistanceKm + deadheadDist + tripDist + pullInDist;

        if (lastItem.end + deadheadMs + this.MIN_LAYOVER_MS <= trip.startTimeMs && projectedTotalDist <= maxRangeKm) {
          if (deadheadDist > 0) {
            block.items.push({
              type: 'DEAD_RUN',
              from: lastItem.to,
              to: trip.startLoc,
              start: lastItem.end,
              end: lastItem.end + deadheadMs,
              distanceKm: deadheadDist
            });
          }
          
          block.items.push({
            type: 'SERVICE',
            tripId: trip.id,
            from: trip.startLoc,
            to: trip.endLoc,
            start: trip.startTimeMs,
            end: trip.endTimeMs,
            distanceKm: tripDist
          });

          block.accumulatedDistanceKm += (deadheadDist + tripDist);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        const pullOutDist = this.getDistanceKm(garagePointId, trip.startLoc);
        const pullOutMs = this.getDeadheadMs(garagePointId, trip.startLoc);

        const newBlock: DetailedBlock = {
          id: `BLOCK-${uuidv4().substring(0, 6).toUpperCase()}`,
          startGaragePoint: garagePointId,
          endGaragePoint: garagePointId,
          accumulatedDistanceKm: pullOutDist + tripDist,
          items: [
            {
              type: 'DEAD_RUN',
              from: garagePointId,
              to: trip.startLoc,
              start: trip.startTimeMs - pullOutMs,
              end: trip.startTimeMs,
              distanceKm: pullOutDist
            },
            {
              type: 'SERVICE',
              tripId: trip.id,
              from: trip.startLoc,
              to: trip.endLoc,
              start: trip.startTimeMs,
              end: trip.endTimeMs,
              distanceKm: tripDist
            }
          ]
        };
        blocks.push(newBlock);
      }
    }

    // Add pull-in for all blocks and finalize dist
    for (const block of blocks) {
      const last = block.items[block.items.length - 1];
      const pullInDist = this.getDistanceKm(last.to, block.endGaragePoint);
      const pullInMs = this.getDeadheadMs(last.to, block.endGaragePoint);

      block.items.push({
        type: 'DEAD_RUN',
        from: last.to,
        to: block.endGaragePoint,
        start: last.end,
        end: last.end + pullInMs,
        distanceKm: pullInDist
      });
      block.accumulatedDistanceKm += pullInDist;
    }

    return blocks;
  }
}
