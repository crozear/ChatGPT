import { describe, expect, it } from 'vitest';
import { transferLewdToClothes, type EngineState } from './engine';

const baseTuning: EngineState['tuning'] = {
  wet: {
    arousalMultVag: 0,
    arousalMultPen: 0,
    vagForeignUnit: 0,
    anForeignUnit: 0,
    penForeignUnit: 0,
    maxSelfVag: 0,
    maxSelfPen: 0,
  },
  lewdBonus: { max: 0, step: 1 },
  dry: { bodyPerMin: 0, clothesPerMin: 0 },
  transfer: { m: 0, b: 25 },
  gate: { baseV: 0, baseA: 0, perInchDia: 0, wetStep: 15 },
  pain: { k: 0, base: 0, perInch: 0, depthV: 0 },
  orgasm: { resetBase: 0, resetPerWill: 1, willStunCutoff: 0 },
  encounter: { base: 0, allureMult: 0, cap: 0 },
};

const createState = (overrides: Partial<EngineState> = {}): EngineState => ({
  fluids: overrides.fluids ?? {
    vagina: { slime: 0, cum: 0 },
    penis: { slime: 0, cum: 0 },
    anus: { slime: 0, cum: 0 },
  },
  wet: overrides.wet ?? { vagina: 80, penis: 0, anus: 0 },
  clothing:
    overrides.clothing ?? [
      { slot: 'underwear', name: 'Silk Underwear', wetness: 90 },
      { slot: 'bottom', name: 'Denim Shorts', wetness: 0 },
    ],
  core:
    overrides.core ?? {
      awareness: 50,
      purity: 50,
      physique: 50,
      will: 50,
      beauty: 50,
      promiscuity: 50,
      exhibitionism: 50,
      deviancy: 50,
    },
  cond:
    overrides.cond ?? {
      pain: 0,
      arousal: 0,
      fatigue: 0,
      stress: 0,
      trauma: 0,
      control: 0,
      allure: 0,
    },
  minutesPerTurn: overrides.minutesPerTurn ?? 1,
  tuning: overrides.tuning ?? baseTuning,
});

describe('transferLewdToClothes', () => {
  it('caps underwear saturation at 100 and transfers overflow to the outer garment', () => {
    const state = createState({
      clothing: [
        { slot: 'underwear', name: 'Lace Panties', wetness: 90 },
        { slot: 'bottom', name: 'Leather Pants', wetness: 0 },
      ],
    });

    const result = transferLewdToClothes(state);

    const underwear = result.clothing[0];
    const bottom = result.clothing[1];

    expect(underwear.wetness).toBe(100);
    expect(bottom.wetness).toBe(15);
  });

  it('skips overflow when the outer garment is skirt-like', () => {
    const state = createState({
      clothing: [
        { slot: 'underwear', name: 'Sheer Thong', wetness: 90 },
        { slot: 'bottom', name: 'Pleated Skirt', wetness: 3 },
      ],
    });

    const result = transferLewdToClothes(state);

    const underwear = result.clothing[0];
    const skirt = result.clothing[1];

    expect(underwear.wetness).toBeGreaterThan(100);
    expect(skirt.wetness).toBe(3);
  });
});
