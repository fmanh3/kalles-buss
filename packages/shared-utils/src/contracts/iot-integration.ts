import { z } from 'zod';

// ==========================================
// TELEMATICS CONTRACTS (Real-time Fleet Data)
// ==========================================

export const GpsCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional()
});

export const VehicleTelemetryUpdateSchema = z.object({
  eventType: z.literal('VehicleTelemetryUpdate'),
  vehicleId: z.string(),
  tripId: z.string().optional(),
  routeId: z.string().optional(),
  timestamp: z.string().datetime(),
  gps: GpsCoordinatesSchema,
  currentSOC: z.number().min(0).max(100), // State of Charge in %
  speedKmh: z.number().min(0),
  odometerKm: z.number().min(0)
});

export const PassengerLoadUpdateSchema = z.object({
  eventType: z.literal('PassengerLoadUpdate'),
  vehicleId: z.string(),
  timestamp: z.string().datetime(),
  passengerCount: z.number().int().min(0),
  isLoadAlert: z.boolean(), // Becomes true if count > threshold (e.g., 80)
  location: GpsCoordinatesSchema.optional()
});

export const CriticalFaultDetectedSchema = z.object({
  eventType: z.literal('CriticalFaultDetected'),
  vehicleId: z.string(),
  timestamp: z.string().datetime(),
  faultCode: z.string(),
  severity: z.enum(['HIGH', 'CRITICAL']), // CRITICAL requires immediate stop
  description: z.string(),
  requiresEvacuation: z.boolean()
});

export type VehicleTelemetryUpdate = z.infer<typeof VehicleTelemetryUpdateSchema>;
export type PassengerLoadUpdate = z.infer<typeof PassengerLoadUpdateSchema>;
export type CriticalFaultDetected = z.infer<typeof CriticalFaultDetectedSchema>;

// ==========================================
// WEATHER CONTRACTS
// ==========================================

export const OperationalRiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']);

// Query Response Contract
export const WeatherForecastResponseSchema = z.object({
  location: z.string(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  temperatureCelsius: z.number(),
  windSpeedMs: z.number(),
  precipitationMm: z.number(),
  operationalRiskLevel: OperationalRiskLevelSchema,
  riskReason: z.string().optional()
});

// Event Contract
export const WeatherAlertSchema = z.object({
  eventType: z.literal('WeatherAlert'),
  timestamp: z.string().datetime(),
  affectedArea: z.string(),
  alertType: z.enum(['SUDDEN_ICE', 'EXTREME_COLD', 'HEAVY_SNOW', 'HIGH_WIND']),
  operationalRiskLevel: OperationalRiskLevelSchema,
  recommendedAction: z.string()
});

export type WeatherForecastResponse = z.infer<typeof WeatherForecastResponseSchema>;
export type WeatherAlert = z.infer<typeof WeatherAlertSchema>;
