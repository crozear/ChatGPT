import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Settings } from "lucide-react";

/*
  Lilith-5 H-dungeon UI v0.6 (compact)
  - Always-visible stat footers (stage + summary), sourced from cartridge meta when present
  - Sexual Skills show concrete rank effects (F→S) using cartridge rankModifiers or fallback
  - Clothing Editor in Debug (integrity / reveal / wetness)
  - Local XP pool with prereq validation + Unlocked Commands sidebar
  - Per-encounter Intensity 1–5 selector with descriptors
  Notes: keep this file lean; push copy/data into ui.v0.5.json on GitHub. Client-side only.
*/

const DEFAULT_CART_URL = "https://raw.githubusercontent.com/crozear/ChatGPT/main/cartridges/ui.v0.5.json";
const PANEL = "border border-white/10 bg-zinc-900/80 backdrop-blur rounded-2xl";
const HEAD = "text-zinc-50";
const SUB = "text-zinc-300/90";

// Intensity copy is short and stable; safe to keep local.
const INTENSITY: Record<1|2|3|4|5,string> = {
  1: "playful: teasing, light commands, soft pacing",
  2: "spicy: explicit talk, firm grip, spanking",
  3: "raw: light choke/gag, public flash allowed",
  4: "brutal: heavy choke, rough pound, degradation, restraint",
  5: "depraved: hypno, breeding/oviposition, crowd use",
};

// Fallback rank modifiers if cartridge doesn’t provide them
const RANKS = ["F","F+","D","C","B","B+","A","S"] as const;
const FALLBACK_RANK_MOD: Record<(typeof RANKS)[number], number> = { F:-10, "F+":-5, D:-2, C:3, B:7, "B+":10, A:15, S:20 };
const RANK_BUCKETS: Array<{ rank: (typeof RANKS)[number]; min: number }> = [
  { rank: "S", min: 95 },
  { rank: "A", min: 80 },
  { rank: "B+", min: 72 },
  { rank: "B", min: 65 },
  { rank: "C", min: 40 },
  { rank: "D", min: 30 },
  { rank: "F+", min: 15 },
  { rank: "F", min: 0 },
];

// Small helpers
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const rankForPct=(pct:number, modifiers:Record<string,number>|undefined)=>{
  const ladder=RANK_BUCKETS.filter(bucket=>modifiers? bucket.rank in modifiers : true);
  const match=ladder.find(bucket=>pct>=bucket.min);
  return match?.rank ?? (ladder[ladder.length-1]?.rank ?? "F");
};
const Gauge=({v,max}:{v:number;max:number})=>{const p=clamp((v/max)*100,0,100);return(<div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-zinc-800"><div style={{width:`${p}%`}} className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500"/></div>)};
const Pill=({children}:{children:React.ReactNode})=> <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-100">{children}</span>;

// Types are intentionally loose to stay short
type AnyObj = Record<string,any>;

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  bundle: AnyObj;
  setBundle: React.Dispatch<React.SetStateAction<AnyObj>>;
  xp: number;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  load: (url?: string) => Promise<void>;
};

function SettingsDialog({ open, onOpenChange, bundle, setBundle, xp, setXp, load }: SettingsDialogProps) {
  const [coreDrafts,setCoreDrafts]=React.useState<Record<string,string>>({});
  const [coreEditing,setCoreEditing]=React.useState<string|null>(null);

  const setCore = React.useCallback((id: string, val: number) => {
    setBundle(prev => {
      const numericVal = Number.isFinite(val) ? val : 0;
      const innocenceThresholds = prev.statMeta?.innocence?.thresholds as number[] | undefined;
      const innocenceFloor = Math.min(0, innocenceThresholds?.[0] ?? -20);
      const nextCoreStats = (prev.coreStats || []).map((s: any) => {
        if (s.id !== id) return s;
        if (id === "awareness") {
          const max = typeof s.max === "number" ? s.max : 100;
          const capped = Math.min(Math.max(numericVal, innocenceFloor), max);
          return { ...s, value: capped };
        }
        const maxValue = typeof s.max === "number" ? s.max : numericVal;
        return { ...s, value: clamp(numericVal, 0, maxValue) };
      });

      const prevAwarenessStat = (prev.coreStats || []).find((s: any) => s.id === "awareness");
      const prevAwareness = typeof prevAwarenessStat?.value === "number" ? prevAwarenessStat.value : Number(prevAwarenessStat?.value || 0);
      const nextAwarenessStat = nextCoreStats.find((s: any) => s.id === "awareness");
      const nextAwareness = typeof nextAwarenessStat?.value === "number" ? nextAwarenessStat.value : Number(nextAwarenessStat?.value || 0);
      const innocenceGate = prev.innocence?.active ?? true;
      const innocenceBefore = innocenceGate && prevAwareness < 0;
      const innocenceNow = innocenceGate && nextAwareness < 0;

      const prevConditions = prev.conditions || {};
      const prevLedger = prev.innocenceTrauma || {};
      const prevVisible = typeof prevLedger.visible === "number" ? prevLedger.visible : (prevConditions.trauma ?? 0);
      const prevStash = typeof prevLedger.stash === "number" ? prevLedger.stash : 0;

      let nextConditions = prevConditions;
      let nextLedger = prevLedger;

      if (innocenceNow) {
        const baseline = typeof prevConditions.trauma === "number" ? prevConditions.trauma : prevVisible;
        const visible = innocenceBefore ? prevVisible : baseline;
        const stash = innocenceBefore ? prevStash : 0;
        if (nextConditions === prevConditions) nextConditions = { ...prevConditions };
        nextConditions.trauma = visible;
        nextLedger = { stash, visible };
      } else {
        const baseVisible = typeof prevConditions.trauma === "number" ? prevConditions.trauma : prevVisible;
        const combined = clamp(baseVisible + prevStash, 0, 100);
        if (prevStash || typeof prevConditions.trauma !== "number") {
          if (nextConditions === prevConditions) nextConditions = { ...prevConditions };
          nextConditions.trauma = combined;
        }
        nextLedger = { stash: 0, visible: typeof nextConditions.trauma === "number" ? nextConditions.trauma : combined };
      }

      return { ...prev, coreStats: nextCoreStats, conditions: nextConditions, innocenceTrauma: nextLedger };
    });
  }, [setBundle]);

  React.useEffect(()=>{
    if(!open){
      setCoreDrafts({});
      setCoreEditing(null);
      return;
    }
    setCoreDrafts(prev=>{
      const next:Record<string,string>={};
      (bundle.coreStats||[]).forEach((s:any)=>{
        const numeric=typeof s.value==="number"?s.value:Number(s.value||0);
        const sanitized=Number.isFinite(numeric)?`${numeric}`:"0";
        if(coreEditing===s.id && prev[s.id]!==undefined){
          next[s.id]=prev[s.id];
        }else{
          next[s.id]=sanitized;
        }
      });
      return next;
    });
  },[open,bundle.coreStats,coreEditing]);

  const commitCoreDraft=React.useCallback((id:string, rawValue:string)=>{
    const parsed=Number(rawValue);
    const value=Number.isFinite(parsed)?parsed:0;
    setCore(id,value);
  },[setCore]);

  const setCond = React.useCallback((key: string, val: number) => {
    setBundle(prev => {
      const numericVal = Number.isFinite(val) ? val : 0;
      const nextVal = clamp(numericVal, 0, 100);
      const prevConditions = prev.conditions || {};
      if (key !== "trauma") {
        return {
          ...prev,
          conditions: { ...prevConditions, [key]: nextVal },
        };
      }

      const awarenessStat = (prev.coreStats || []).find((s: any) => s.id === "awareness");
      const awarenessValue = typeof awarenessStat?.value === "number" ? awarenessStat.value : Number(awarenessStat?.value || 0);
      const innocenceEnabled = (prev.innocence?.active ?? true) && awarenessValue < 0;
      const ledger = prev.innocenceTrauma || {};
      const currentVisible = typeof ledger.visible === "number" ? ledger.visible : (prevConditions.trauma ?? 0);

      if (innocenceEnabled) {
        const nextVisible = Math.min(nextVal, currentVisible);
        const nextStash = clamp(nextVal - nextVisible, 0, 100);
        const nextConditions = { ...prevConditions, trauma: nextVisible };
        return {
          ...prev,
          conditions: nextConditions,
          innocenceTrauma: { stash: nextStash, visible: nextVisible },
        };
      }

      const nextConditions = { ...prevConditions, trauma: nextVal };
      return {
        ...prev,
        conditions: nextConditions,
        innocenceTrauma: { stash: 0, visible: nextVal },
      };
    });
  }, [setBundle]);

  const setSem = React.useCallback((key: string, val: number) => {
    setBundle(prev => ({
      ...prev,
      semen: { ...prev.semen, [key]: Math.max(0, Math.floor(val || 0)) },
    }));
  }, [setBundle]);

  const setCl = React.useCallback((index: number, field: "integrity"|"reveal"|"wetness", val: number) => {
    setBundle(prev => {
      const clothing = [...(prev.clothing || [])];
      const item = { ...clothing[index] };
      if (field === "wetness") item.wetness = clamp(Math.floor(val || 0), 0, 20);
      if (field === "integrity") item.integrity = clamp(Math.floor(val || 0), 0, 100);
      if (field === "reveal") item.reveal = clamp(Math.floor(val || 0), 0, 100);
      clothing[index] = item;
      return { ...prev, clothing };
    });
  }, [setBundle]);

  const setSkillPct = React.useCallback((index: number, value: number) => {
    setBundle(prev => {
      const sexSkills = [...(prev.sexSkills || [])];
      if (!sexSkills[index]) return prev;
      const skill = { ...sexSkills[index] };
      const pct = clamp(Math.floor(Number(value) || 0), 0, 100);
      skill.pct = pct;
      skill.rank = rankForPct(pct, prev.rankModifiers || FALLBACK_RANK_MOD);
      sexSkills[index] = skill;
      return { ...prev, sexSkills };
    });
  }, [setBundle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-white/10 bg-zinc-900/95 text-zinc-100">
        <DialogHeader><DialogTitle>Debug Settings</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Core Stats</div><div className="mt-2 space-y-2 text-xs">{(bundle.coreStats||[]).map((s:any)=>{const draftValue=coreDrafts[s.id] ?? `${typeof s.value==="number"?s.value:Number(s.value||0)}`;return(<div key={s.id} className="flex items-center justify-between gap-2"><span className="text-zinc-300">{s.name}</span><div className="flex items-center gap-2"><Input type="number" value={draftValue} onChange={e=>setCoreDrafts(prev=>({...prev,[s.id]:e.target.value}))} onFocus={()=>setCoreEditing(s.id)} onBlur={()=>{setCoreEditing(null);commitCoreDraft(s.id,draftValue);}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}}} className="h-7 w-20 bg-zinc-950/60" /><span className="text-zinc-400">/ {s.max}</span></div></div>);})}</div></div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Conditions</div><div className="mt-2 space-y-2 text-xs">{["pain","arousal","fatigue","stress","trauma","control","allure"].map(k=>(<div key={k} className="flex items-center justify-between gap-2"><span className="capitalize text-zinc-300">{k}</span><Input type="number" value={bundle.conditions?.[k]||0} onChange={e=>setCond(k,Number(e.target.value))} className="h-7 w-20 bg-zinc-950/60" /></div>))}</div></div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Semen</div><div className="mt-2 space-y-2 text-xs"><div className="flex items-center justify-between gap-2"><span className="text-zinc-300">Volume (ml)</span><Input type="number" value={bundle.semen?.volume_ml||0} onChange={e=>setSem("volume_ml",Number(e.target.value))} className="h-7 w-24 bg-zinc-950/60" /></div><div className="flex items-center justify-between gap-2"><span className="text-zinc-300">Amount (ml)</span><Input type="number" value={bundle.semen?.amount_ml||0} onChange={e=>setSem("amount_ml",Number(e.target.value))} className="h-7 w-24 bg-zinc-950/60" /></div></div></div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Sexual Skills</div><div className="mt-2 space-y-2 text-xs">{(bundle.sexSkills||[]).map((skill:any,i:number)=>{const pct=typeof skill.pct==="number"?skill.pct:Number(skill.pct||0);const rank=rankForPct(pct, bundle.rankModifiers || FALLBACK_RANK_MOD);return(<div key={skill.id||skill.name||i} className="rounded-xl border border-white/10 bg-zinc-950/50 p-2"><div className="flex items-center justify-between gap-2"><div className="text-zinc-200">{skill.name||`Skill ${i+1}`}</div><div className="text-[11px] text-zinc-300">Rank {rank}</div></div><div className="mt-2 flex items-center gap-2 text-zinc-400"><label className="flex items-center gap-1"><span>Mastery</span><Input type="number" min={0} max={100} className="h-7 w-20 bg-zinc-950/60" value={pct} onChange={e=>setSkillPct(i,Number(e.target.value))}/></label><span className="text-zinc-500">%</span></div></div>);})}{!bundle.sexSkills?.length&&<div className="text-zinc-400">No sexual skills loaded.</div>}</div></div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Cartridge & XP</div><div className="mt-2 text-xs text-zinc-300">Reload default GitHub cartridge.</div><Button onClick={()=>load()} className="mt-2 w-full bg-fuchsia-600/80 text-white hover:bg-fuchsia-500/90">Reload Default Cartridge</Button><div className="mt-4 text-sm font-semibold">XP Pool</div><div className="mt-2 flex items-center justify-between text-xs"><span className="text-zinc-300">XP</span><div className="flex items-center gap-2"><Input type="number" value={xp} onChange={e=>setXp(Number(e.target.value||0))} className="h-7 w-24 bg-zinc-950/60" /><Button size="sm" variant="secondary" onClick={()=>setXp(xp+10)} className="border border-white/10 bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800/90">+10</Button></div></div></div>
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Clothing Editor</div><div className="mt-2 grid grid-cols-1 gap-2 text-xs">{(bundle.clothing||[]).map((c:any,i:number)=>(<div key={i} className="rounded-xl border border-white/10 bg-zinc-950/50 p-2"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-zinc-200">{(c.category||c.slot)?.toUpperCase()} • {c.name}</div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-1"><span className="text-zinc-400">Integrity</span><Input type="number" className="h-7 w-20 bg-zinc-950/60" value={c.integrity} onChange={e=>setCl(i,"integrity",Number(e.target.value))}/></label><label className="flex items-center gap-1"><span className="text-zinc-400">Reveal</span><Input type="number" className="h-7 w-20 bg-zinc-950/60" value={c.reveal} onChange={e=>setCl(i,"reveal",Number(e.target.value))}/></label>{"wetness" in c? <label className="flex items-center gap-1"><span className="text-zinc-400">Wetness</span><Input type="number" className="h-7 w-20 bg-zinc-950/60" value={c.wetness||0} onChange={e=>setCl(i,"wetness",Number(e.target.value))}/></label> : null}</div></div></div>))}{!bundle.clothing?.length&&<div className="text-zinc-400">No equipped clothing.</div>}</div></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function App(){
  const [bundle,setBundle]=useState<AnyObj>({coreStats:[],sexSkills:[],innocence:{},clothing:[],conditions:{pain:0,arousal:0,fatigue:0,stress:0,trauma:0,control:0,allure:0},semen:{volume_ml:0,amount_ml:0,penis_size:"normal"},fluids:{vagina:{recentStim:0,goo_in:0,goo_out:0,semen_in:0,semen_out:0},penis:{recentStim:0,goo_in:0,goo_out:0,semen_in:0,semen_out:0},anus:{recentStim:0,goo_in:0,goo_out:0,semen_in:0,semen_out:0}},skillNodes:[],bestiary:[],econRules:[],rankModifiers:FALLBACK_RANK_MOD, statMeta:{}, innocenceTrauma:{stash:0,visible:0}});
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [xp,setXp]=useState(0);
  const [acq,setAcq]=useState<Set<string>>(new Set());
  const [intensity,setIntensity]=useState<number>(2);
  const [cartUrl,setCartUrl]=useState("");
  const rankMod:Record<string,number>=bundle.rankModifiers||FALLBACK_RANK_MOD;

  const load=async(url?:string)=>{const res=await fetch(url||DEFAULT_CART_URL);const data=await res.json();setBundle((b:any)=>{
    const nextConditions= data.conditions ? { ...data.conditions } : { ...(b.conditions || {}) };
    const traumaBase=typeof nextConditions.trauma==="number" ? nextConditions.trauma : (b.conditions?.trauma ?? 0);
    const traumaClamped=clamp(traumaBase,0,100);
    nextConditions.trauma=traumaClamped;
    return {
      ...b,
      coreStats:data.coreStats||[],
      sexSkills:data.sexSkills||[],
      innocence:data.innocence||{},
      clothing:data.equippedClothing||[],
      conditions:nextConditions,
      semen:data.semen||b.semen,
      fluids:data.fluids||b.fluids,
      skillNodes:data.skillNodes||[],
      bestiary:data.bestiary||[],
      econRules:data.econRules||[],
      rankModifiers:data.rankModifiers||FALLBACK_RANK_MOD,
      statMeta:data.statMeta||b.statMeta,
      innocenceTrauma:{ stash:0, visible:traumaClamped },
    };
  }); setAcq(new Set()); setXp(0);};
  useEffect(()=>{load()},[]);

  // Stat footer from meta or generic ladder
  function stageOf(s:any){
  const m = s?.meta || (bundle as any)?.statMeta?.[s?.id];
  if(m?.thresholds && m?.stages){
    const th = m.thresholds as number[];
    const steps = m.stages.length;
    let idx = th.filter(t => (s.value ?? 0) >= t).length - 1;
    idx = clamp(idx, 0, steps - 1);
    return { stage: m.stages[idx], summary: m.summary || s.desc || "", index: idx, steps };
  }
  const steps = (m?.stages?.length) || 7;
  const idx = clamp(Math.round(((s.value||0)/(s.max||1)) * (steps-1)), 0, steps-1);
  const generic = ["Very low","Low","Below avg","Average","Above avg","High","Very high"]; 
  const stage = m?.stages ? m.stages[idx] : generic[idx];
  return { stage, summary: m?.summary || s.desc || "Core attribute.", index: idx, steps };
}

  // Spend logic
  const spend=(node:any)=>{ if(acq.has(node.id)) return alert("Already unlocked."); if(xp<node.xpCost) return alert("Not enough XP."); const reqs=node.requires||[]; const miss=reqs.filter((r:string)=>!acq.has(r)); if(miss.length) return alert("Missing: "+miss.join(", ")); const next=new Set(acq); next.add(node.id); setAcq(next); setXp(xp-node.xpCost); };

  // Header
  const Header=()=> (
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3"><div className="rounded-2xl bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-sky-500/30 px-3 py-1 text-sm font-semibold text-zinc-50">Lilith-5 Dungeon</div><div className="text-xs text-zinc-300/80">UI v0.6 • GitHub cartridge</div></div>
      <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <Input placeholder="Paste raw JSON URL" value={cartUrl} onChange={e=>setCartUrl(e.target.value)} className="h-8 w-[260px] bg-zinc-950/60 text-zinc-100 placeholder:text-zinc-400" />
          <Button size="sm" onClick={()=>load(cartUrl)} className="bg-fuchsia-600/80 text-white hover:bg-fuchsia-500/90">Load</Button>
          <Button size="sm" variant="secondary" onClick={()=>navigator.clipboard.writeText(cartUrl||DEFAULT_CART_URL)} className="border border-white/10 bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800/90">Copy URL</Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block w-48 text-xs text-zinc-300/80">
            <div className="flex items-center gap-2"><span className="text-zinc-200">Intensity</span>
              <select
                className="h-8 w-16 rounded-xl border border-white/10 bg-zinc-950/60 text-zinc-100"
                value={intensity}
                onChange={e=>setIntensity(Number(e.target.value))}
              >
                {[1,2,3,4,5].map(i=>(<option key={i} value={i}>{i}</option>))}
              </select>
            </div>
            <div className="mt-1 text-[10px] text-zinc-400">{INTENSITY[intensity as 1|2|3|4|5]}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/80 px-2 py-1 text-xs text-zinc-200">XP: {xp}</div>
          <Button size="sm" variant="secondary" onClick={()=>setXp(xp+10)} className="border border-white/10 bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800/90">+10 XP</Button>
          <Progress value={62} className="h-2 bg-zinc-800" />
          <Button size="sm" variant="secondary" onClick={()=>setSettingsOpen(true)} className="border border-white/10 bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800/90"><Settings className="mr-1 h-4 w-4"/>Settings</Button>
        </div>
      </div>
    </div>
  );

  const CoreCard=({s}:{s:any})=>{
    const rawValue=typeof s.value==="number"?s.value:Number(s.value??0);
    const innocenceMeta=(bundle as any)?.statMeta?.innocence;
    const innocenceThresholds=innocenceMeta?.thresholds as number[]|undefined;
    const innocenceFloor=Math.min(0,innocenceThresholds?.[0]??-20);
    const innocenceToggle=(bundle.innocence?.active??true)&&rawValue<0;
    const asInnocence=s.id==="awareness"&&innocenceToggle;
    const displayMaxBase=asInnocence?Math.abs(innocenceFloor):s.max;
    const displayValueBase=asInnocence?Math.abs(Math.max(rawValue,innocenceFloor)):rawValue;
    const safeDisplayMax=Number.isFinite(displayMaxBase)&&displayMaxBase!==0?displayMaxBase:1;
    const safeDisplayValue=Number.isFinite(displayValueBase)?Math.min(displayValueBase,safeDisplayMax):0;
    const cardName=asInnocence?"Innocence":s.name;
    const cardDesc=asInnocence?(innocenceMeta?.summary||s.desc):s.desc;
    const stageTarget=asInnocence?{...s,id:"innocence",value:rawValue,desc:cardDesc}:s;
    const stageInfo=stageOf(stageTarget);
    const metaSource=stageTarget.meta||(bundle as any)?.statMeta?.[stageTarget?.id];
    const hasStages=Array.isArray(metaSource?.stages);
    return(
      <div className={`${PANEL} p-3`}>
        <div className="flex items-center justify-between"><div className={`text-sm font-semibold ${HEAD}`}>{cardName}</div><div className="text-xs text-zinc-300/90">{safeDisplayValue}/{safeDisplayMax}</div></div>
        <div className={`mt-1 text-xs ${SUB}`}>{cardDesc}</div>
        <Gauge v={safeDisplayValue} max={safeDisplayMax}/>
        <div className="mt-2 rounded-xl border border-white/10 bg-zinc-950/60 p-2"><div className="text-[11px] text-zinc-200">Stage: {stageInfo.stage}{hasStages?` • ${stageInfo.index}/${stageInfo.steps-1}`:""}</div><div className="mt-1 text-[11px] text-zinc-400">{stageInfo.summary}</div></div>
      </div>
    );
  };

  const SexSkills=()=> (
    <Card className={PANEL}><CardHeader><CardTitle className={HEAD}>Sexual Skills</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2">
      {bundle.sexSkills?.map((k:any,i:number)=>{
        const r=k.rank as keyof typeof rankMod; const mod=rankMod[r]??0;
        return (
          <div key={i} className="rounded-2xl border border-white/10 bg-zinc-950/50 p-2 text-xs">
            <div className={`text-sm font-semibold ${HEAD}`}>{k.name}</div>
            <div className="mt-1 text-zinc-300/90">Rank {k.rank} • {k.pct}%</div>
            <Gauge v={k.pct||0} max={100}/>
            <div className="mt-2 rounded bg-white/10 px-2 py-1 text-[11px] text-zinc-100">Checks: {mod>=0?"+":""}{mod} to related actions</div>
          </div>
        );
      })}
      {!bundle.sexSkills?.length&&<div className={`text-xs ${SUB}`}>Skills load from the cartridge.</div>}
    </CardContent></Card>
  );

  const Conditions=()=>{const c=bundle.conditions||{}; const will=(bundle.coreStats||[]).find((s:any)=>s.id==="will")||{value:0,max:1}; const hint=INTENSITY[intensity as 1|2|3|4|5]; const Row=({k}:{k:string})=>{const v=c[k]??0;return(<div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-2"><div className="flex items-center justify-between text-xs"><span className="text-zinc-200 capitalize">{k}</span><span className="text-[10px] text-zinc-300">{v}</span></div><div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-zinc-800"><div style={{width:`${v}%`}} className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500"/></div></div>)}; return (
    <Card className={PANEL}><CardHeader><CardTitle className={HEAD}>Current Conditions</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-2">
      {["pain","arousal","fatigue","stress","trauma","control","allure"].map(k=><Row key={k} k={k}/>) }
      <div className="text-[11px] text-zinc-400">High Willpower {will.value}/{will.max} resists stun. Intensity: {hint}</div>
    </CardContent></Card>
  )};

  const Clothing=()=> (
    <Card className={PANEL}><CardHeader><CardTitle className={HEAD}>Clothing</CardTitle></CardHeader><CardContent className="space-y-2 text-xs">
      {bundle.clothing?.map((c:any,i:number)=>{
        return (
          <div key={i} className="rounded-xl border border-white/10 bg-zinc-950/50 p-2">
            <div className="flex items-center justify-between"><div className="text-zinc-200">{(c.category||c.slot)?.toUpperCase()} • {c.name}</div><div className="flex items-center gap-2 text-[11px] text-zinc-300"><span>{c.wetness!==undefined?`${c.wetness}/200`:"–"}</span><span>{c.integrity}/100</span><span>{c.reveal}/100</span></div></div>
            {c.wetness!==undefined&&<div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-zinc-800"><div style={{width:`${(c.wetness/200)*100}%`}} className="h-full bg-gradient-to-r from-sky-500 to-fuchsia-500"/></div>}
          </div>
        );
      })}
      {!bundle.clothing?.length&&<div className={`text-xs ${SUB}`}>No equipped clothing in cartridge.</div>}
    </CardContent></Card>
  );

  const Fluids=()=>{const s=bundle.semen||{volume_ml:0,amount_ml:0}; const ej=Math.min(s.amount_ml,Math.round((30+(s.volume_ml||0)/30))); return (
    <Card className={PANEL}><CardHeader><CardTitle className={HEAD}>Fluids</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2 text-[11px] text-zinc-100">
      <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-2"><div className="text-xs text-zinc-200">Semen</div><div className="mt-1 grid grid-cols-3 gap-2"><div className="rounded bg-zinc-900/60 p-1 text-center">Vol {s.volume_ml} ml</div><div className="rounded bg-zinc-900/60 p-1 text-center">Amt {s.amount_ml} ml</div><div className="rounded bg-zinc-900/60 p-1 text-center">Ejac ~{ej} ml</div></div></div>
      <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-2"><div className="text-xs text-zinc-200">Wetness</div><div className="mt-1 grid grid-cols-3 gap-2"><div className="rounded bg-zinc-900/60 p-1 text-center">Vag {(bundle.fluids?.vagina?.recentStim||0)+ (bundle.fluids?.vagina?.semen_in||0)*6}</div><div className="rounded bg-zinc-900/60 p-1 text-center">Pen {(bundle.fluids?.penis?.recentStim||0)+(bundle.fluids?.penis?.semen_in||0)*12}</div><div className="rounded bg-zinc-900/60 p-1 text-center">Anal {(bundle.fluids?.anus?.semen_in||0)*6}</div></div></div>
    </CardContent></Card>
  )};

  const SkillTree=()=>{
    const [sel,setSel]=useState<string|undefined>();
    const nodes=(bundle.skillNodes||[]) as any[];
    const orderBranch:Record<string,number>={Positions:0,Technique:1,Kink:2,Utility:3};
    const byTier:Record<number,any[]>={};
    nodes.forEach(n=>{byTier[n.tier]=byTier[n.tier]||[];byTier[n.tier].push(n)});
    const tiers=Array.from(new Set(nodes.map(n=>n.tier))).sort((a,b)=>a-b);
    tiers.forEach(t=> byTier[t].sort((a,b)=> (orderBranch[a.branch]??9)-(orderBranch[b.branch]??9) || a.name.localeCompare(b.name)));
    const selected = useMemo(()=> nodes.find(n=>n.id===sel)||nodes[0], [sel,nodes]);
    const requireLine=(n:any)=> (n.requires?.length? `Requires: ${n.requires.map((r:string)=> acq.has(r)?`✔ ${r}`:`✖ ${r}`).join(', ')}`:"No prerequisites");
    return (
      <div className="grid grid-cols-12 gap-4">
        <Card className={`col-span-9 ${PANEL}`}>
          <CardHeader><CardTitle className={HEAD}>Skill Tree</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-3">
              {tiers.map(t=> (
                <div key={t} className="rounded-2xl border border-white/10 bg-zinc-950/50 p-2">
                  <div className={`mb-2 text-xs font-semibold ${HEAD}`}>Tier {t}</div>
                  <div className="space-y-2">
                    {byTier[t].map(n=> (
                      <button key={n.id} onClick={()=>setSel(n.id)} className={`w-full rounded-xl border border-white/10 bg-gradient-to-br ${n.stance==="Dom"?"from-fuchsia-500/30 to-fuchsia-700/10":n.stance==="Sub"?"from-sky-500/30 to-sky-700/10":"from-purple-500/20 to-purple-800/10"} p-2 text-left hover:border-white/20 ${sel===n.id?"ring-2 ring-fuchsia-400/70":""}`}>
                        <div className="flex items-center justify-between">
                          <div className={`text-xs font-semibold ${HEAD}`}>{n.name}</div>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-200/80"><Pill>{n.branch}</Pill><Pill>{n.stance}</Pill><Pill>{n.xpCost} XP</Pill>{acq.has(n.id)&&<Pill>Unlocked</Pill>}</div>
                        </div>
                        <div className={`mt-1 text-[11px] ${SUB}`}>{requireLine(n)}</div>
                      </button>
                    ))}
                    {!byTier[t]?.length && <div className={`text-[11px] ${SUB}`}>—</div>}
                  </div>
                </div>
              ))}
              {!tiers.length && <div className={`text-xs ${SUB}`}>No nodes; load cartridge.</div>}
            </div>
          </CardContent>
        </Card>

        <div className="col-span-3 flex flex-col gap-4">
          <Card className={PANEL}>
            <CardHeader><CardTitle className={HEAD}>Node Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {selected? (<>
                <div className={`text-sm font-semibold ${HEAD}`}>{selected.name}</div>
                <div className={`text-xs ${SUB}`}>{selected.desc}</div>
                <div className="flex flex-wrap gap-2 text-[10px] text-zinc-100"><Badge variant="secondary">Tier {selected.tier}</Badge><Badge variant="secondary">{selected.branch}</Badge><Badge variant="secondary">{selected.stance}</Badge><Badge variant="secondary">Cost {selected.xpCost} XP</Badge></div>
                <div className="pt-2"><div className="text-xs uppercase tracking-wide text-zinc-300/80">Prerequisites</div><ul className="ml-4 list-disc text-xs text-zinc-200">{(selected.requires?.length?selected.requires:["None"]).map((r:string,i:number)=>(<li key={i} className={`${acq.has(r)?"text-emerald-300":"text-zinc-400"}`}>{r}</li>))}</ul></div>
                <Button className="w-full bg-fuchsia-600/80 text-white hover:bg-fuchsia-500/90 disabled:opacity-50" onClick={()=>spend(selected)} disabled={acq.has(selected.id)}>Spend XP</Button>
              </>): <div className={`text-xs ${SUB}`}>Select a node.</div>}
            </CardContent>
          </Card>

          <Card className={PANEL}>
            <CardHeader><CardTitle className={HEAD}>Unlocked Commands</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {[...acq].map(id=>{const n=(bundle.skillNodes||[]).find((x:any)=>x.id===id); if(!n) return null; return (
                <div key={id} className="rounded-xl border border-white/10 bg-zinc-950/60 p-2"><div className="flex items-center justify-between"><div className="text-zinc-200">{n.name}</div><div className="flex items-center gap-1 text-[10px]"><Pill>{n.branch}</Pill><Pill>{n.stance}</Pill></div></div><div className="mt-1 text-zinc-400">{n.desc}</div></div>
              )})}
              {!acq.size&&<div className="text-zinc-400">Spend XP to unlock commands.</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const Econ=()=> (
    <Card className={PANEL}><CardHeader><CardTitle className={HEAD}>Progression & Balance</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{(bundle.econRules||[]).map((r:any)=>(<div key={r.title} className="rounded-2xl border border-white/10 bg-zinc-950/50 p-3"><div className={`text-sm font-semibold ${HEAD}`}>{r.title}</div><div className={`mt-1 text-xs ${SUB}`}>{r.text}</div></div>))}</CardContent></Card>
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <Header/>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        bundle={bundle}
        setBundle={setBundle}
        xp={xp}
        setXp={setXp}
        load={load}
      />

      <Tabs defaultValue="char" className="mt-2">
        <TabsList className="bg-zinc-900/60 text-zinc-200">
          <TabsTrigger value="char">Character</TabsTrigger>
          <TabsTrigger value="tree">Skill Tree</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="char" className="mt-4">
          <div className="grid grid-cols-12 gap-4">
            <Card className={`col-span-12 md:col-span-7 ${PANEL}`}>
              <CardHeader><CardTitle className={HEAD}>Core Stats</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(bundle.coreStats||[]).map((s:any)=>(<CoreCard key={s.id} s={s}/>))}
                {!bundle.coreStats?.length&&<div className={`text-xs ${SUB}`}>Stats load from cartridge.</div>}
              </CardContent>
            </Card>
            <div className="col-span-12 md:col-span-5 grid gap-4">
              <SexSkills/>
              <Conditions/>
            </div>
            <div className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Clothing/>
              <Fluids/>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tree" className="mt-4"><SkillTree/></TabsContent>
        <TabsContent value="rules" className="mt-4"><Econ/></TabsContent>
      </Tabs>
    </div>
  );
}
