// encounter.ts (src/lib/encounter.ts)
// Minimal DoL-inspired encounter loop built on top of Lilith-5 engine primitives.
// Keeps state small: conditions + position + insertion + (optional) clothing exposure/damage.
// No external deps.

import {
  applyStimulation,
  clamp,
  encounterChance,
  penetrationGateDC,
  rankFromPct,
  rankMod,
  statMod,
  stateMods,
  tickBodyWetness,
  transferLewdToClothes,
  dryClothes,
  type EngineState,
  type Conditions,
  type StimulusInput,
} from "./engine";

export type Position = "neutral" | "pinned" | "on_top";

export type InsertionTarget = "vagina" | "anus";
export interface InsertionState {
  by: "enemy" | "self";
  target: InsertionTarget;
  depthIn: number;     // how deep (inches)
  diaIn: number;       // diameter (inches)
}

export interface EnemyProfile {
  dickLengthIn: number;
  dickDiaIn: number;
  aggression: number;     // 0..100
  skillPct: number;       // 0..100
  name?: string;
}

export interface EncounterState {
  active: boolean;
  turn: number;
  position: Position;
  stunnedTurns: number;     // 0, 0.5, 1, 1.5...
  insertion: InsertionState | null;
  enemy: EnemyProfile;
  rngSeed: number;
  log: string[];            // short, mechanical log lines (UI can also use global log)
  lastActionId?: string;
}

export interface ActionDef {
  id: string;
  label: string;
  help: string;
  req?: (s: EngineState, e: EncounterState, ctx: ResolveContext) => boolean;
}

export interface ResolveContext {
  // Player body
  hasVagina: boolean;
  hasPenis: boolean;
  vagDepthIn: number;
  vagWidthIn: number;

  playerPenisLengthIn: number;
  playerPenisDiaIn: number;

  // For checks / narration labels
  skillName: string;
  skillPct: number;

  // Used for wetness drying model
  timeSinceArousal: number;
}

export interface TurnResult {
  engine: EngineState;
  encounter: EncounterState;
  lines: string[];
  timeSinceArousal: number;
}

export const defaultEncounter = (): EncounterState => ({
  active: false,
  turn: 0,
  position: "neutral",
  stunnedTurns: 0,
  insertion: null,
  enemy: {
    dickLengthIn: 7,
    dickDiaIn: 1.5,
    aggression: 60,
    skillPct: 55,
    name: "Opponent",
  },
  rngSeed: 1337,
  log: [],
  lastActionId: "struggle",
});

const clampCond = (c: Conditions): Conditions => ({
  pain: clamp(Math.round(c.pain), 0, 200),
  arousal: clamp(Math.round(c.arousal), 0, 120),
  fatigue: clamp(Math.round(c.fatigue), 0, 100),
  stress: clamp(Math.round(c.stress), 0, 100),
  trauma: clamp(Math.round(c.trauma), 0, 100),
  control: clamp(Math.round(c.control), 0, 100),
  allure: clamp(Math.round(c.allure), 0, 100),
});

const lcg = (seed: number) => {
  // Numerical Recipes LCG
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return next;
};

const rollD20 = (e: EncounterState) => {
  const seed = lcg(e.rngSeed);
  const d20 = 1 + (seed % 20);
  return { d20, nextSeed: seed };
};

const check = (
  s: EngineState,
  e: EncounterState,
  dcBase: number,
  ctx: ResolveContext,
  kind: "physical" | "social" | "resist" = "physical"
) => {
  const { d20, nextSeed } = rollD20(e);
  const r = rankFromPct(ctx.skillPct);
  const core = s.core;
  const corePick = kind === "social"
    ? Math.max(core.beauty, core.promiscuity)
    : kind === "resist"
      ? Math.max(core.will, core.physique)
      : Math.max(core.physique, core.promiscuity);

  const mod = rankMod(r) + statMod(corePick) + stateMods(s.cond, kind);
  const total = d20 + mod;
  const ok = total >= dcBase;
  return { ok, d20, mod, total, dc: dcBase, nextSeed, rank: r };
};

const exposeSlot = (s: EngineState, slot: string, revealBoost: number) => {
  const next = structuredClone(s);
  next.clothing = next.clothing.map((c) => {
    if (c.slot !== slot) return c;
    const reveal = clamp((c.reveal ?? 0) + revealBoost, 0, 100);
    return { ...c, visible: true, reveal };
  });
  return next;
};

const damageSlot = (s: EngineState, slot: string, integrityLoss: number, revealBoost: number) => {
  const next = structuredClone(s);
  next.clothing = next.clothing.map((c) => {
    if (c.slot !== slot) return c;
    const integrity = clamp((c.integrity ?? 100) - integrityLoss, 0, 200);
    const reveal = clamp((c.reveal ?? 0) + revealBoost, 0, 100);
    return { ...c, visible: true, integrity, reveal };
  });
  return next;
};

const hasSlot = (s: EngineState, slot: string) => s.clothing.some((c) => c.slot === slot);

const condDelta = (s: EngineState, d: Partial<Conditions>) => {
  const next = structuredClone(s);
  next.cond = clampCond({ ...next.cond, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, (next.cond as any)[k] + (v as number)])) } as any);
  return next;
};

const applyStim = (s: EngineState, e: EncounterState, stim: StimulusInput) => {
  const prevA = s.cond.arousal;
  const r = applyStimulation(prevA, s.core.will, stim, s.tuning, s.sensitivity);
  const next = structuredClone(s);
  next.cond = clampCond({ ...next.cond, arousal: r.arousal });
  const e2 = structuredClone(e);
  if (r.stunnedTurns) e2.stunnedTurns = Math.max(e2.stunnedTurns, r.stunnedTurns);
  return { engine: next, encounter: e2, prevArousal: prevA };
};

const normalizePositionFromControl = (e: EncounterState, control: number): EncounterState => {
  // Optional helper: if you want position to "snap" when control swings hard.
  // Keep it gentle so explicit position changes still matter.
  const next = structuredClone(e);
  if (next.position === "neutral") {
    if (control <= 25) next.position = "pinned";
    if (control >= 75) next.position = "on_top";
  }
  return next;
};

export const ACTIONS: ActionDef[] = [
  {
    id: "struggle",
    label: "Struggle",
    help: "Trade fatigue/stress for control; best when pinned.",
    req: (s, e) => e.active,
  },
  {
    id: "brace",
    label: "Brace",
    help: "Slow the enemy’s progress; reduces incoming control loss.",
    req: (s, e) => e.active,
  },
  {
    id: "expose_underwear",
    label: "Expose underwear",
    help: "Pulls clothing aside (visibility/allure implications).",
    req: (s, e) => e.active && hasSlot(s, "underwear"),
  },
  {
    id: "tear_underwear",
    label: "Tear underwear",
    help: "Damages underwear for more exposure; costs control if pinned.",
    req: (s, e) => e.active && hasSlot(s, "underwear"),
  },
  {
    id: "attempt_v",
    label: "Enemy: Attempt vaginal insertion",
    help: "Forces a penetration gate check (vagina).",
    req: (s, e, ctx) => e.active && ctx.hasVagina && !e.insertion,
  },
  {
    id: "attempt_a",
    label: "Enemy: Attempt anal insertion",
    help: "Forces a penetration gate check (anus).",
    req: (s, e) => e.active && !e.insertion,
  },
  {
    id: "thrust",
    label: "Enemy: Thrust",
    help: "If inserted, increases arousal and wetness; can raise pain.",
    req: (s, e) => e.active && !!e.insertion,
  },
  {
    id: "reset_position",
    label: "Reset to neutral",
    help: "Breaks away to a neutral position (harder when pinned).",
    req: (s, e) => e.active,
  },
];

export const getAvailableActions = (s: EngineState, e: EncounterState, ctx: ResolveContext): ActionDef[] => {
  if (!e.active) return [];
  return ACTIONS.filter(a => (a.req ? a.req(s, e, ctx) : true));
};

export const startEncounter = (s: EngineState, e?: EncounterState): { encounter: EncounterState; lines: string[] } => {
  const base = e ? structuredClone(e) : defaultEncounter();
  const chance = encounterChance(s.cond.allure, s.tuning);
  const next = { ...base, active: true, turn: 0, stunnedTurns: 0, insertion: null, log: [], rngSeed: (Date.now() >>> 0) };
  return { encounter: next, lines: [`Encounter started (base chance ${Math.round(chance)}%).`] };
};

export const endEncounter = (): { encounter: EncounterState; lines: string[] } => {
  const next = defaultEncounter();
  return { encounter: next, lines: ["Encounter ended."] };
};

const enemyPressure = (s: EngineState, e: EncounterState) => {
  // Soft "time pressure": if you do nothing, control will drift down.
  // Scales with enemy aggression and whether you're pinned.
  const pin = e.position === "pinned" ? 1.4 : e.position === "on_top" ? 0.7 : 1.0;
  const base = 3 + Math.round(e.enemy.aggression / 25); // 3..7
  const insertion = e.insertion ? 2 : 0;
  const fatigueTax = Math.floor(s.cond.fatigue / 35); // 0..2
  return Math.round((base + insertion + fatigueTax) * pin);
};

const enemyAuto = (s: EngineState, e: EncounterState, ctx: ResolveContext): { engine: EngineState; encounter: EncounterState; lines: string[] } => {
  // Optional AI step after player action. Keeps RP-loop simple in chat (one player input per turn).
  // You can disable by setting aggression to 0.
  if (!e.active) return { engine: s, encounter: e, lines: [] };
  if (e.enemy.aggression <= 0) return { engine: s, encounter: e, lines: [] };

  const lines: string[] = [];
  let eng = structuredClone(s);
  let enc = structuredClone(e);

  // If player is stunned, enemy gets a free push.
  if (enc.stunnedTurns > 0) {
    const drift = enemyPressure(eng, enc);
    eng = condDelta(eng, { control: -drift, stress: 2 });
    lines.push(`Opponent presses while you're stunned → control -${drift}.`);
  }

  // If no insertion and control is low, attempt insertion.
  const control = eng.cond.control;
  if (!enc.insertion && control <= 35) {
    const tryV = ctx.hasVagina;
    const action = tryV ? "attempt_v" : "attempt_a";
    const r = resolveTurnInternal(eng, enc, action, ctx, true);
    eng = r.engine;
    enc = r.encounter;
    lines.push(...r.lines.map(l => `Opponent: ${l}`));
    return { engine: eng, encounter: enc, lines };
  }

  // If inserted, thrust sometimes.
  if (enc.insertion) {
    const { d20, nextSeed } = rollD20(enc);
    enc.rngSeed = nextSeed;
    const doIt = d20 >= 8; // ~65%
    if (doIt) {
      const r = resolveTurnInternal(eng, enc, "thrust", ctx, true);
      eng = r.engine;
      enc = r.encounter;
      lines.push(...r.lines.map(l => `Opponent: ${l}`));
    } else {
      const drift = enemyPressure(eng, enc);
      eng = condDelta(eng, { control: -Math.max(1, Math.floor(drift / 2)) });
      lines.push("Opponent keeps you held in place.");
    }
    return { engine: eng, encounter: enc, lines };
  }

  // Otherwise: pressure/control drift.
  const drift = enemyPressure(eng, enc);
  eng = condDelta(eng, { control: -drift });
  if (enc.position === "neutral" && eng.cond.control <= 25) {
    enc.position = "pinned";
    lines.push(`Opponent takes you down → pinned; control -${drift}.`);
  } else {
    lines.push(`Opponent pressures you → control -${drift}.`);
  }

  return { engine: eng, encounter: enc, lines };
};

const resolveTurnInternal = (engine: EngineState, encounter: EncounterState, actionId: string, ctx: ResolveContext, isEnemy: boolean): TurnResult => {
  let s = structuredClone(engine);
  let e = structuredClone(encounter);
  const lines: string[] = [];

  const prevArousal = s.cond.arousal;

  // If stunned: you effectively "lose" your action; enemy still acts.
  if (!isEnemy && e.stunnedTurns > 0) {
    e.stunnedTurns = Math.max(0, e.stunnedTurns - 1);
    lines.push("You can't act while stunned; you gasp and try to recover.");
    // Still apply time pressure from enemy later (outside).
  } else {
    e.lastActionId = actionId;

    switch (actionId) {
      case "struggle": {
        const dc = e.position === "pinned" ? 13 : 10;
        const r = check(s, e, dc, ctx, "physical");
        e.rngSeed = r.nextSeed;
        if (r.ok) {
          const gain = e.position === "pinned" ? 18 : 12;
          s = condDelta(s, { control: +gain, fatigue: +6, stress: +2 });
          if (e.position === "pinned" && s.cond.control >= 45) e.position = "neutral";
          lines.push(`Struggle succeeds (${ctx.skillName} d20:${r.d20} mod:${r.mod} → ${r.total} vs ${r.dc}) → control +${gain}.`);
        } else {
          const gain = e.position === "pinned" ? 8 : 6;
          s = condDelta(s, { control: +gain, fatigue: +7, stress: +3 });
          lines.push(`Struggle slips (${ctx.skillName} d20:${r.d20} mod:${r.mod} → ${r.total} vs ${r.dc}) → control +${gain}.`);
        }
        break;
      }

      case "brace": {
        s = condDelta(s, { fatigue: +3, stress: +1, control: +4 });
        lines.push("You brace and slow their momentum → control +4.");
        break;
      }

      case "expose_underwear": {
        s = exposeSlot(s, "underwear", 8);
        s = condDelta(s, { control: e.position === "pinned" ? -4 : -1, stress: +1 });
        lines.push("Underwear pulled aside → exposure increases (allure may rise).");
        break;
      }

      case "tear_underwear": {
        s = damageSlot(s, "underwear", 18, 14);
        s = condDelta(s, { control: e.position === "pinned" ? -7 : -3, stress: +2 });
        lines.push("Underwear damaged → more exposure (allure may rise).");
        break;
      }

      case "attempt_v":
      case "attempt_a": {
        const target: InsertionTarget = actionId === "attempt_v" ? "vagina" : "anus";
        const dia = e.enemy.dickDiaIn;
        const len = e.enemy.dickLengthIn;

        const skillPct = e.enemy.skillPct;
        const promiscuity = s.core.promiscuity;
        const physique = s.core.physique;

        const gate = penetrationGateDC({
          target,
          penisLengthIn: len,
          penisDiaIn: dia,
          vagDepthIn: ctx.vagDepthIn,
          vagWidthIn: ctx.vagWidthIn,
          wetness: target === "vagina" ? s.wet.vagina : s.wet.anus,
          skillPct,
          promiscuity,
          physique,
          conditions: s.cond,
          tuning: s.tuning,
        });

        // Roll with enemy's own rank/bonus plus your stateMods (already in gate.totalMod).
        const r = check(s, e, gate.dc, { ...ctx, skillPct }, "physical");
        e.rngSeed = r.nextSeed;

        const ok = r.total >= gate.dc;
        const pain = ok ? gate.painOnSuccess : gate.painOnFail;
        s = condDelta(s, { pain: +pain, control: ok ? -8 : -4, stress: ok ? +2 : +1 });
        lines.push(`${target} gate: d20:${r.d20} mod:${r.mod} → ${r.total} vs DC ${gate.dc} → ${ok ? "SUCCESS" : "FAIL"}; pain +${pain}.`);

        if (ok) {
          e.insertion = { by: "enemy", target, depthIn: Math.min(len, target === "vagina" ? ctx.vagDepthIn : len), diaIn: dia };
          if (e.position === "neutral") e.position = "pinned";
          // Stimulation spike on insertion
          const stim: StimulusInput = { amount: 10, area: "genital" };
          const stimRes = applyStim(s, e, stim);
          s = stimRes.engine;
          e = stimRes.encounter;
          lines.push("Insertion seats in; your arousal jumps.");
        } else {
          // failed insertion still raises arousal a bit from pressure
          const stimRes = applyStim(s, e, { amount: 4, area: "genital" });
          s = stimRes.engine;
          e = stimRes.encounter;
        }
        break;
      }

      case "thrust": {
        if (!e.insertion) {
          lines.push("No insertion to thrust with.");
          break;
        }
        const t = e.insertion.target;
        const stimAmt = 8 + Math.round(e.enemy.aggression / 25); // 8..12
        const stimRes = applyStim(s, e, { amount: stimAmt, area: "genital" });
        s = stimRes.engine;
        e = stimRes.encounter;
        // A bit of extra pain when arousal is high + pinned
        const pain = (e.position === "pinned" ? 2 : 1) + Math.floor(s.cond.arousal / 60);
        s = condDelta(s, { pain: +pain, fatigue: +2, control: -3 });
        lines.push(`Thrusting (${t}) → arousal +${stimAmt}, pain +${pain}.`);
        break;
      }

      case "reset_position": {
        const dc = e.position === "pinned" ? 15 : 10;
        const r = check(s, e, dc, ctx, "physical");
        e.rngSeed = r.nextSeed;
        if (r.ok) {
          e.position = "neutral";
          e.insertion = null;
          s = condDelta(s, { control: +10, fatigue: +5, stress: +2 });
          lines.push(`Break away succeeds (${ctx.skillName} d20:${r.d20} mod:${r.mod} → ${r.total} vs ${r.dc}) → neutral; insertion cleared.`);
        } else {
          s = condDelta(s, { control: +2, fatigue: +6, stress: +3 });
          lines.push(`Break away fails (${ctx.skillName} d20:${r.d20} mod:${r.mod} → ${r.total} vs ${r.dc}) → barely budges.`);
        }
        break;
      }

      default:
        lines.push("Unknown action.");
    }
  }

  // Tick wetness/clothes based on arousal changes this turn.
  const timeSince = ctx.timeSinceArousal;
  const beforeWetTick = structuredClone(s);
  let next = tickBodyWetness(beforeWetTick, prevArousal, true, { timeSinceArousal: timeSince });
  next = transferLewdToClothes(next);
  next = dryClothes(next);
  next.cond = clampCond(next.cond);

  // Position snap (optional gentle nudge)
  e = normalizePositionFromControl(e, next.cond.control);

  // Update timeSinceArousal for caller (App stores it outside EngineState)
  const nextSince = next.cond.arousal < 25 ? timeSince + Math.max(1, Math.round(next.minutesPerTurn || 1)) : 1;

  return { engine: next, encounter: e, lines, timeSinceArousal: nextSince };
};

export const resolveTurn = (engine: EngineState, encounter: EncounterState, actionId: string, ctx: ResolveContext): TurnResult => {
  // Player acts, then enemy AI reacts.
  let r = resolveTurnInternal(engine, encounter, actionId, ctx, false);

  // Enemy step
  const ai = enemyAuto(r.engine, r.encounter, ctx);
  let eng = ai.engine;
  let enc = ai.encounter;
  const lines = [...r.lines, ...ai.lines];

  // Decrement stun by turn-time (treat 0.5 as "half-turn")
  if (enc.stunnedTurns > 0) {
    enc.stunnedTurns = Math.max(0, enc.stunnedTurns - 0.5);
  }

  // Commit a small per-turn fatigue tax when encounter is active.
  if (enc.active) {
    eng = condDelta(eng, { fatigue: +1 });
  }

  // Keep a small rolling encounter-local log
  enc.log = [...(enc.log || []), ...lines].slice(-60);
  enc.turn = (enc.turn || 0) + 1;

  return { engine: eng, encounter: enc, lines, timeSinceArousal: r.timeSinceArousal };
};
