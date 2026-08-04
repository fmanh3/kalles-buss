"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeOnboardedSchema = exports.BudgetDecisionSchema = exports.ResourceShortageForecastSchema = void 0;
const zod_1 = require("zod");
// ==========================================
// STRATEGIC NEGOTIATION CONTRACTS
// ==========================================
exports.ResourceShortageForecastSchema = zod_1.z.object({
    eventType: zod_1.z.literal('ResourceShortageForecast'),
    domain: zod_1.z.enum(['TRAFFIC', 'DEPOT']),
    roleNeeded: zod_1.z.enum(['DRIVER', 'MECHANIC', 'CLEANER']),
    quantity: zod_1.z.number().int().min(1),
    location: zod_1.z.string(),
    projectedPenaltyCost: zod_1.z.number().describe('The financial loss if these resources are NOT hired'),
    urgency: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
});
exports.BudgetDecisionSchema = zod_1.z.object({
    eventType: zod_1.z.literal('BudgetDecision'),
    originalRequestEventId: zod_1.z.string(),
    decision: zod_1.z.enum(['APPROVED', 'REJECTED']),
    approvedQuantity: zod_1.z.number().int(),
    maxMonthlyCostPerUnit: zod_1.z.number(),
    rationale: zod_1.z.string().describe('The CFO Agents explanation for the decision')
});
exports.EmployeeOnboardedSchema = zod_1.z.object({
    eventType: zod_1.z.literal('EmployeeOnboarded'),
    employeeId: zod_1.z.string(),
    role: zod_1.z.enum(['DRIVER', 'MECHANIC', 'CLEANER']),
    name: zod_1.z.string(),
    baseLocation: zod_1.z.string(),
    missingCompliance: zod_1.z.array(zod_1.z.string()).optional().describe('Training needed before active duty')
});
//# sourceMappingURL=agent-negotiation.js.map