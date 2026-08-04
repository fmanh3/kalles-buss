import { z } from 'zod';

export const ScheduledStopPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number().optional(),
  lon: z.number().optional()
});

export const LineSchema = z.object({
  id: z.string(),
  publicCode: z.string(),
  name: z.string()
});

export const JourneyCallSchema = z.object({
  stopPointId: z.string(),
  stopSequence: z.number(),
  arrivalTime: z.string().datetime(),
  departureTime: z.string().datetime(),
  forBoarding: z.boolean().default(true),
  forAlighting: z.boolean().default(true),
  isTimingPoint: z.boolean().default(false)
});

export const ServiceJourneySchema = z.object({
  id: z.string(),
  lineId: z.string(),
  direction: z.enum(['OUTBOUND', 'RETURN']),
  dayTypeRef: z.string(),
  calls: z.array(JourneyCallSchema)
});

export const TimetableUpdatedSchema = z.object({
  eventType: z.literal('TimetableUpdated'),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  lines: z.array(LineSchema),
  stopPoints: z.array(ScheduledStopPointSchema),
  journeys: z.array(ServiceJourneySchema)
});

export type TimetableUpdated = z.infer<typeof TimetableUpdatedSchema>;
export type ServiceJourney = z.infer<typeof ServiceJourneySchema>;
export type Line = z.infer<typeof LineSchema>;
export type ScheduledStopPoint = z.infer<typeof ScheduledStopPointSchema>;
export type JourneyCall = z.infer<typeof JourneyCallSchema>;

// --- SCENARIO ENGINE CONTRACTS ---

export const ScenarioSchema = z.object({
  id: z.string(),
  metadata: z.object({
    name: z.string(),
    description: z.string(),
    createdAt: z.string().datetime(),
    createdBy: z.string()
  }),
  initialState: z.object({
    finance: z.object({
      startingCashSek: z.number()
    }),
    hr: z.object({
      roster: z.array(z.object({
        id: z.string(),
        name: z.string(),
        pnr: z.string(), // e.g. 19800101-ABCD
        competences: z.array(z.string())
      }))
    }),
    fleet: z.array(z.object({
      vehicleId: z.string(),
      vin: z.string(),
      odometerKm: z.number(),
      depotId: z.string()
    }))
  }),
  stimuli: z.object({
    kodaTapeDate: z.string(), // YYYY-MM-DD
    weatherDate: z.string(),    // YYYY-MM-DD (SMHI)
    scriptedChaos: z.array(z.object({
      simulatedTime: z.string(), // HH:mm
      eventType: z.string(),
      targetId: z.string(),
      payload: z.any()
    }))
  }),
  assetInfo: z.object({
    type: z.string(),
    config: z.any()
  }).optional()
});

export const SimulationRunSchema = z.object({
  runId: z.string(),
  scenarioId: z.string(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  results: z.object({
    totalCostSek: z.number().optional(),
    serviceLevelPercent: z.number().optional(),
    decisionsCount: z.number().optional()
  }).optional()
});

export type Scenario = z.infer<typeof ScenarioSchema>;
export type SimulationRun = z.infer<typeof SimulationRunSchema>;
