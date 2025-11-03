import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const DEFAULT_CART_URL = "https://raw.githubusercontent.com/crozear/ChatGPT/main/src/ui.v0.5.json";
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

// Small helpers
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const Gauge=({v,max}:{v:number;max:number})=>{const p=clamp((v/max)*100,0,100);return(<div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-zinc-800"><div style={{width:`${p}%`}} className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500"/></div>)};
const Pill=({children}:{children:React.ReactNode})=> <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-100">{children}</span>;

// Types are intentionally loose to stay short
type AnyObj = Record<string,any>;

export default function App(){
  const [bundle,setBundle]=useState<AnyObj>({coreStats:[],sexSkills:[],innocence:{},clothing:[],conditions:{pain:0,arousal:0,fatigue:0,stress:0,trauma:0,control:0,allure:0},semen:{volume_ml:0,amount_ml:0,penis_size:"normal"},fluids:{vagina:{recentStim:0,goo_in:0,goo_out:0,semen_in:0,semen_out:0},penis:{recentStim:0,goo_in:0,goo_out:0,semen_in:0,semen_out:0},anus:{recentStim:0,goo_in:0,goo_out:0,semen_in:0,semen_out:0}},skillNodes:[],bestiary:[],econRules:[],rankModifiers:FALLBACK_RANK_MOD, statMeta:{}});
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [xp,setXp]=useState(0);
  const [acq,setAcq]=useState<Set<string>>(new Set());
  const [intensity,setIntensity]=useState<number>(2);
  const [cartUrl,setCartUrl]=useState("");
  const rankMod:Record<string,number>=bundle.rankModifiers||FALLBACK_RANK_MOD;

  const load=async(url?:string)=>{const res=await fetch(url||DEFAULT_CART_URL);const data=await res.json();setBundle((b:any)=>({
    ...b,
    coreStats:data.coreStats||[],
    sexSkills:data.sexSkills||[],
    innocence:data.innocence||{},
    clothing:data.equippedClothing||[],
    conditions:data.conditions||b.conditions,
    semen:data.semen||b.semen,
    fluids:data.fluids||b.fluids,
    skillNodes:data.skillNodes||[],
    bestiary:data.bestiary||[],
    econRules:data.econRules||[],
    rankModifiers:data.rankModifiers||FALLBACK_RANK_MOD,
    statMeta:data.statMeta||b.statMeta,
  })); setAcq(new Set()); setXp(0);};
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
              <Select defaultValue={String(intensity)} onValueChange={v=>setIntensity(Number(v))}>
                <SelectTrigger className="h-8 w-16 bg-zinc-950/60 text-zinc-100"><SelectValue/></SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900/90 text-zinc-100">{[1,2,3,4,5].map(i=><SelectItem key={i} value={String(i)}>{i}</SelectItem>)}</SelectContent>
              </Select>
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

  const CoreCard=({s}:{s:any})=>{const f=stageOf(s);return(
    <div className={`${PANEL} p-3`}>
      <div className="flex items-center justify-between"><div className={`text-sm font-semibold ${HEAD}`}>{s.name}</div><div className="text-xs text-zinc-300/90">{s.value}/{s.max}</div></div>
      <div className={`mt-1 text-xs ${SUB}`}>{s.desc}</div>
      <Gauge v={s.value} max={s.max}/>
      <div className="mt-2 rounded-xl border border-white/10 bg-zinc-950/60 p-2"><div className="text-[11px] text-zinc-200">Stage: {f.stage}{s.meta?.stages || (bundle as any)?.statMeta?.[s?.id]?.stages ? ` • ${f.index}/${f.steps-1}` : ""}</div><div className="mt-1 text-[11px] text-zinc-400">{f.summary}</div></div>
    </div>
  )};

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
            <div className="flex items-center justify-between"><div className="text-zinc-200">{(c.category||c.slot)?.toUpperCase()} • {c.name}</div><div className="flex items-center gap-2 text-[11px] text-zinc-300"><span>{c.wetness!==undefined?`${c.wetness}/200`:"–"}</span><span>{c.integrity}/1000</span><span>{c.reveal}/1000</span></div></div>
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

  const SettingsDialogEl=()=>{
    const b=bundle; const setB=(nb:any)=>setBundle(nb);
    const setCore=(id:string,val:number)=> setB({...b, coreStats: (b.coreStats||[]).map((s:any)=> s.id===id?{...s,value:clamp(val,0,s.max)}:s)});
    const setCond=(k:string,val:number)=> setB({...b, conditions: {...b.conditions, [k]: clamp(val,0,100)}});
    const setSem=(k:string,val:number)=> setB({...b, semen: {...b.semen, [k]: Math.max(0,Math.floor(val||0))}});
    const setCl=(i:number,k:"integrity"|"reveal"|"wetness",val:number)=>{const arr=[...(b.clothing||[])]; const it={...arr[i]}; if(k==="wetness") it.wetness=clamp(Math.floor(val||0),0,200); if(k==="integrity") it.integrity=clamp(Math.floor(val||0),0,1000); if(k==="reveal") it.reveal=clamp(Math.floor(val||0),0,1000); arr[i]=it; setB({...b, clothing:arr}); };
    return (
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-5xl border-white/10 bg-zinc-900/95 text-zinc-100">
          <DialogHeader><DialogTitle>Debug Settings</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Core Stats</div><div className="mt-2 space-y-2 text-xs">{(b.coreStats||[]).map((s:any)=>(<div key={s.id} className="flex items-center justify-between gap-2"><span className="text-zinc-300">{s.name}</span><div className="flex items-center gap-2"><Input type="number" value={s.value} onChange={e=>setCore(s.id,Number(e.target.value))} className="h-7 w-20 bg-zinc-950/60" /><span className="text-zinc-400">/ {s.max}</span></div></div>))}</div></div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Conditions</div><div className="mt-2 space-y-2 text-xs">{["pain","arousal","fatigue","stress","trauma","control","allure"].map(k=>(<div key={k} className="flex items-center justify-between gap-2"><span className="capitalize text-zinc-300">{k}</span><Input type="number" value={b.conditions?.[k]||0} onChange={e=>setCond(k,Number(e.target.value))} className="h-7 w-20 bg-zinc-950/60" /></div>))}</div></div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Semen</div><div className="mt-2 space-y-2 text-xs"><div className="flex items-center justify-between gap-2"><span className="text-zinc-300">Volume (ml)</span><Input type="number" value={b.semen?.volume_ml||0} onChange={e=>setSem("volume_ml",Number(e.target.value))} className="h-7 w-24 bg-zinc-950/60" /></div><div className="flex items-center justify-between gap-2"><span className="text-zinc-300">Amount (ml)</span><Input type="number" value={b.semen?.amount_ml||0} onChange={e=>setSem("amount_ml",Number(e.target.value))} className="h-7 w-24 bg-zinc-950/60" /></div></div></div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Cartridge & XP</div><div className="mt-2 text-xs text-zinc-300">Reload default GitHub cartridge.</div><Button onClick={()=>load()} className="mt-2 w-full bg-fuchsia-600/80 text-white hover:bg-fuchsia-500/90">Reload Default Cartridge</Button><div className="mt-4 text-sm font-semibold">XP Pool</div><div className="mt-2 flex items-center justify-between text-xs"><span className="text-zinc-300">XP</span><div className="flex items-center gap-2"><Input type="number" value={xp} onChange={e=>setXp(Number(e.target.value||0))} className="h-7 w-24 bg-zinc-950/60" /><Button size="sm" variant="secondary" onClick={()=>setXp(xp+10)} className="border border-white/10 bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800/90">+10</Button></div></div></div>
            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-zinc-950/60 p-3"><div className="text-sm font-semibold">Clothing Editor</div><div className="mt-2 grid grid-cols-1 gap-2 text-xs">{(b.clothing||[]).map((c:any,i:number)=>(<div key={i} className="rounded-xl border border-white/10 bg-zinc-950/50 p-2"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-zinc-200">{(c.category||c.slot)?.toUpperCase()} • {c.name}</div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-1"><span className="text-zinc-400">Integrity</span><Input type="number" className="h-7 w-20 bg-zinc-950/60" value={c.integrity} onChange={e=>setCl(i,"integrity",Number(e.target.value))}/></label><label className="flex items-center gap-1"><span className="text-zinc-400">Reveal</span><Input type="number" className="h-7 w-20 bg-zinc-950/60" value={c.reveal} onChange={e=>setCl(i,"reveal",Number(e.target.value))}/></label>{"wetness" in c? <label className="flex items-center gap-1"><span className="text-zinc-400">Wetness</span><Input type="number" className="h-7 w-20 bg-zinc-950/60" value={c.wetness||0} onChange={e=>setCl(i,"wetness",Number(e.target.value))}/></label> : null}</div></div></div>))}{!b.clothing?.length&&<div className="text-zinc-400">No equipped clothing.</div>}</div></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <Header/>
      <SettingsDialogEl/>

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
