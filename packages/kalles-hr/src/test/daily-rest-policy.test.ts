import { DailyRestPolicy } from '../domain/policies/daily-rest-policy';

describe('UC-HR-01: Validering av Dygnsvila (Compliance)', () => {
  it('Scenario: Neka pass-tilldelning vid för kort vila', () => {
    // Given driver "FÖRARE-007" completed a shift at 22:00
    const lastShiftEndTime = new Date('2026-03-26T22:00:00Z');
    
    // When a request is made to assign shift starting at 06:00 (8h later)
    const proposedStartTime = new Date('2026-03-27T06:00:00Z');
    
    // Then the assignment should be REJECTED
    expect(() => DailyRestPolicy.evaluate(lastShiftEndTime, proposedStartTime)).toThrow(
      /Insufficient Daily Rest \(8.0h < 11h required\)/
    );
  });

  it('Scenario: Godkänn pass-tilldelning vid tillräcklig vila', () => {
    const lastShiftEndTime = new Date('2026-03-26T20:00:00Z');
    const proposedStartTime = new Date('2026-03-27T07:00:00Z'); // 11h exactly
    
    expect(DailyRestPolicy.evaluate(lastShiftEndTime, proposedStartTime)).toBe(true);
  });
});
