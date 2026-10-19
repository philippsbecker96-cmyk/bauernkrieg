import type { SupplyConfig } from '../data/balance';

/**
 * Gold, food and the day clock of a mission (milestone 4). Pure logic without
 * Phaser, so it can be tested with Vitest. Neither gold nor food ever becomes negative.
 */
export interface Supplies {
  gold: number;
  food: number;
}

export interface SupplyState extends Supplies {
  /** Current game day, starting at 1. */
  day: number;
  /** Seconds elapsed in the current day. */
  dayTime: number;
  /** Consecutive days whose food need could not be met in full (0 = supplied). */
  shortageDays: number;
}

/** Result of one day's food deduction. */
export interface DayReport {
  /** Day that has just ended. */
  day: number;
  /** Food needed by the army for that day. */
  needed: number;
  /** Food actually eaten (less than `needed` if the stores ran out). */
  eaten: number;
  /** Food left afterwards. */
  food: number;
}

/** `ok`: enough for `lowSupplyDays`; `low`: fewer days left; `shortage`: the army went hungry. */
export type SupplyLevel = 'ok' | 'low' | 'shortage';

export function createSupplyState(start: Supplies): SupplyState {
  return { gold: start.gold, food: start.food, day: 1, dayTime: 0, shortageDays: 0 };
}

/** Food the army eats per game day. */
export function dailyConsumption(armySize: number, config: SupplyConfig): number {
  return Math.max(0, armySize) * config.foodPerUnitPerDay;
}

/** For how many game days the food lasts for an army of this size (`Infinity` without consumption). */
export function supplyDays(food: number, armySize: number, config: SupplyConfig): number {
  const perDay = dailyConsumption(armySize, config);
  return perDay > 0 ? food / perDay : Infinity;
}

export function supplyLevel(state: SupplyState, armySize: number, config: SupplyConfig): SupplyLevel {
  if (state.shortageDays > 0) return 'shortage';
  return supplyDays(state.food, armySize, config) < config.lowSupplyDays ? 'low' : 'ok';
}

/** Seconds until the next food deduction. */
export function secondsUntilNextDay(state: SupplyState, config: SupplyConfig): number {
  return Math.max(0, config.secondsPerDay - state.dayTime);
}

/**
 * Advances the day clock by `dt` seconds. At the end of each day the army's
 * consumption is deducted once; if the stores do not suffice, the food drops to 0
 * and the shortage counter grows, otherwise it is reset.
 * Returns one report per completed day (usually none).
 */
export function stepSupply(state: SupplyState, armySize: number, dt: number, config: SupplyConfig): DayReport[] {
  const reports: DayReport[] = [];
  state.dayTime += dt;
  while (state.dayTime >= config.secondsPerDay) {
    state.dayTime -= config.secondsPerDay;
    const needed = dailyConsumption(armySize, config);
    const eaten = Math.min(needed, state.food);
    state.food -= eaten;
    state.shortageDays = eaten < needed ? state.shortageDays + 1 : 0;
    reports.push({ day: state.day, needed, eaten, food: state.food });
    state.day++;
  }
  return reports;
}

/**
 * Whether the stores still last `lowSupplyDays` for the army after `newcomers` join.
 * Recruitment stops otherwise (and always while the army is going hungry).
 */
export function canFeedNewcomers(
  state: SupplyState,
  armySize: number,
  newcomers: number,
  config: SupplyConfig,
): boolean {
  if (state.shortageDays > 0) return false;
  return supplyDays(state.food, armySize + newcomers, config) >= config.lowSupplyDays;
}

/**
 * How many newcomers the stores can take on: the largest number for which
 * `canFeedNewcomers` holds (0 while the army is going hungry).
 */
export function feedableNewcomers(state: SupplyState, armySize: number, config: SupplyConfig): number {
  if (state.shortageDays > 0) return 0;
  const foodPerUnit = config.foodPerUnitPerDay * config.lowSupplyDays;
  if (foodPerUnit <= 0) return Infinity;
  return Math.max(0, Math.floor(state.food / foodPerUnit) - armySize);
}

/** One lot of food for sale: `amount` food for `price` gold. */
export interface FoodOffer {
  amount: number;
  price: number;
}

export type PurchaseResult = 'ok' | 'notEnoughGold';

/** Buys one lot of food if the gold suffices. */
export function buyFood(state: SupplyState, offer: FoodOffer): PurchaseResult {
  if (state.gold < offer.price) return 'notEnoughGold';
  state.gold -= offer.price;
  state.food += offer.amount;
  return 'ok';
}

export function addSupplies(state: SupplyState, gain: Supplies): void {
  state.gold += Math.max(0, gain.gold);
  state.food += Math.max(0, gain.food);
}
