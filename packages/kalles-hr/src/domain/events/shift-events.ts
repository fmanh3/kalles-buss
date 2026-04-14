import { z } from 'zod';

export const ShiftAssignmentRequestedSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  driverId: z.string(),
  shiftId: z.string(),
  proposedStartTime: z.string().datetime(),
  proposedEndTime: z.string().datetime(),
});

export type ShiftAssignmentRequested = z.infer<typeof ShiftAssignmentRequestedSchema>;

export const DriverAssignedToShiftSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  driverId: z.string(),
  shiftId: z.string(),
  startTime: z.string().datetime(),
});

export type DriverAssignedToShift = z.infer<typeof DriverAssignedToShiftSchema>;
