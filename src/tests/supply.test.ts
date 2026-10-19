import { describe, expect, it } from 'vitest';
import { LANDSKNECHT, RECRUITMENT, SUPPLY, type SupplyConfig } from '../game/data/balance';
import { MINI_MISSION, type VillageDefinition } from '../game/data/missions';
import { MOVEMENT } from '../game/data/movement';
import { createUnit, type Unit } from '../game/entities/Unit';
import {
  armySize,
  buildMissionTiles,
  buyFoodAtVillage,
  checkFoodPurchase,
  checkRecruit,
  createMissionState,
  recruitableNow,
  recruitAtVillage,
  settlePostLoot,
  siteCenter,
  volunteersLeft,
  volunteersOffered,
} from '../game/systems/mission';
import { buildWalkGrid } from '../game/systems/pathfinding';
import {
  buyFood,
  canFeedNewcomers,
  createSupplyState,
  dailyConsumption,
  feedableNewcomers,
  secondsUntilNextDay,
  stepSupply,
  supplyDays,
  supplyLevel,
} from '../game/systems/supply';

const config: SupplyConfig = { secondsPerDay: 60, foodPerUnitPerDay: 1, lowSupplyDays: 2 };
const mission = MINI_MISSION;
const tileSize = mission.map.tileSize;
const village: VillageDefinition = mission.villages[0]!;
const market = village.foodMarket!;

/** Runs the day clock in 1/30 s steps, like the mission scene. */
function run(state: ReturnType<typeof createSupplyState>, army: number, seconds: number, cfg = config) {
  const reports = [];
  const dt = 1 / 30;
  for (let t = 0; t < seconds - 1e-9; t += dt) reports.push(...stepSupply(state, army, dt, cfg));
  return reports;
}

describe('Zeitmaßstab und Konstanten', () => {
  it('Startwerte laut Design-Dokument: 1 Spieltag = 60 s, Abzug einmal pro Tag', () => {
    expect(SUPPLY.secondsPerDay).toBe(60);
    expect(SUPPLY.foodPerUnitPerDay).toBeGreaterThan(0);
  });
});

describe('Nahrungsverbrauch', () => {
  it('Verbrauch pro Tag = Armeegröße × Verbrauch pro Einheit', () => {
    expect(dailyConsumption(6, config)).toBe(6);
    expect(dailyConsumption(12, { ...config, foodPerUnitPerDay: 2 })).toBe(24);
    expect(dailyConsumption(0, config)).toBe(0);
  });

  it('zieht erst am Ende des Spieltags und dann genau einmal ab', () => {
    const state = createSupplyState({ gold: 0, food: 18 });
    expect(run(state, 6, 59)).toEqual([]);
    expect(state.food).toBe(18);
    expect(secondsUntilNextDay(state, config)).toBeCloseTo(1, 1);
    const reports = run(state, 6, 2);
    expect(reports).toEqual([{ day: 1, needed: 6, eaten: 6, food: 12 }]);
    expect(state.day).toBe(2);
    // Nothing more during the rest of day 2.
    expect(run(state, 6, 50)).toEqual([]);
    expect(state.food).toBe(12);
  });

  it('nach drei Spieltagen ist der Verbrauch dreier Tage abgezogen', () => {
    const state = createSupplyState({ gold: 0, food: 30 });
    const reports = run(state, 5, 180 + 0.5);
    expect(reports.map((r) => r.day)).toEqual([1, 2, 3]);
    expect(state.food).toBe(15);
    expect(state.day).toBe(4);
  });

  it('ein großer Zeitschritt rechnet jeden vergangenen Tag einzeln ab', () => {
    const state = createSupplyState({ gold: 0, food: 20 });
    expect(stepSupply(state, 4, 125, config)).toHaveLength(2);
    expect(state.food).toBe(12);
    expect(state.dayTime).toBeCloseTo(5);
  });

  it('der Zeitmaßstab ist konfigurierbar', () => {
    const state = createSupplyState({ gold: 0, food: 10 });
    expect(run(state, 2, 31, { ...config, secondsPerDay: 30 })).toHaveLength(1);
    expect(state.food).toBe(8);
  });

  it('bei Mangel wird die Nahrung nie negativ und der Hunger gezählt', () => {
    const state = createSupplyState({ gold: 0, food: 4 });
    expect(stepSupply(state, 6, 60, config)).toEqual([{ day: 1, needed: 6, eaten: 4, food: 0 }]);
    expect(state.food).toBe(0);
    expect(state.shortageDays).toBe(1);
    stepSupply(state, 6, 60, config);
    expect(state.food).toBe(0);
    expect(state.shortageDays).toBe(2);
    // A fully supplied day ends the shortage.
    state.food = 10;
    stepSupply(state, 6, 60, config);
    expect(state.shortageDays).toBe(0);
    expect(state.food).toBe(4);
  });
});

describe('Versorgungstage und Warnstufen', () => {
  it('Nahrung reicht für Vorrat / Tagesverbrauch Tage', () => {
    expect(supplyDays(18, 6, config)).toBe(3);
    expect(supplyDays(18, 12, config)).toBe(1.5);
    expect(supplyDays(5, 0, config)).toBe(Infinity);
  });

  it('knapp unter lowSupplyDays, Mangel nach einem Hungertag', () => {
    const state = createSupplyState({ gold: 0, food: 12 });
    expect(supplyLevel(state, 6, config)).toBe('ok');
    expect(supplyLevel(state, 7, config)).toBe('low');
    state.shortageDays = 1;
    expect(supplyLevel(state, 1, config)).toBe('shortage');
  });
});

describe('Nahrung kaufen', () => {
  it('kostet Gold; ohne genug Gold wird nichts gekauft, Gold bleibt nicht negativ', () => {
    const state = createSupplyState({ gold: 15, food: 0 });
    expect(buyFood(state, { amount: 10, price: 10 })).toBe('ok');
    expect(state).toMatchObject({ gold: 5, food: 10 });
    expect(buyFood(state, { amount: 10, price: 10 })).toBe('notEnoughGold');
    expect(state).toMatchObject({ gold: 5, food: 10 });
  });

  it('im Dorf nur mit eigenen Leuten vor Ort und solange der Vorrat reicht', () => {
    const state = createMissionState(mission);
    const centre = siteCenter(village, tileSize);
    const far = [createUnit(1, 'peasant', centre.x + village.recruitRadius + 30, centre.y)];
    expect(checkFoodPurchase(state, village, far, tileSize)).toBe('noUnitNearby');
    expect(buyFoodAtVillage(state, village, far, tileSize)).toBe(0);
    expect(state.supply.gold).toBe(mission.startSupplies.gold);

    const near = [createUnit(1, 'peasant', centre.x, centre.y)];
    const lots = Math.ceil(market.stock / market.amount);
    state.supply.gold = market.price * (lots + 1);
    for (let i = 0; i < lots; i++) expect(buyFoodAtVillage(state, village, near, tileSize)).toBeGreaterThan(0);
    expect(state.supply.food).toBe(mission.startSupplies.food + market.stock);
    expect(state.supply.gold).toBe(market.price);
    expect(checkFoodPurchase(state, village, near, tileSize)).toBe('soldOut');
    expect(buyFoodAtVillage(state, village, near, tileSize)).toBe(0);
    expect(state.supply.gold).toBe(market.price);
  });

  it('mit zu wenig Gold wird im Dorf nichts gekauft', () => {
    const state = createMissionState(mission);
    state.supply.gold = market.price - 1;
    const centre = siteCenter(village, tileSize);
    const near = [createUnit(1, 'peasant', centre.x, centre.y)];
    expect(checkFoodPurchase(state, village, near, tileSize)).toBe('notEnoughGold');
    expect(buyFoodAtVillage(state, village, near, tileSize)).toBe(0);
    expect(state.supply).toMatchObject({ gold: market.price - 1, food: mission.startSupplies.food });
  });
});

describe('Rekrutierungsstopp bei Nahrungsknappheit', () => {
  const grid = buildWalkGrid(buildMissionTiles(mission));
  const centre = siteCenter(village, tileSize);
  const army = (n: number): Unit[] =>
    Array.from({ length: n }, (_, i) => createUnit(i + 1, 'peasant', centre.x + (i % 3) * 8, centre.y));
  const startArmySize = mission.startArmy.reduce((sum, group) => sum + group.count, 0);

  it('neue Leute nur, wenn die Nahrung danach noch lowSupplyDays reicht', () => {
    const state = createSupplyState({ gold: 0, food: 24 });
    expect(canFeedNewcomers(state, 6, 6, config)).toBe(true); // 24 / 12 = 2 days
    state.food = 23;
    expect(canFeedNewcomers(state, 6, 6, config)).toBe(false);
    state.food = 100;
    state.shortageDays = 1;
    expect(canFeedNewcomers(state, 6, 6, config)).toBe(false);
  });

  it('feedableNewcomers ist die größte Zahl, für die canFeedNewcomers gilt', () => {
    for (const food of [0, 11, 12, 13, 18, 24, 25]) {
      const state = createSupplyState({ gold: 0, food });
      const n = feedableNewcomers(state, 6, config);
      if (n > 0) expect(canFeedNewcomers(state, 6, n, config)).toBe(true);
      expect(canFeedNewcomers(state, 6, n + 1, config)).toBe(false);
    }
    const hungry = createSupplyState({ gold: 0, food: 100 });
    hungry.shortageDays = 1;
    expect(feedableNewcomers(hungry, 6, config)).toBe(0);
  });

  it('mit dem Startvorrat schließen sich nur so viele an, wie die Nahrung trägt; der Rest bleibt im Dorf', () => {
    const state = createMissionState(mission);
    const units = army(startArmySize);
    // 21 food last 2 days for 10 people (7 at the start): 3 of the 6 volunteers.
    expect(recruitableNow(state, village, units, SUPPLY)).toBe(3);
    const first = recruitAtVillage(state, village, units, grid, tileSize, MOVEMENT.formationSpacing, SUPPLY);
    expect(first).toHaveLength(3);
    units.push(...first);
    expect(volunteersLeft(state, village)).toBe(3);
    expect(checkRecruit(state, village, units, tileSize, SUPPLY)).toBe('notEnoughFood');
    expect(recruitAtVillage(state, village, units, grid, tileSize, MOVEMENT.formationSpacing, SUPPLY)).toEqual([]);

    // After buying food the remaining volunteers can follow – ids stay unique.
    buyFoodAtVillage(state, village, units, tileSize);
    const rest = recruitAtVillage(state, village, units, grid, tileSize, MOVEMENT.formationSpacing, SUPPLY);
    expect(rest).toHaveLength(3);
    units.push(...rest);
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
    expect(armySize(units)).toBe(startArmySize + volunteersOffered(village, RECRUITMENT));
    expect(checkRecruit(state, village, units, tileSize, SUPPLY)).toBe('noVolunteersLeft');
  });

  it('einzeln rekrutieren: maxCount = 1 holt genau eine Person', () => {
    const state = createMissionState(mission);
    const units = army(startArmySize);
    const one = recruitAtVillage(state, village, units, grid, tileSize, MOVEMENT.formationSpacing, SUPPLY, 1);
    expect(one).toHaveLength(1);
    expect(volunteersLeft(state, village)).toBe(volunteersOffered(village, RECRUITMENT) - 1);
  });

  it('bei Hunger schließt sich niemand an', () => {
    const state = createMissionState(mission);
    state.supply.shortageDays = 1;
    state.supply.food = 1000;
    const units = army(2);
    expect(checkRecruit(state, village, units, tileSize, SUPPLY)).toBe('notEnoughFood');
    expect(recruitAtVillage(state, village, units, grid, tileSize, MOVEMENT.formationSpacing, SUPPLY)).toEqual([]);
    expect(volunteersLeft(state, village)).toBe(volunteersOffered(village, RECRUITMENT));
  });

  it('die Armee wächst bei Knappheit nicht weiter, auch mit Gold nicht über den Dorfvorrat hinaus', () => {
    // Even with unlimited gold the village only sells its stock: the army cannot grow without limit.
    const state = createMissionState(mission);
    state.supply.gold = 10_000;
    const units = army(40);
    while (buyFoodAtVillage(state, village, units, tileSize) > 0);
    expect(checkRecruit(state, village, units, tileSize, SUPPLY)).toBe('notEnoughFood');
  });
});

describe('Beute des Postens', () => {
  it('wird nur nach einem Sieg und genau einmal gutgeschrieben (ohne Landsknechte ganz an den Spieler)', () => {
    const state = createMissionState(mission);
    const units = [createUnit(1, 'peasant', 0, 0), createUnit(2, 'crossbowman', 0, 0)];
    expect(settlePostLoot(state, mission.post, units, LANDSKNECHT)).toBeNull();
    state.outcome = 'victory';
    expect(settlePostLoot(state, mission.post, units, LANDSKNECHT)).not.toBeNull();
    expect(settlePostLoot(state, mission.post, units, LANDSKNECHT)).toBeNull();
    expect(state.supply.gold).toBe(mission.startSupplies.gold + mission.post.loot.gold);
    expect(state.supply.food).toBe(mission.startSupplies.food + mission.post.loot.food);
  });
});
