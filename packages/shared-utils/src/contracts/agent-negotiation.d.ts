import { z } from 'zod';
export declare const ResourceShortageForecastSchema: z.ZodObject<{
    eventType: z.ZodLiteral<"ResourceShortageForecast">;
    domain: z.ZodEnum<{
        TRAFFIC: "TRAFFIC";
        DEPOT: "DEPOT";
    }>;
    roleNeeded: z.ZodEnum<{
        DRIVER: "DRIVER";
        MECHANIC: "MECHANIC";
        CLEANER: "CLEANER";
    }>;
    quantity: z.ZodNumber;
    location: z.ZodString;
    projectedPenaltyCost: z.ZodNumber;
    urgency: z.ZodEnum<{
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
        LOW: "LOW";
        MEDIUM: "MEDIUM";
    }>;
}, z.core.$strip>;
export declare const BudgetDecisionSchema: z.ZodObject<{
    eventType: z.ZodLiteral<"BudgetDecision">;
    originalRequestEventId: z.ZodString;
    decision: z.ZodEnum<{
        APPROVED: "APPROVED";
        REJECTED: "REJECTED";
    }>;
    approvedQuantity: z.ZodNumber;
    maxMonthlyCostPerUnit: z.ZodNumber;
    rationale: z.ZodString;
}, z.core.$strip>;
export declare const EmployeeOnboardedSchema: z.ZodObject<{
    eventType: z.ZodLiteral<"EmployeeOnboarded">;
    employeeId: z.ZodString;
    role: z.ZodEnum<{
        DRIVER: "DRIVER";
        MECHANIC: "MECHANIC";
        CLEANER: "CLEANER";
    }>;
    name: z.ZodString;
    baseLocation: z.ZodString;
    missingCompliance: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type ResourceShortageForecast = z.infer<typeof ResourceShortageForecastSchema>;
export type BudgetDecision = z.infer<typeof BudgetDecisionSchema>;
export type EmployeeOnboarded = z.infer<typeof EmployeeOnboardedSchema>;
