import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '@kalles-buss/shared-utils';
import Seven from 'node-7z';
import sevenBin from '7zip-bin';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export class KodaBacktester {
  private kodaKey: string;
  private tapeDir: string;
  private operatorId = 'sl'; // Defaulting to SL for line 676

  constructor() {
    this.kodaKey = process.env.TRAFIKLAB_KODA_KEY || '';
    this.tapeDir = path.join(__dirname, '../../src/tapes');
  }

  /**
   * Acts as a Time Machine. Downloads a full day of GTFS-RT data from KoDa, 
   * parses the Protocol Buffers, filters for a specific line, and saves a Golden Tape.
   */
  async buildTapeFromHistory(targetDate: string, targetLineId: string = '676') {
    Logger.info(`[KoDa Backtester] Traveling back in time to ${targetDate}. Target Line: ${targetLineId}`);
    
    if (!this.kodaKey) throw new Error('[KoDa Backtester] Missing TRAFIKLAB_KODA_KEY. Cannot travel in time.');

    // Endpoint format: https://api.koda.trafiklab.se/KoDa/api/v2/gtfs-rt/{operatorId}/{feedId}?date={YYYY-MM-DD}
    const apiUrl = `https://api.koda.trafiklab.se/KoDa/api/v2/gtfs-rt/${this.operatorId}/VehiclePositions?date=${targetDate}&key=${this.kodaKey}`;
    
    const archivePath = path.join(os.tmpdir(), `koda_${targetDate}.7z`);
    const extractPath = path.join(os.tmpdir(), `koda_extracted_${targetDate}`);
    
    try {
      // 1. Download the massive 7z archive
      Logger.info(`[KoDa Backtester] Downloading historical archive from Trafiklab... (URL: ${apiUrl.replace(this.kodaKey, '***')})`);
      
      let response: any;
      let attempts = 0;
      
      while (attempts < 30) { // Max 5 minutes polling (30 * 10s)
        try {
           response = await axios({ 
             url: apiUrl, 
             method: 'GET', 
             responseType: 'stream',
             validateStatus: status => status === 200 || status === 202
           });
           
           if (response.status === 202) {
             Logger.info(`[KoDa Backtester] Trafiklab is generating the archive (HTTP 202). Waiting 10 seconds...`);
             await new Promise(resolve => setTimeout(resolve, 10000));
             attempts++;
           } else if (response.status === 200) {
             break;
           } else {
             throw new Error(`Unexpected status code: ${response.status}`);
           }
        } catch(err: any) {
           throw err; // Will be caught by the outer catch
        }
      }

      if (response.status === 202) {
         throw new Error('Trafiklab is taking too long to generate the archive. Polling timeout.');
      }

      const writer = fs.createWriteStream(archivePath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });

      // 2. Extract the 7z archive
      Logger.info(`[KoDa Backtester] Extracting 7z archive (This might take a while)...`);
      if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath);

      // On Alpine Linux (Docker), the precompiled 7zip-bin often fails. 
      // We installed '7zip' via apk, which exposes '/usr/bin/7z' in the PATH.
      const binPath = os.platform() === 'linux' ? '/usr/bin/7z' : sevenBin.path7za;

      const stream = Seven.extractFull(archivePath, extractPath, {
        $bin: binPath
      });
      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => resolve());
        stream.on('error', reject);
      });

      // 3. Parse all .pb (Protocol Buffer) files inside the extracted folder
      Logger.info(`[KoDa Backtester] Sifting through protobuf files to build Golden Tape...`);
      const files = fs.readdirSync(extractPath).filter(f => f.endsWith('.pb'));
      // Sort chronologically (Trafiklab names them by timestamp typically)
      files.sort();

      const goldenTape: any[] = [];
      let totalBusesFound = 0;

      for (const file of files) {
        const pbData = fs.readFileSync(path.join(extractPath, file));
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(pbData));

        for (const entity of feed.entity) {
          if (entity.vehicle && entity.vehicle.trip && entity.vehicle.trip.routeId === targetLineId) {
            totalBusesFound++;
            
            // Map to our Tape format (Same as VehicleTelemetryUpdate)
            goldenTape.push({
              vehicleId: entity.vehicle.vehicle?.id || 'UNKNOWN-BUS',
              tripId: entity.vehicle.trip.tripId || 'UNKNOWN-TRIP',
              routeId: entity.vehicle.trip.routeId || 'UNKNOWN-ROUTE',
              timestamp: new Date(Number(entity.vehicle.timestamp) * 1000).toISOString(),
              gps: {
                latitude: entity.vehicle.position?.latitude || 0,
                longitude: entity.vehicle.position?.longitude || 0
              },
              speedKmh: (entity.vehicle.position?.speed || 0) * 3.6,
              odometerKm: entity.vehicle.position?.odometer || 0
            });
          }
        }
      }

      // 4. Save the Tape
      const tapeName = `tape_${targetLineId}_${targetDate}.json`;
      const tapePath = path.join(this.tapeDir, tapeName);
      
      if (!fs.existsSync(this.tapeDir)) fs.mkdirSync(this.tapeDir, { recursive: true });
      fs.writeFileSync(tapePath, JSON.stringify(goldenTape, null, 2));
      Logger.info(`[KoDa Backtester] Success! Constructed Golden Tape with ${totalBusesFound} datapoints. Saved to ${tapeName}`);
      
      // Cleanup
      fs.unlinkSync(archivePath);
      fs.rmSync(extractPath, { recursive: true, force: true });

      return { status: 'SUCCESS', tapeName, dataPoints: totalBusesFound };
    } catch (error: any) {
      const errorMsg = error.response && error.response.data 
        ? (error.response.data instanceof Buffer ? error.response.data.toString() : JSON.stringify(error.response.data)) 
        : error.message;
        
      Logger.error(`[KoDa Backtester] Time travel failed: ${errorMsg}`);
      
      if (error.response && (error.response.status === 400 || error.response.status === 401)) {
        Logger.warn(`[KoDa Backtester] Generating fallback synthetic tape due to API rejection...`);
        return this.generateFallbackTape(targetDate, targetLineId);
      }
      
      throw new Error(`Trafiklab KoDa API Error: ${errorMsg}`);
    }
  }

  private generateFallbackTape(targetDate: string, targetLineId: string) {
    Logger.info(`[KoDa Backtester] Building Synthetic Fallback Tape for ${targetLineId} on ${targetDate}...`);
    
    const goldenTape: any[] = [];
    const baseDate = targetDate;
    const vehicleId = `BUSS-${Math.floor(Math.random() * 1000)}`;
    const tripId = `JRN:${targetLineId}:OUT:1`; // Matches the first outbound trip from our synthetic NeTEx
    
    let currentLat = 59.758;
    let currentLon = 18.705;
    const endLat = 59.345;
    const endLon = 18.071;
    
    const steps = 60; // 60 minutes travel
    let currentTime = new Date(`${baseDate}T05:00:00Z`).getTime();
    
    for (let i = 0; i <= steps; i++) {
       const progress = i / steps;
       const lat = currentLat + (endLat - currentLat) * progress;
       const lon = currentLon + (endLon - currentLon) * progress;
       
       goldenTape.push({
          vehicleId: vehicleId,
          tripId: tripId,
          routeId: `Line:${targetLineId}`,
          timestamp: new Date(currentTime).toISOString(),
          gps: { latitude: lat, longitude: lon },
          speedKmh: 65,
          currentSOC: 100 - (progress * 20), // Drops by 20%
          odometerKm: 12000 + (progress * 65)
       });
       currentTime += 60000; // 1 minute per step
    }

    const tapeName = `tape_${targetLineId}_${targetDate}_fallback.json`;
    const tapePath = path.join(this.tapeDir, tapeName);
    
    if (!fs.existsSync(this.tapeDir)) fs.mkdirSync(this.tapeDir, { recursive: true });
    fs.writeFileSync(tapePath, JSON.stringify(goldenTape, null, 2));
    
    Logger.info(`[KoDa Backtester] Fallback Tape saved to ${tapeName}`);
    return { status: 'FALLBACK_SUCCESS', tapeName, dataPoints: goldenTape.length };
  }
}
