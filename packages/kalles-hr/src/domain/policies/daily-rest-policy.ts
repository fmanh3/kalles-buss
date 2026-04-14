export class DailyRestPolicy {
  private static readonly REQUIRED_REST_HOURS = 11;

  /**
   * Utvärderar om en förare har fått tillräcklig dygnsvila.
   * @param lastShiftEndTime Sluttid för föregående pass
   * @param proposedStartTime Starttid för föreslaget nytt pass
   * @throws Error om vilan är för kort
   */
  static evaluate(lastShiftEndTime: Date, proposedStartTime: Date): boolean {
    const restDurationMs = proposedStartTime.getTime() - lastShiftEndTime.getTime();
    const restDurationHours = restDurationMs / (1000 * 60 * 60);

    if (restDurationHours < this.REQUIRED_REST_HOURS) {
      throw new Error(`Insufficient Daily Rest (${restDurationHours.toFixed(1)}h < ${this.REQUIRED_REST_HOURS}h required)`);
    }

    return true;
  }
}
