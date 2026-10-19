import type { LandsknechtConfig } from '../data/balance';
import type { Supplies, SupplyState } from './supply';

/**
 * Loot settlement with the Landsknecht share (milestone 5, GDD 7.4). Pure logic
 * without Phaser, so it can be tested with Vitest. Used when a place is taken;
 * plundering villages (milestone 6) uses the same settlement.
 *
 * Rules:
 * - The Landsknechte claim `lootShareWeight × their share of the army` of the gold loot, at most
 *   the whole pool. With the rest of the army unchanged, more Landsknechte always mean a larger
 *   (never smaller) total share; more volunteers dilute it.
 * - Each settlement also guarantees a minimum claim per Landsknecht (`minimumClaimPerHead`).
 *   Arrears from earlier settlements are due as well.
 * - The claim is paid from the loot first, then from the treasury. What cannot be paid
 *   becomes arrears; gold never becomes negative.
 * - Food (and later equipment) is not shared.
 */
export interface LootSettlement {
  /** Gold of the loot pool. */
  totalGold: number;
  /** Food of the loot; goes to the player in full. */
  food: number;
  /** Living Landsknechte taking part in the settlement. */
  landsknechte: number;
  /** Living units of the whole army (Landsknechte included). */
  armySize: number;
  /** Share of the gold loot claimed by the Landsknechte (0..1). */
  shareRate: number;
  /** Landsknecht share by the share rule: `totalGold × shareRate`, rounded down. */
  lootShare: number;
  /** Guaranteed minimum for this settlement: Landsknechte × minimum per head. */
  minimumClaim: number;
  /** Arrears from earlier settlements that are due as well. */
  previousArrears: number;
  /** Total due: max(lootShare, minimumClaim) + previousArrears (0 without Landsknechte). */
  claim: number;
  paidFromLoot: number;
  paidFromTreasury: number;
  /** Gold of the loot the player keeps. */
  playerShare: number;
  /** Part of the claim that could not be paid (0 = paid in full). */
  arrears: number;
}

/** Share of a gold loot pool the Landsknechte claim (0..1), from their share of the army. */
export function landsknechtShareRate(landsknechte: number, armySize: number, config: LandsknechtConfig): number {
  const count = Math.max(0, landsknechte);
  if (count === 0) return 0;
  return Math.min(1, (config.lootShareWeight * count) / Math.max(count, armySize));
}

/**
 * Splits a loot pool between the Landsknechte and the player. `armySize` counts all living
 * units including the Landsknechte (never fewer than them). `treasury` is the
 * gold the player holds before the settlement. Without living Landsknechte nobody
 * claims anything, and earlier arrears lapse.
 */
export function settleLoot(
  loot: Supplies,
  landsknechte: number,
  armySize: number,
  treasury: number,
  previousArrears: number,
  config: LandsknechtConfig,
): LootSettlement {
  const totalGold = Math.max(0, Math.floor(loot.gold));
  const count = Math.max(0, Math.floor(landsknechte));
  const army = Math.max(count, Math.floor(armySize));
  const shareRate = landsknechtShareRate(count, army, config);
  const lootShare = Math.floor(totalGold * shareRate);
  const minimumClaim = count * config.minimumClaimPerHead;
  const dueArrears = count > 0 ? Math.max(0, previousArrears) : 0;
  const claim = count > 0 ? Math.max(lootShare, minimumClaim) + dueArrears : 0;
  const paidFromLoot = Math.min(totalGold, claim);
  const paidFromTreasury = Math.min(Math.max(0, treasury), claim - paidFromLoot);
  return {
    totalGold,
    food: Math.max(0, loot.food),
    landsknechte: count,
    armySize: army,
    shareRate,
    lootShare,
    minimumClaim,
    previousArrears: dueArrears,
    claim,
    paidFromLoot,
    paidFromTreasury,
    playerShare: totalGold - paidFromLoot,
    arrears: claim - paidFromLoot - paidFromTreasury,
  };
}

/** Credits the player's share and the food, and pays the treasury part of the claim. */
export function applyLootSettlement(supply: SupplyState, settlement: LootSettlement): void {
  supply.gold = Math.max(0, supply.gold + settlement.playerShare - settlement.paidFromTreasury);
  supply.food += settlement.food;
}
