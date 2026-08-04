"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherAlertSchema = exports.WeatherForecastResponseSchema = exports.OperationalRiskLevelSchema = exports.CriticalFaultDetectedSchema = exports.PassengerLoadUpdateSchema = exports.VehicleTelemetryUpdateSchema = exports.GpsCoordinatesSchema = void 0;
const zod_1 = require("zod");
// ==========================================
// TELEMATICS CONTRACTS (Real-time Fleet Data)
// ==========================================
exports.GpsCoordinatesSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    heading: zod_1.z.number().min(0).max(360).optional()
});
exports.VehicleTelemetryUpdateSchema = zod_1.z.object({
    eventType: zod_1.z.literal('VehicleTelemetryUpdate'),
    vehicleId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    gps: exports.GpsCoordinatesSchema,
    currentSOC: zod_1.z.number().min(0).max(100), // State of Charge in %
    speedKmh: zod_1.z.number().min(0),
    odometerKm: zod_1.z.number().min(0)
});
exports.PassengerLoadUpdateSchema = zod_1.z.object({
    eventType: zod_1.z.literal('PassengerLoadUpdate'),
    vehicleId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    passengerCount: zod_1.z.number().int().min(0),
    isLoadAlert: zod_1.z.boolean(), // Becomes true if count > threshold (e.g., 80)
    location: exports.GpsCoordinatesSchema.optional()
});
exports.CriticalFaultDetectedSchema = zod_1.z.object({
    eventType: zod_1.z.literal('CriticalFaultDetected'),
    vehicleId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    faultCode: zod_1.z.string(),
    severity: zod_1.z.enum(['HIGH', 'CRITICAL']), // CRITICAL requires immediate stop
    description: zod_1.z.string(),
    requiresEvacuation: zod_1.z.boolean()
});
// ==========================================
// WEATHER CONTRACTS
// ==========================================
exports.OperationalRiskLevelSchema = zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']);
// Query Response Contract
exports.WeatherForecastResponseSchema = zod_1.z.object({
    location: zod_1.z.string(),
    validFrom: zod_1.z.string().datetime(),
    validTo: zod_1.z.string().datetime(),
    temperatureCelsius: zod_1.z.number(),
    windSpeedMs: zod_1.z.number(),
    precipitationMm: zod_1.z.number(),
    operationalRiskLevel: exports.OperationalRiskLevelSchema,
    riskReason: zod_1.z.string().optional()
});
// Event Contract
exports.WeatherAlertSchema = zod_1.z.object({
    eventType: zod_1.z.literal('WeatherAlert'),
    timestamp: zod_1.z.string().datetime(),
    affectedArea: zod_1.z.string(),
    alertType: zod_1.z.enum(['SUDDEN_ICE', 'EXTREME_COLD', 'HEAVY_SNOW', 'HIGH_WIND']),
    operationalRiskLevel: exports.OperationalRiskLevelSchema,
    recommendedAction: zod_1.z.string()
});
//# sourceMappingURL=iot-integration.js.map