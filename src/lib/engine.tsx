
// Lilith-5 Encounter Engine v0.7 (TypeScript)
// Drop-in helpers to keep the canvas small. No external deps.

export type Rank = 'F'|'D'|'C'|'B'|'A'|'S';

export interface FluidsCounter { slime: number; cum: number; }
export interface FluidsState {
  vagina: FluidsCounter;
  penis: FluidsCounter;
  anus: FluidsCounter;
}

export interface BodyWetness {
  vagina: number; // 0..120
  penis: number;  // 0..120
  anus: number;   // 0..120
}

export type SensitivityArea = 'chest'|'mouth'|'genital'|'ass';
export type SensitivityTier = 1|2|3|4;

export interface SensitivityMap {
  chest: SensitivityTier;
  mouth: SensitivityTier;
  genital: SensitivityTier;
  ass: SensitivityTier;
}

export type StimulusInput = number | {
  amount?: number;
  area?: SensitivityArea;
  areas?: Partial<Record<SensitivityArea, number>>;
};

export interface ClothingItem {
  slot: string;              // 'top'|'bottom'|'under_top'|'underwear'|'outfit'...
  name: string;
  integrity?: number;        // 0..200 (visual tiering only here)
  reveal?: number;           // 0..100
  wetness?: number;          // 0..200 (transparency >=100)
  visible?: boolean;
}

export interface TransferSegment { wet: number; minutesToDamp: number; minutesToSoaked: number; }

export interface TransferTuning {
  dampThreshold: number;
  soakedThreshold: number;
  segments: TransferSegment[];
}

export interface Tuning {
  wet: { arousalMultVag: number; arousalMultPen: number; vagForeignUnit: number; anForeignUnit: number; penForeignUnit: number; maxSelfVag: number; maxSelfPen: number; };
  lewdBonus: { max: number; step: number; };
  dry: { bodyPerMin: number; clothesPerMin: number; };
  transfer: TransferTuning;
  gate: { baseV: number; baseA: number; perInchDia: number; wetStep: number; };
  pain: { k: number; base: number; perInch: number; depthV: number; };
  orgasm: { resetBase: number; resetPerWill: number; willStunCutoff: number; };
  encounter: { base: number; allureMult: number; cap: number; };
}

export interface CoreStats { awareness: number; purity: number; physique: number; will: number; beauty: number; promiscuity: number; exhibitionism: number; deviancy: number; }

export interface Conditions {
  pain: number;
  arousal: number;
  fatigue: number;
  stress: number;
  trauma: number;
  control: number;
  allure: number;
  anxiety?: number;
}

export interface EngineState {
  fluids: FluidsState;
  wet: BodyWetness;
  clothing: ClothingItem[];
  core: CoreStats;
  cond: Conditions;
  minutesPerTurn: number;
  tuning: Tuning;
  sensitivity: SensitivityMap;
}

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

const sensitivityMultiplier: Record<SensitivityTier, number> = {
  1: 1,
  2: 1.5,
  3: 2,
  4: 2.5,
};

const applySensitivity = (value: number, area: SensitivityArea | undefined, map?: SensitivityMap) => {
  if (!area) return value;
  const tier = map?.[area] ?? 2;
  const mult = sensitivityMultiplier[tier as SensitivityTier] ?? 1;
  return value * mult;
};

export const resolveStimulus = (stim: StimulusInput, map?: SensitivityMap): number => {
  if (typeof stim === 'number') return stim;
  const { amount = 0, area, areas } = stim;
  let total = area ? applySensitivity(amount, area, map) : amount;
  if (areas) {
    for (const [key, val] of Object.entries(areas)) {
      if (typeof val !== 'number') continue;
      total += applySensitivity(val, key as SensitivityArea, map);
    }
  }
  return total;
};

export const rankFromPct = (pct: number): Rank => {
  if (pct >= 100) return 'S';
  if (pct >= 80)  return 'A';
  if (pct >= 60)  return 'B';
  if (pct >= 40)  return 'C';
  if (pct >= 20)  return 'D';
  return 'F';
};

export const rankMod = (r: Rank): number => ({F:-10,D:-5,C:0,B:5,A:10,S:15}[r]);

export const statMod = (val: number): number => Math.floor((val - 50) / 10); // -5..+5

export const stateMods = (cond: Conditions, kind: 'physical'|'social'|'resist'|'neutral'): number => {
  let m = 0;
  m += - Math.floor(cond.pain / 20);
  if (kind !== 'neutral') {
    if (kind === 'physical') m += - Math.floor(cond.fatigue / 25);
    if (kind === 'social' || kind === 'resist') m += - Math.floor(cond.stress / 25);
  }
  m += - Math.floor(cond.trauma / 25);
  return m;
};

export const encounterChance = (allure: number, t: Tuning) => clamp(t.encounter.base + t.encounter.allureMult * allure, 0, t.encounter.cap);

/** Update body wetness based on arousal gain, foreign fluids, and lewd bonus. */
export function tickBodyWetness(state: EngineState, prevArousal: number, encounterActive: boolean): EngineState {
  const s = structuredClone(state);
  const { fluids, wet, tuning, minutesPerTurn } = s;

  const arousalGain =  Math.max(0, s.cond.arousal - prevArousal);
  const selfV = clamp(Math.round(arousalGain * tuning.wet.arousalMultVag), 0, tuning.wet.maxSelfVag);
  const selfP = clamp(Math.round(arousalGain * tuning.wet.arousalMultPen), 0, tuning.wet.maxSelfPen);

  const foreignV = clamp(tuning.wet.vagForeignUnit * (fluids.vagina.slime + fluids.vagina.cum), 0, 120);
  const foreignA = clamp(tuning.wet.anForeignUnit * (fluids.anus.slime + fluids.anus.cum), 0, 120);
  const foreignP = clamp(tuning.wet.penForeignUnit * (fluids.penis.slime + fluids.penis.cum), 0, 120);

  const lewdBonus = encounterActive ? Math.min(tuning.lewdBonus.max, Math.floor(Math.max(s.core.promiscuity, s.core.deviancy) / tuning.lewdBonus.step)) : 0;
  const dryRate = tuning.dry.bodyPerMin * minutesPerTurn;

  s.wet.vagina = clamp(wet.vagina - dryRate + selfV + foreignV + lewdBonus, 0, 120);
  s.wet.penis  = clamp(wet.penis  - dryRate + selfP + foreignP + lewdBonus, 0, 120);
  s.wet.anus   = clamp(wet.anus   - dryRate +            foreignA + lewdBonus, 0, 120);

  return s;
}

/** Transfer lewdness from vagina wetness to clothing layers. */
export function transferLewdToClothes(state: EngineState): EngineState {
  const s = structuredClone(state);
  const { wet, clothing, tuning, minutesPerTurn } = s;

  const segments = [...tuning.transfer.segments].sort((a, b) => a.wet - b.wet);
  if (!segments.length || minutesPerTurn <= 0) return s;

  const minutesFor = (targetWet: number, key: 'minutesToDamp' | 'minutesToSoaked') => {
    const clampedWet = clamp(targetWet, segments[0].wet, segments[segments.length - 1].wet);
    let lower = segments[0];
    let upper = segments[segments.length - 1];
    for (let i = 0; i < segments.length - 1; i += 1) {
      const a = segments[i];
      const b = segments[i + 1];
      if (clampedWet >= a.wet && clampedWet <= b.wet) {
        lower = a;
        upper = b;
        break;
      }
    }
    if (lower === upper) return lower[key] <= 0 ? Number.POSITIVE_INFINITY : lower[key];
    const span = upper.wet - lower.wet || 1;
    const t = (clampedWet - lower.wet) / span;
    const minutes = lower[key] + (upper[key] - lower[key]) * t;
    return minutes <= 0 ? Number.POSITIVE_INFINITY : minutes;
  };

  const dampMinutes = minutesFor(wet.vagina, 'minutesToDamp');
  const soakedMinutes = Math.max(dampMinutes, minutesFor(wet.vagina, 'minutesToSoaked'));
  const dampRate = dampMinutes === Number.POSITIVE_INFINITY ? 0 : tuning.transfer.dampThreshold / dampMinutes;
  const soakRate = soakedMinutes === Number.POSITIVE_INFINITY || soakedMinutes === dampMinutes
    ? 0
    : (tuning.transfer.soakedThreshold - tuning.transfer.dampThreshold) / (soakedMinutes - dampMinutes);
  const tailRate = soakRate > 0 ? soakRate : dampRate;

  if (dampRate <= 0 && soakRate <= 0 && tailRate <= 0) return s;

  const leak = (current: number) => {
    let cur = current;
    let minutesRemaining = minutesPerTurn;

    const step = (target: number, rate: number) => {
      if (minutesRemaining <= 0 || rate <= 0 || cur >= target) return;
      const needed = target - cur;
      const required = needed / rate;
      if (required >= minutesRemaining) {
        cur += rate * minutesRemaining;
        minutesRemaining = 0;
      } else {
        cur = target;
        minutesRemaining -= required;
      }
    };

    step(tuning.transfer.dampThreshold, dampRate);
    step(tuning.transfer.soakedThreshold, soakRate);

    if (minutesRemaining > 0 && tailRate > 0) {
      cur += tailRate * minutesRemaining;
      minutesRemaining = 0;
    }

    return cur;
  };

  const findIndexBy = (slots: string[]) => clothing.findIndex(c => slots.includes(c.slot));
  const ui = findIndexBy(['underwear','under_bottom','under bottoms','under_bottoms']); // flexible
  const bi = findIndexBy(['bottom','bottoms','outfit']);

  const skirtLike = (name?: string) => !!name && /skirt|kilt/i.test(name);

  if (ui >= 0) {
    const updated = clamp(leak(clothing[ui].wetness || 0), 0, 200);
    if (updated > 100 && bi >= 0 && !skirtLike(clothing[bi].name)) {
      const overflow = updated - 100;
      clothing[ui].wetness = 100;
      clothing[bi].wetness = clamp((clothing[bi].wetness || 0) + overflow, 0, 200);
    } else {
      clothing[ui].wetness = updated;
    }
  } else if (bi >= 0) {
    clothing[bi].wetness = clamp(leak(clothing[bi].wetness || 0), 0, 200);
  }

  return s;
}

/** Dry all clothing by clothesPerMin * minutesPerTurn. */
export function dryClothes(state: EngineState): EngineState {
  const s = structuredClone(state);
  const dry = s.tuning.dry.clothesPerMin * s.minutesPerTurn;
  s.clothing = s.clothing.map(c => ({
    ...c,
    wetness: clamp(Math.round((c.wetness || 0) - dry), 0, 200)
  }));
  return s;
}

export interface GateParams {
  target: 'vagina'|'anus';
  penisLengthIn: number;
  penisDiaIn: number;
  vagDepthIn?: number;
  vagWidthIn?: number;
  wetness: number; // 0..120
  skillPct: number; // corresponding skill 0..100
  promiscuity: number;
  physique: number;
  conditions: Conditions;
  tuning: Tuning;
}

/** Compute penetration DC and pain payload for success/fail. */
export function penetrationGateDC(p: GateParams) {
  const wetFloorByRank = {F:0,D:15,C:30,B:45,A:60,S:75}[rankFromPct(p.skillPct)];
  const wetForBonus = Math.max(p.wetness, wetFloorByRank);
  const wetBonus = Math.floor(wetForBonus / p.tuning.gate.wetStep);

  const sizeDelta = Math.max(0, (p.penisDiaIn - (p.vagWidthIn || 0)));
  const depthPenalty = (p.target === 'vagina' && p.vagDepthIn && p.penisLengthIn > p.vagDepthIn)
    ? 1 + Math.floor((p.penisLengthIn - p.vagDepthIn) / 2)
    : 0;

  const base = p.target === 'anus' ? p.tuning.gate.baseA : p.tuning.gate.baseV;
  const dc = base + Math.ceil(sizeDelta * p.tuning.gate.perInchDia) + depthPenalty - wetBonus;

  const k = p.tuning.pain.k;
  const basePain = p.tuning.pain.base + p.tuning.pain.perInch * sizeDelta + (p.target === 'vagina' ? p.tuning.pain.depthV * depthPenalty : 0);
  const painFactor = Math.exp(-k * p.wetness);
  const painOnFail = Math.ceil(basePain * painFactor) + 3;
  const painOnSuccess = Math.max(1, Math.round((basePain * painFactor) / 2));

  const skillRank = rankFromPct(p.skillPct);
  const totalMod = rankMod(skillRank) + statMod(Math.max(p.promiscuity, p.physique)) + stateMods(p.conditions, 'physical');

  return { dc, wetBonus, sizeDelta, depthPenalty, basePain, painOnFail, painOnSuccess, totalMod, skillRank };
}

/** Orgasm update given stimulation for this tick. */
export function applyStimulation(arousal: number, will: number, stim: StimulusInput, t: Tuning, sensitivity?: SensitivityMap) {
  const scaled = Math.round(resolveStimulus(stim, sensitivity));
  let a = clamp(arousal + scaled, 0, 120);
  let stunnedTurns = 0;
  if (a >= 100) {
    a = t.orgasm.resetBase + Math.floor(will / t.orgasm.resetPerWill);
    stunnedTurns = (will >= t.orgasm.willStunCutoff) ? 0.5 : 1;
  }
  return { arousal: clamp(a, 0, 120), stunnedTurns };
}

/** One-pass clothes transparency to drive visibility logic. */
export const isTransparent = (w?: number) => (w || 0) >= 100;
