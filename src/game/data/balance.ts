import type { UnitTypeId } from './units';

/**
 * Central balancing constants (IMPLEMENTATION_PLAN.md, section 4).
 * Milestone 4: time scale and food supply; milestone 5: recruitment and the
 * Landsknecht economy. Values are starting points for balancing.
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

/** Recruitment of free volunteers (milestone 5, GDD 7.1). Volunteers never cost gold. */
export interface RecruitmentConfig {
  /** Places with lower local support (0–100) offer no volunteers at all. */
  minSupportForVolunteers: number;
}

export const RECRUITMENT: RecruitmentConfig = {
  minSupportForVolunteers: 30,
};

/**
 * Landsknecht economy (milestone 5, GDD 7.4): hire fees are set per place in the
 * mission data; the loot rules are the same everywhere.
 */
export interface LandsknechtConfig {
  /** Unit types that are paid mercenaries and claim a share of the gold loot. */
  typeIds: readonly UnitTypeId[];
  /**
   * Weight of the Landsknechte's share of the army in the loot (GDD 7.4): they claim
   * `lootShareWeight × Landsknechte / army size` of the gold loot, at most the whole pool.
   * 1.5: 3 Landsknechte in an army of 15 claim 30 %.
   */
  lootShareWeight: number;
  /**
   * Minimum claim (gold) per living Landsknecht and loot settlement (decision 2026-10-19):
   * paid from the loot first, then from the treasury; what cannot be paid becomes arrears.
   */
  minimumClaimPerHead: number;
}

export const LANDSKNECHT: LandsknechtConfig = {
  typeIds: ['landsknecht'],
  lootShareWeight: 1.5,
  minimumClaimPerHead: 5,
};
