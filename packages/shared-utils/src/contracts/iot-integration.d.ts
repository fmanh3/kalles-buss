import { z } from 'zod';
export declare const GpsCoordinatesSchema: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    heading: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const VehicleTelemetryUpdateSchema: z.ZodObject<{
    eventType: z.ZodLiteral<"VehicleTelemetryUpdate">;
    vehicleId: z.ZodString;
    timestamp: z.ZodString;
    gps: z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        heading: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    currentSOC: z.ZodNumber;
    speedKmh: z.ZodNumber;
    odometerKm: z.ZodNumber;
}, z.core.$strip>;
export declare const PassengerLoadUpdateSchema: z.ZodObject<{
    eventType: z.ZodLiteral<"PassengerLoadUpdate">;
    vehicleId: z.ZodString;
    timestamp: z.ZodString;
    passengerCount: z.ZodNumber;
    isLoadAlert: z.ZodBoolean;
    location: z.ZodOptional<z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        heading: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const CriticalFaultDetectedSchema: z.ZodObject<{
    eventType: z.ZodLiteral<"CriticalFaultDetected">;
    vehicleId: z.ZodString;
    timestamp: z.ZodString;
    faultCode: z.ZodString;
    severity: z.ZodEnum<{
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>;
    description: z.ZodString;
    requiresEvacuation: z.ZodBoolean;
}, z.core.$strip>;
export type VehicleTelemetryUpdate = z.infer<typeof VehicleTelemetryUpdateSchema>;
export type PassengerLoadUpdate = z.infer<typeof PassengerLoadUpdateSchema>;
export type CriticalFaultDetected = z.infer<typeof CriticalFaultDetectedSchema>;
export declare const OperationalRiskLevelSchema: z.ZodEnum<{
    HIGH: "HIGH";
    LOW: "LOW";
    MEDIUM: "MEDIUM";
    EXTREME: "EXTREME";
}>;
export declare const WeatherForecastResponseSchema: z.ZodObject<{
    location: z.ZodString;
    validFrom: z.ZodString;
    validTo: z.ZodString;
    temperatureCelsius: z.ZodNumber;
    windSpeedMs: z.ZodNumber;
    precipitationMm: z.ZodNumber;
    operationalRiskLevel: z.ZodEnum<{
        HIGH: "HIGH";
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        EXTREME: "EXTREME";
    }>;
    riskReason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const WeatherAlertSchema: z.ZodObject<{
    eventType: z.ZodLiteral<"WeatherAlert">;
    timestamp: z.ZodString;
    affectedArea: z.ZodString;
    alertType: z.ZodEnum<{
        SUDDEN_ICE: "SUDDEN_ICE";
        EXTREME_COLD: "EXTREME_COLD";
        HEAVY_SNOW: "HEAVY_SNOW";
        HIGH_WIND: "HIGH_WIND";
    }>;
    operationalRiskLevel: z.ZodEnum<{
        HIGH: "HIGH";
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        EXTREME: "EXTREME";
    }>;
    recommendedAction: z.ZodString;
}, z.core.$strip>;
export type WeatherForecastResponse = z.infer<typeof WeatherForecastResponseSchema>;
export type WeatherAlert = z.infer<typeof WeatherAlertSchema>;
