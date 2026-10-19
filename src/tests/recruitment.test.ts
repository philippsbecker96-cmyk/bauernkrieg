import { describe, expect, it } from 'vitest';
import { LANDSKNECHT, RECRUITMENT, SUPPLY, type LandsknechtConfig } from '../game/data/balance';
import { MINI_MISSION, type VillageDefinition } from '../game/data/missions';
import { MOVEMENT } from '../game/data/movement';
import { createUnit, type Unit } from '../game/entities/Unit';
import { applyLootSettlement, landsknechtShareRate, settleLoot } from '../game/systems/loot';
import {
  buildMissionTiles,
  checkHire,
  createMissionState,
  hireMercenary,
  landsknechtCount,
  mercenariesLeft,
  previewPostLoot,
  recruitAtVillage,
  settlePostLoot,
  siteCenter,
  volunteersLeft,
  volunteersOffered,
} from '../game/systems/mission';
import { buildWalkGrid } from '../game/systems/pathfinding';
import { createSupplyState } from '../game/systems/supply';

/** Fixed values, so the tests do not depend on the current balancing in `balance.ts`. */
const config: LandsknechtConfig = { typeIds: ['landsknecht'], lootShareWeight: 1.5, minimumClaimPerHead: 5 };

const mission = MINI_MISSION;
const tileSize = mission.map.tileSize;
const spacing = MOVEMENT.formationSpacing;
const village = mission.villages.find((v) => v.volunteers)!;
const tavern = mission.villages.find((v) => v.mercenaries)!;
const grid = buildWalkGrid(buildMissionTiles(mission));

/** `n` units of a type standing at a place. */
function at(place: VillageDefinition, n: number, typeId: 'peasant' | 'landsknecht' = 'peasant', firstId = 1): Unit[] {
  const c = siteCenter(place, tileSize);
  return Array.from({ length: n }, (_, i) => createUnit(firstId + i, typeId, c.x + (i % 3) * 8, c.y));
}

describe('Beuteabrechnung mit Landsknecht-Anteil', () => {
  it('ohne Landsknechte bekommt der Spieler die ganze Gold-Beute', () => {
    const s = settleLoot({ gold: 60, food: 20 }, 0, 12, 40, 0, config);
    expect(s).toMatchObject({ totalGold: 60, claim: 0, paidFromLoot: 0, playerShare: 60, food: 20, arrears: 0 });
  });

  it('Anteil nach Anteil an der Armee: 3 Landsknechte in einem Haufen von 15 erhalten 1,5 × 20 % = 30 %', () => {
    const s = settleLoot({ gold: 60, food: 20 }, 3, 15, 0, 0, config);
    expect(s.shareRate).toBeCloseTo(0.3);
    expect(s).toMatchObject({ lootShare: 18, minimumClaim: 15, claim: 18, paidFromLoot: 18, playerShare: 42, arrears: 0 });
    // Same 3 Landsknechte in a large army: a much smaller share.
    expect(settleLoot({ gold: 300, food: 0 }, 3, 80, 0, 0, config).lootShare).toBe(Math.floor(300 * (1.5 * 3) / 80));
  });

  it('mehr Landsknechte erhöhen zuverlässig ihren Gesamtanteil (übrige Armee unverändert)', () => {
    for (const others of [0, 1, 6, 13, 60]) {
      for (const gold of [0, 7, 20, 60, 250]) {
        let previousRate = 0;
        let previousPaid = 0;
        for (let n = 1; n <= 20; n++) {
          const s = settleLoot({ gold, food: 0 }, n, n + others, 0, 0, config);
          expect(s.shareRate).toBeGreaterThanOrEqual(previousRate);
          if (previousRate < 1) expect(s.shareRate).toBeGreaterThan(previousRate);
          expect(s.paidFromLoot).toBeGreaterThanOrEqual(previousPaid);
          previousRate = s.shareRate;
          previousPaid = s.paidFromLoot;
        }
      }
    }
  });

  it('mehr Freiwillige verdünnen den Landsknecht-Anteil', () => {
    expect(landsknechtShareRate(3, 10, config)).toBeGreaterThan(landsknechtShareRate(3, 20, config));
  });

  it('der Anspruch ist auf die vorhandene Beute begrenzt; Gold wird nie negativ', () => {
    for (let n = 0; n <= 20; n++) {
      for (const others of [0, 5, 40]) {
        for (const gold of [0, 3, 10, 60]) {
          for (const treasury of [0, 5, 100]) {
            const s = settleLoot({ gold, food: 0 }, n, n + others, treasury, 0, config);
            expect(s.shareRate).toBeLessThanOrEqual(1);
            expect(s.paidFromLoot).toBeLessThanOrEqual(gold);
            expect(s.paidFromLoot + s.playerShare).toBe(gold);
            expect(s.paidFromLoot + s.paidFromTreasury + s.arrears).toBe(s.claim);
            expect(s.playerShare).toBeGreaterThanOrEqual(0);
            expect(s.arrears).toBeGreaterThanOrEqual(0);
            const supply = createSupplyState({ gold: treasury, food: 0 });
            applyLootSettlement(supply, s);
            expect(supply.gold).toBeGreaterThanOrEqual(0);
            expect(supply.gold).toBe(treasury + s.playerShare - s.paidFromTreasury);
          }
        }
      }
    }
  });

  it('ein Haufen nur aus Landsknechten erhält höchstens die ganze Beute, nicht mehr', () => {
    // 200 gold: share rule 100 % = 200, minimum 20 × 5 = 100 – the whole pool, nothing from the treasury.
    const s = settleLoot({ gold: 200, food: 0 }, 20, 20, 50, 0, config);
    expect(s.shareRate).toBe(1);
    expect(s).toMatchObject({ claim: 200, paidFromLoot: 200, paidFromTreasury: 0, playerShare: 0, arrears: 0 });
    // An army size below the Landsknecht count is treated as the Landsknechte alone.
    expect(settleLoot({ gold: 200, food: 0 }, 20, 3, 50, 0, config)).toEqual(s);
  });

  it('Mindestanspruch: bei kleiner Beute zahlt erst die Beute, dann die Kasse, der Rest wird Rückstand', () => {
    // 3 Landsknechte of 15: 30 % of 20 gold = 6, but the minimum is 3 × 5 = 15.
    const fromLoot = settleLoot({ gold: 20, food: 0 }, 3, 15, 0, 0, config);
    expect(fromLoot).toMatchObject({ lootShare: 6, claim: 15, paidFromLoot: 15, playerShare: 5, arrears: 0 });
    // Only 4 gold of loot and 8 in the treasury: 4 + 8 paid, 3 owed.
    const short = settleLoot({ gold: 4, food: 0 }, 3, 15, 8, 0, config);
    expect(short).toMatchObject({ claim: 15, paidFromLoot: 4, paidFromTreasury: 8, playerShare: 0, arrears: 3 });
    const supply = createSupplyState({ gold: 8, food: 0 });
    applyLootSettlement(supply, short);
    expect(supply.gold).toBe(0);
  });

  it('ein offener Rückstand wird bei der nächsten Abrechnung zusätzlich fällig; ohne Landsknechte verfällt er', () => {
    const s = settleLoot({ gold: 60, food: 0 }, 3, 15, 0, 7, config);
    expect(s).toMatchObject({ previousArrears: 7, claim: 25, paidFromLoot: 25, playerShare: 35, arrears: 0 });
    const none = settleLoot({ gold: 60, food: 0 }, 0, 15, 0, 7, config);
    expect(none).toMatchObject({ previousArrears: 0, claim: 0, playerShare: 60, arrears: 0 });
  });

  it('Nahrung wird nicht geteilt', () => {
    const s = settleLoot({ gold: 60, food: 20 }, 10, 10, 0, 0, config);
    expect(s.food).toBe(20);
    const supply = createSupplyState({ gold: 0, food: 1 });
    applyLootSettlement(supply, s);
    expect(supply.food).toBe(21);
  });

  it('ist reproduzierbar: gleiche Eingaben ergeben dieselbe Abrechnung', () => {
    expect(settleLoot({ gold: 37, food: 5 }, 4, 11, 12, 3, config)).toEqual(
      settleLoot({ gold: 37, food: 5 }, 4, 11, 12, 3, config),
    );
  });
});

describe('Freiwillige nach Unterstützung', () => {
  const base: VillageDefinition = { ...village, volunteers: { typeId: 'peasant', max: 10 } };

  it('Zahl der Freiwilligen folgt der lokalen Unterstützung; unter der Schwelle niemand', () => {
    const min = RECRUITMENT.minSupportForVolunteers;
    expect(volunteersOffered({ ...base, support: min - 1 }, RECRUITMENT)).toBe(0);
    expect(volunteersOffered({ ...base, support: 60 }, RECRUITMENT)).toBe(6);
    expect(volunteersOffered({ ...base, support: 100 }, RECRUITMENT)).toBe(10);
    expect(volunteersOffered({ ...base, support: 150 }, RECRUITMENT)).toBe(10);
    expect(volunteersOffered({ ...base, support: undefined }, RECRUITMENT)).toBe(0);
    expect(volunteersOffered({ ...base, volunteers: undefined, support: 100 }, RECRUITMENT)).toBe(0);
  });

  it('höhere Unterstützung bringt nie weniger Freiwillige', () => {
    let previous = 0;
    for (let support = 0; support <= 100; support++) {
      const n = volunteersOffered({ ...base, support }, RECRUITMENT);
      expect(n).toBeGreaterThanOrEqual(previous);
      previous = n;
    }
  });

  it('Hohenweiler (Unterstützung 60) bietet in der Mini-Mission 6 Freiwillige', () => {
    expect(village.support).toBe(60);
    expect(volunteersLeft(createMissionState(mission), village)).toBe(6);
  });

  it('Freiwillige kosten kein Gold – auch ohne einen einzigen Gulden schließen sie sich an', () => {
    const state = createMissionState(mission);
    state.supply.gold = 0;
    state.supply.food = 100;
    const units = at(village, 2);
    const recruits = recruitAtVillage(state, village, units, grid, tileSize, spacing, SUPPLY);
    expect(recruits).toHaveLength(6);
    expect(state.supply.gold).toBe(0);
    expect(state.supply.food).toBe(100);
  });
});

describe('Landsknechte anwerben', () => {
  it('das Wirtshaus bietet Landsknechte gegen Gold an, das Dorf nicht', () => {
    expect(tavern.kind).toBe('tavern');
    expect(tavern.mercenaries).toMatchObject({ typeId: 'landsknecht' });
    expect(tavern.mercenaries!.fee).toBeGreaterThan(0);
    expect(tavern.volunteers).toBeUndefined();
    const state = createMissionState(mission);
    expect(mercenariesLeft(state, tavern)).toBe(tavern.mercenaries!.count);
    expect(checkHire(state, village, at(village, 1), tileSize, SUPPLY)).toBe('noMercenariesLeft');
  });

  it('erfordert Gold: ohne volle Anwerbegebühr kein Landsknecht', () => {
    const fee = tavern.mercenaries!.fee;
    const state = createMissionState(mission);
    const units = at(tavern, 2);
    state.supply.gold = fee - 1;
    expect(checkHire(state, tavern, units, tileSize, SUPPLY)).toBe('notEnoughGold');
    expect(hireMercenary(state, tavern, units, grid, tileSize, spacing, SUPPLY)).toBeNull();
    expect(state.supply.gold).toBe(fee - 1);
    expect(mercenariesLeft(state, tavern)).toBe(tavern.mercenaries!.count);

    state.supply.gold = fee;
    const unit = hireMercenary(state, tavern, units, grid, tileSize, spacing, SUPPLY);
    expect(unit).toMatchObject({ typeId: 'landsknecht', faction: 'player', id: 3 });
    expect(state.supply.gold).toBe(0);
    expect(mercenariesLeft(state, tavern)).toBe(tavern.mercenaries!.count - 1);
  });

  it('verlangt eigene Leute am Wirtshaus und ist begrenzt', () => {
    const state = createMissionState(mission);
    state.supply.gold = 1000;
    state.supply.food = 1000;
    expect(checkHire(state, tavern, at(village, 1), tileSize, SUPPLY)).toBe('noUnitNearby');
    const units = at(tavern, 1);
    for (let i = 0; i < tavern.mercenaries!.count; i++) {
      const unit = hireMercenary(state, tavern, units, grid, tileSize, spacing, SUPPLY);
      expect(unit).not.toBeNull();
      units.push(unit!);
    }
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
    expect(checkHire(state, tavern, units, tileSize, SUPPLY)).toBe('noMercenariesLeft');
    expect(state.supply.gold).toBe(1000 - tavern.mercenaries!.count * tavern.mercenaries!.fee);
  });

  it('auch Landsknechte müssen ernährt werden: bei knapper Nahrung keine Anwerbung', () => {
    const state = createMissionState(mission);
    state.supply.gold = 1000;
    state.supply.food = 4; // lasts 2 days for 2 people only
    const units = at(tavern, 2);
    expect(checkHire(state, tavern, units, tileSize, SUPPLY)).toBe('notEnoughFood');
    state.supply.food = 6;
    expect(checkHire(state, tavern, units, tileSize, SUPPLY)).toBe('ok');
  });
});

describe('Einnahme des Postens: Beute und Landsknecht-Anteil', () => {
  const post = mission.post;

  it('nur lebende Landsknechte des Spielers zählen', () => {
    const units = [...at(tavern, 3, 'landsknecht'), ...at(tavern, 2, 'peasant', 10)];
    units[0]!.hp = 0;
    units.push(createUnit(20, 'guard', 0, 0));
    expect(landsknechtCount(units, LANDSKNECHT)).toBe(2);
  });

  it('die Vorschau zeigt den Anteil jetzt und mit einem Landsknecht mehr', () => {
    const state = createMissionState(mission);
    const units = [...at(tavern, 2, 'landsknecht'), ...at(tavern, 8, 'peasant', 10)];
    const now = previewPostLoot(state, post, units, config);
    const more = previewPostLoot(state, post, units, config, 1);
    expect(now.landsknechte).toBe(2);
    expect(more.landsknechte).toBe(3);
    expect(more.armySize).toBe(11);
    expect(more.claim).toBeGreaterThan(now.claim);
    expect(more.playerShare).toBeLessThan(now.playerShare);
  });

  it('beim Sieg wird die Beute genau einmal aufgeteilt: Landsknechte erhalten ihren Anteil, der Rest geht an den Spieler', () => {
    const state = createMissionState(mission);
    const gold = state.supply.gold;
    const food = state.supply.food;
    const units = [...at(tavern, 2, 'landsknecht'), ...at(tavern, 4, 'peasant', 10)];
    state.outcome = 'victory';
    const s = settlePostLoot(state, post, units, config)!;
    expect(s).toMatchObject({ totalGold: post.loot.gold, landsknechte: 2, arrears: 0 });
    expect(s).toMatchObject({ armySize: 6, shareRate: 0.5 });
    expect(s.paidFromLoot).toBe(Math.floor(post.loot.gold * 0.5));
    expect(state.supply.gold).toBe(gold + post.loot.gold - s.paidFromLoot);
    expect(state.supply.food).toBe(food + post.loot.food);
    expect(state.lootSettlement).toBe(s);
    expect(settlePostLoot(state, post, units, config)).toBeNull();
    expect(state.supply.gold).toBe(gold + post.loot.gold - s.paidFromLoot);
  });

  it('kann der Mindestanspruch nicht gezahlt werden, bleibt ein Rückstand und Gold wird nicht negativ', () => {
    const state = createMissionState(mission);
    state.supply.gold = 0;
    const poorPost = { ...post, loot: { gold: 10, food: 0 } };
    state.outcome = 'victory';
    const s = settlePostLoot(state, poorPost, at(tavern, 3, 'landsknecht'), config)!;
    expect(s).toMatchObject({ claim: 15, paidFromLoot: 10, paidFromTreasury: 0, arrears: 5 });
    expect(state.supply.gold).toBe(0);
    expect(state.landsknechtArrears).toBe(5);
  });
});
