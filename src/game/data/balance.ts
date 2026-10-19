/**
 * Central balancing constants (IMPLEMENTATION_PLAN.md, section 4).
 * Milestone 4: time scale and food supply. Values are starting points for balancing.
 */
export interface SupplyConfig {
  /** Real-time seconds of one game day inside a mission. */
  secondsPerDay: number;
  /** Food each living player unit eats per game day; deducted once at the end of every day. */
  foodPerUnitPerDay: number;
  /**
   * Supplies are "low" when the food lasts fewer days than this for the current army.
   * Volunteers only join if the food still lasts at least this long for the enlarged army.
   */
  lowSupplyDays: number;
}

export const SUPPLY: SupplyConfig = {
  secondsPerDay: 60,
  foodPerUnitPerDay: 1,
  lowSupplyDays: 2,
};
