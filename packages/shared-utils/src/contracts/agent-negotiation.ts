import { z } from 'zod';

// ==========================================
// TACTICAL NEGOTIATION CONTRACTS (Milstolpe 10)
// ==========================================

export const BlockValidationRequestedSchema = z.object({
  eventType: z.literal('BlockValidationRequested'),
  blockId: z.string(),
  startingSocKwh: z.number().default(650),
  tours: z.array(z.any())
});

export const BlockValidationResultSchema = z.object({
  eventType: z.literal('BlockValidationResult'),
  blockId: z.string(),
  isValid: z.boolean(),
  failurePoint: z.string().optional()
});

export type BlockValidationRequested = z.infer<typeof BlockValidationRequestedSchema>;
export type BlockValidationResult = z.infer<typeof BlockValidationResultSchema>;

// ==========================================
// STRATEGIC NEGOTIATION CONTRACTS
// ==========================================

export const ResourceShortageForecastSchema = z.object({
  eventType: z.literal('ResourceShortageForecast'),
  domain: z.enum(['TRAFFIC', 'DEPOT']),
  roleNeeded: z.enum(['DRIVER', 'MECHANIC', 'CLEANER']),
  quantity: z.number().int().min(1),
  location: z.string(),
  projectedPenaltyCost: z.number().describe('The financial loss if these resources are NOT hired'),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
});

export const BudgetDecisionSchema = z.object({
  eventType: z.literal('BudgetDecision'),
  originalRequestEventId: z.string(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  approvedQuantity: z.number().int(),
  maxMonthlyCostPerUnit: z.number(),
  rationale: z.string().describe('The CFO Agents explanation for the decision')
});

export const EmployeeOnboardedSchema = z.object({
  eventType: z.literal('EmployeeOnboarded'),
  employeeId: z.string(),
  role: z.enum(['DRIVER', 'MECHANIC', 'CLEANER']),
  name: z.string(),
  baseLocation: z.string(),
  missingCompliance: z.array(z.string()).optional().describe('Training needed before active duty')
});

export type ResourceShortageForecast = z.infer<typeof ResourceShortageForecastSchema>;
export type BudgetDecision = z.infer<typeof BudgetDecisionSchema>;
export type EmployeeOnboarded = z.infer<typeof EmployeeOnboardedSchema>;
