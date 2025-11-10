import { describe, expect, it } from 'vitest';
import { applyStimulation, transferLewdToClothes, type EngineState, type SensitivityMap } from './engine';

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
  sensitivity: overrides.sensitivity ?? { chest: 2, mouth: 2, genital: 2, ass: 2 },
});

const baseSensitivity: SensitivityMap = { chest: 2, mouth: 2, genital: 2, ass: 2 };

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

describe('applyStimulation', () => {
  it('scales chest stimulation by tier differences', () => {
    const tender = { ...baseSensitivity, chest: 3 };
    const sensitive = { ...baseSensitivity, chest: 4 };
    const prev = 20;
    const will = 60;

    const tenderResult = applyStimulation(prev, will, { amount: 10, area: 'chest' }, baseTuning, tender);
    const sensitiveResult = applyStimulation(prev, will, { amount: 10, area: 'chest' }, baseTuning, sensitive);

    expect(sensitiveResult.arousal).toBeGreaterThan(tenderResult.arousal);
  });

  it('uses mouth tier scaling independently from genital sensitivity', () => {
    const tender = { ...baseSensitivity, mouth: 3 };
    const sensitive = { ...baseSensitivity, mouth: 4 };
    const prev = 15;
    const will = 55;

    const tenderResult = applyStimulation(prev, will, { amount: 8, area: 'mouth' }, baseTuning, tender);
    const sensitiveResult = applyStimulation(prev, will, { amount: 8, area: 'mouth' }, baseTuning, sensitive);

    expect(sensitiveResult.arousal).toBeGreaterThan(tenderResult.arousal);
  });
});
