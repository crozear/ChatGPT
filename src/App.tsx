// App.tsx (or wherever your root state is)
import React, {useCallback as C, useEffect as E, useMemo as M, useRef as R, useState as S} from "react";
import Button from "./components/ui/button";
import * as L5 from "./lib/engine";
import cart from "./lib/ui.cartridge.json";

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const RANKS:[L5.Rank,number][]=[["S",100],["A",80],["B",60],["C",40],["D",20],["F",0]],DCM:Record<L5.Rank,number>={F:-10,D:-5,C:0,B:5,A:10,S:15};
const rank=(p:number):L5.Rank=>{for(const[r,m]of RANKS)if(p>=m)return r;return"F"};
const CAR={version:"v0.7",coreStats:[{id:"awareness",name:"Awareness",value:0,max:100},{id:"purity",name:"Purity",value:68,max:100},{id:"physique",name:"Physique",value:54,max:100},{id:"will",name:"Willpower",value:62,max:100},{id:"beauty",name:"Beauty",value:71,max:100},{id:"promiscuity",name:"Promiscuity",value:36,max:100},{id:"exhibitionism",name:"Exhibitionism",value:28,max:100},{id:"deviancy",name:"Deviancy",value:12,max:100}],innocence:{active:true},conditions:{pain:12,arousal:38,fatigue:8,stress:17,trauma:4,control:74,allure:22},equippedClothing:[{slot:"top",name:"School Blouse",integrity:88,reveal:12,wetness:0,visible:true},{slot:"bottom",name:"Pleated Skirt",integrity:82,reveal:26,wetness:0,visible:true},{slot:"underwear",name:"Frilly Cotton Panties",integrity:76,reveal:38,wetness:42,visible:false}],sexSkills:[{name:"Seduction",rank:"A",pct:81}],skillNodes:[],econRules:[],statMeta:{awareness:{thresholds:[0,1,10,20,30,40,50,100]},innocence:{thresholds:[-20,-19,-16,-12,-8,-4,0]},beauty:{}}};
const CN={p:"p-3",b:"border border-white/10",r:"rounded-2xl",g:"bg-zinc-900/80",z:"bg-zinc-950/60",t:"text-zinc-100",s:"text-zinc-300",x:"text-zinc-400"};
const BOX=`${CN.b} ${CN.r} ${CN.g}`;
const get=(o:any,p:string)=>p.split('.').reduce((a:any,k:string)=>a?.[k],o);
const Gauge=({v,max}:{v:number;max:number})=>{const p=clamp((v/max)*100,0,100);return(<div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-zinc-800"><div style={{width:`${p}%`}} className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500"/></div>)};
const Slider=({label,value,min=0,max=100,step=1,onChange}:{label:string;value:number;min?:number;max?:number;step?:number;onChange:(n:number)=>void})=> (<div className="grid gap-1"><span className={`text-xs ${CN.x}`}>{label}: <span className={`${CN.t} font-medium`}>{value}</span></span><input type="range" min={min} max={max} step={step} value={value} onInput={(e:any)=>onChange(+e.target.value)} className="w-full"/></div>);
const DEFAULT_COND:{[k:string]:string[]}={
  pain:["You feel okay.","You are upset.","Tears well in your eyes.","Tears run down your face.","You are crying.","You cry and whimper.","You sob uncontrollably."],
  arousal:["You feel cold.","You feel sensual.","You feel aroused.","You feel lustful.","You feel horny.","A heat rises within.","You shake with arousal."],
  fatigue:["You are refreshed.","You are wide awake.","You are alert.","You are wearied.","You are tired.","You are fatigued.","You are exhausted."],
  stress:["You are serene.","You are placid.","You are calm.","You are tense.","You are strained.","You are distressed.","You are overwhelmed!"],
  trauma:["You are healthy.","You are uneasy.","You are nervous.","You are troubled.","You are disturbed.","You are tormented.","You feel numb."],
  control:["You are confident.","You are insecure.","You are worried.","You are anxious.","You are scared.","You are frightened.","You are terrified."]
};
const stageOf=(s:{id:string;value:number;max:number;meta?:any;desc?:string},m:any)=>{const M=m?.[s?.id]||s?.meta;if(M?.thresholds&&M?.stages){const th=M.thresholds;let i=th.filter((t:number)=>(s.value??0)>=t).length-1;i=clamp(i,0,(M.stages.length-1));return{stage:M.stages[i],summary:M.summary||s.desc||"",index:i,steps:M.stages.length}}const steps=(M?.stages?.length)||7;const i=clamp(Math.round(((s.value||0)/(s.max||1))*(steps-1)),0,steps-1);return{stage:M?.stages?M.stages[i]:"",summary:M?.summary||s.desc||"",index:i,steps}};
const integ=(n:number)=>n<=0?"destroyed":n<20?"tattered":n<50?"torn":n<90?"frayed":"undamaged";
const wetlab=(n:number)=>n>=100?"soaked through (transparent)":n>=80?"wet":n>=50?"damp":n<40?"dry":n<70?"drying out":n<90?"dry enough to conceal":"";
const cat=(s:string)=>s==="top"?"tops":s==="bottom"?"bottoms":s==="underwear"?"under bottoms":s==="under_top"?"under tops":s==="outfit"?"outfits":s;
const condText=(b:any,k:string,v:number)=>{const H:Record<string,number[]>={pain:[0,1,20,40,60,80,100],arousal:[0,1,20,40,60,80,100],fatigue:[0,1,20,40,60,80,100],stress:[0,1,20,40,60,80,100],trauma:[0,1,20,40,60,80,100],control:[0,20,40,60,70,80,100]};const th=H[k]||[0];let i=0;for(let t=0;t<th.length;t++)if(v>=th[t])i=t;const lab=b?.text?.conditions?.[k];if(lab?.length)return lab[i]||"";return DEFAULT_COND[k]?.[i]||""};
const Card=({s,meta,onChange,awMode,onGainAw,desc}:{s:any;meta:any;onChange:(id:string,v:number)=>void;awMode?:boolean;onGainAw?:(n:number)=>void;desc?:string})=>{const i=stageOf(s,meta),[drag,setD]=S(false),[tmp,setT]=S(+s.value||0);E(()=>{if(!drag&&!awMode)setT(+s.value||0)},[s.value,drag,awMode]);return(<div className={`${BOX} ${CN.p}`}><div className="flex items-center justify-between"><div className={`text-sm font-semibold ${CN.t}`}>{s.name}</div><div className={`text-xs ${CN.s}`}>{s.value}/{s.max}</div></div><div className={`mt-1 text-xs ${CN.s}`}>{desc||s.desc||""}</div><Gauge v={s.value||0} max={s.max||100}/><div className={`mt-2 ${CN.b} ${CN.r} ${CN.z} p-2`}><div className={`text-[11px] ${CN.t}`}>Stage: {i.stage}{i.steps?` • ${i.index}/${i.steps-1}`:""}</div><div className={`mt-1 text-[11px] ${CN.x}`}>{i.summary}</div></div><div className="mt-2 grid gap-1">{awMode?(<><span className={`text-xs ${CN.x}`}>Gain Awareness: <span className={`${CN.t} font-medium`}>{tmp}</span></span><input type="range" min={0} max={s.max||100} step={1} value={tmp} onInput={(e:any)=>{const v=+e.target.value;const d=Math.max(0,v-tmp);setT(v);onGainAw&&onGainAw(d)}} onPointerUp={()=>setT(0)} className="w-full"/><div className={`text-[11px] ${CN.x}`}>Awareness reduces Innocence first, then fills Awareness.</div></>):(<><span className={`text-xs ${CN.x}`}>Adjust: <span className={`${CN.t} font-medium`}>{tmp}</span></span><input type="range" min={0} max={s.max||100} step={1} value={tmp} onPointerDown={()=>setD(true)} onPointerUp={()=>setD(false)} onMouseUp={()=>setD(false)} onTouchEnd={()=>setD(false)} onInput={(e:any)=>{const v=+e.target.value;setT(v);onChange(s.id,v)}} className="w-full"/></>)}</div></div>)};
const allureCalc=(cs:any[],bi:number,vis:{piss:boolean;slime:boolean;cum:boolean;femcum:boolean})=>{const tr=(c:any)=>(c?.wetness||0)>=100,vs=(c:any)=>!!c?.visible,cv=(a:string[])=>cs.some((c:any)=>a.includes(c.slot)&&vs(c)&&!tr(c)),tp=cv(["top","outfit"]),bt=cv(["bottom","outfit"]),ut=cs.find((c:any)=>c.slot==="under_top"),ub=cs.find((c:any)=>c.slot==="underwear"),utv=!!ut&&vs(ut)&&!tp&&!tr(ut),ubv=!!ub&&vs(ub)&&!bt&&!tr(ub),ce=!tp&&(!ut||tr(ut)),le=!bt&&(!ub||tr(ub)),rv=cs.reduce((a:number,c:any)=>a+((vs(c)&&!tr(c))?Math.round((+c.reveal||0)/10):0),0),fl=5*[vis.piss,vis.slime,vis.cum,vis.femcum].filter(Boolean).length;return clamp(rv+(ce?10:0)+(le?10:0)+(utv?5:0)+(ubv?5:0)+5*bi+fl,0,100)};
const innStage=(v:number)=>({stage:v===-20?"You are oblivious.":v<=-17?"You are naive.":v<=-13?"You are trusting.":v<=-9?"You are curious.":v<=-5?"You are perplexed.":"You are uncertain.",index:v===-20?0:v<=-17?1:v<=-13?2:v<=-9?3:v<=-5?4:5,steps:6});
const pLab=(x:number)=>x<1?"Micro":x<3?"Tiny":x<5?"Small":x<7?"Normal":x<10?"Large":x<=12?"Huge":"";
const aDesc=(n:number)=>n>=60?"You look like you need to be ravaged.":n>=40?"You look perverted.":n>=30?"You look lewd.":n>=20?"You stand out.":n>=15?"You attract attention.":n>=10?"You attract glances.":"You look unremarkable.";
export default function App(){
  const LS="v0.7";
  const [b, setB] = S(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS) || "{}");
      const prev  = saved.bundle || { ...CAR, clothing: CAR.equippedClothing };
      return {
        ...prev,
        fluids: prev.fluids || cart.fluids,
        tuning: prev.tuning || cart.tuning,
        wet:    prev.wet    || { vagina: 60, anus: 0, penis: 0 },
        minutesPerTurn: prev.minutesPerTurn ?? (saved.turnMins ?? 10),
      };
    } catch {
      return {
        ...CAR,
        clothing: CAR.equippedClothing,
        fluids: cart.fluids,
        tuning: cart.tuning,
        wet: { vagina: 60, anus: 0, penis: 0 },
        minutesPerTurn: 10,
      };
    }
  });
  const coreVal = C((id:string) =>
  +(b.coreStats?.find((s:any)=>s.id===id)?.value || 0),
  [b.coreStats]
  );

  const toEngine = C((): L5.EngineState => ({
    fluids: b.fluids,
    wet: b.wet,
    clothing: b.clothing || [],
    core: {
      awareness: coreVal("awareness"),
      purity: coreVal("purity"),
      physique: coreVal("physique"),
      will: coreVal("will"),
      beauty: coreVal("beauty"),
      promiscuity: coreVal("promiscuity"),
      exhibitionism: coreVal("exhibitionism"),
      deviancy: coreVal("deviancy"),
    },
    cond: b.conditions,
    minutesPerTurn: b.minutesPerTurn ?? 10,
    tuning: b.tuning,
  }), [b, coreVal]);

  const applyEngine = C((s: L5.EngineState) => {
    setB((prev: any) => ({
      ...prev,
      wet: s.wet,
      clothing: s.clothing,
      conditions: s.cond,
      fluids: s.fluids,
      tuning: s.tuning,
      minutesPerTurn: s.minutesPerTurn,
    }));
  }, []);

  const save = C((next:any) => setB(next), []);
  const tx=C((p:any,fb="")=>get(b?.text||{},p)??fb,[b]);
  const[loc,setLoc]=S(()=>{try{return JSON.parse(localStorage.getItem(LS)||"{}").location||"The Dungeon"}catch{return"The Dungeon"}});
  const[int,setInt]=S(()=>{try{return JSON.parse(localStorage.getItem(LS)||"{}").intensity||2}catch{return 2}});
  const[hasP,setHP]=S(()=>{try{return!!JSON.parse(localStorage.getItem(LS)||"{}").hasPenis}catch{return true}});
  const[pIn,setPIn]=S(()=>{try{return +JSON.parse(localStorage.getItem(LS)||"{}").penisInches||6}catch{return 6}});
  const[hasV,setHV]=S(()=>{try{return!!JSON.parse(localStorage.getItem(LS)||"{}").hasVagina}catch{return true}});
  const[vDep,setVD]=S(()=>{try{return +JSON.parse(localStorage.getItem(LS)||"{}").vagDepth||6}catch{return 6}});
  const[vWid,setVW]=S(()=>{try{return +JSON.parse(localStorage.getItem(LS)||"{}").vagWidth||1.5}catch{return 1.5}});
  const[tits,setTits]=S(()=>{try{return JSON.parse(localStorage.getItem(LS)||"{}").titsSize||"Modest (C)"}catch{return"Modest (C)"}});
  const[ass,setAss]=S(()=>{try{return JSON.parse(localStorage.getItem(LS)||"{}").assSize||"Round"}catch{return"Round"}});
  const[gender,setG]=S(()=>{try{return JSON.parse(localStorage.getItem(LS)||"{}").gender||"Female"}catch{return"Female"}});
  const[visF,setVF]=S(()=>{try{return JSON.parse(localStorage.getItem(LS)||"{}").visibleFluids||{piss:false,slime:false,cum:false,femcum:false}}catch{return{piss:false,slime:false,cum:false,femcum:false}}});
  const[turn,setTurn]=S(()=>{try{return +JSON.parse(localStorage.getItem(LS)||"{}").turnMins||10}catch{return 10}});
  const[inn,setInn]=S(()=>{try{const o=JSON.parse(localStorage.getItem(LS)||"{}");const v=o.innocencePool;return(v===undefined||v===null||Number.isNaN(+v))?-20:+v}catch{return-20}});
  const[stored,setStored]=S(()=>{try{return +JSON.parse(localStorage.getItem(LS)||"{}").storedTrauma||0}catch{return 0}});
  const[tShadow,setTShadow]=S(()=>{try{return +JSON.parse(localStorage.getItem(LS)||"{}").tShadow||0}catch{return 0}});
  const[stash,setStash]=S(()=>{try{return JSON.parse(localStorage.getItem(LS)||"{}").stash||[]}catch{return[]}});
  const[log,setLog]=S(()=>{try{return JSON.parse(localStorage.getItem(LS)||"{}").log||["Session ready."]}catch{return["Session ready."]}});
  const push=C((x:any)=>setLog((l:any)=>[`${new Date().toLocaleTimeString()}  ${x}`,...l].slice(0,200)),[]);
  const[ri,setRI]=S(0),[dc,setDC]=S(12),[last,setLast]=S<any>(null);
  const beauty=coreVal("beauty");
  const innocActive=(inn<0);const prevInRef=R(innocActive);
  const setCore=C((id:string,val:number)=>setB((b:any)=>{if(id!=="awareness")return{...b,coreStats:(b.coreStats||[]).map((s:any)=>s.id===id?{...s,value:clamp((val|0),0,s.max||100)}:s)};if(innocActive)return{...b,coreStats:(b.coreStats||[]).map((s:any)=>s.id==="awareness"?{...s,value:0}:s)};return{...b,coreStats:(b.coreStats||[]).map((s:any)=>s.id==="awareness"?{...s,value:clamp((val|0),0,s.max||100)}:s)}}),[innocActive]);
  const gainAw=C((am:number)=>setB((b:any)=>{const a=[...(b.coreStats||[])],i=a.findIndex((s:any)=>s.id==="awareness"),cur=+(a[i]?.value||0),mx=+(a[i]?.max||100);if(innocActive){const need=-inn;if(am<=need){setInn((p:number)=>p+am);push(`Innocence reduced by ${am}`);return{...b,coreStats:a.map((s:any,k:number)=>k===i?{...s,value:0}:s)}}const rem=am-need;setInn(0);const nv=clamp(cur+rem,0,mx);push(`Innocence ended; Awareness +${rem}`);return{...b,coreStats:a.map((s:any,k:number)=>k===i?{...s,value:nv}:s)}}const nv=clamp(cur+am,0,mx);return{...b,coreStats:a.map((s:any,k:number)=>k===i?{...s,value:nv}:s)}}),[innocActive,push]);
  const setCond=C((k:string,val:number)=>{if(k==="arousal"){const prev=+(b.conditions.arousal||0);const will=coreVal("will");const t=(b as any).tuning||cart.tuning;const r=L5.applyStimulation(prev,will,val-prev,t);const coreSnapshot={awareness:coreVal("awareness"),purity:coreVal("purity"),physique:coreVal("physique"),will,beauty:coreVal("beauty"),promiscuity:coreVal("promiscuity"),exhibitionism:coreVal("exhibitionism"),deviancy:coreVal("deviancy")};const eng={fluids:b.fluids||cart.fluids,wet:{...b.wet},clothing:b.clothing||[],core:coreSnapshot,cond:{...b.conditions,arousal:r.arousal},minutesPerTurn:turn,tuning:t};const next=L5.tickBodyWetness(eng,prev,false);setB((bb:any)=>({...bb,wet:next.wet,conditions:{...bb.conditions,arousal:r.arousal}}));if(r.stunnedTurns)push(`Orgasm → stunned ${r.stunnedTurns} turn${r.stunnedTurns===1?"":"s"}`);return}if(k!=="trauma"){setB((b:any)=>({...b,conditions:{...(b.conditions||{}),[k]:clamp((val|0),0,100)}}));return}const tgt=clamp((val|0),0,100);if(innocActive){const d=tgt-tShadow;if(d>0){setStored((t:number)=>clamp(t+d,0,100));setTShadow(tgt);push(`Trauma ${d} banked under Innocence`);return}if(d<0){let rem=-d,used=0;setStored((t:number)=>{used=Math.min(t,rem);return t-used});rem-=used;setTShadow(tgt);if(rem>0)setB((b:any)=>{const cur=+(b.conditions?.trauma||0);return{...b,conditions:{...b.conditions,trauma:clamp(cur-rem,0,100)}}});return}setTShadow(tgt);return}setTShadow(tgt);setB((b:any)=>({...b,conditions:{...(b.conditions||{}),trauma:tgt}}))},[innocActive,tShadow,push,turn,coreVal,b.conditions,b.clothing,b.fluids,b.wet,b.tuning]);
    // track the last committed arousal and a draft while dragging
  const lastACommitRef = R<number>(b.conditions?.arousal ?? 0);
  const arousalDraftRef = R<number | null>(null);

  E(() => {
    if (arousalDraftRef.current === null) {
      lastACommitRef.current = b.conditions?.arousal ?? 0;
    }
  }, [b.conditions?.arousal]);

  const commitArousal = (finalVal: number) => {
    const prev = lastACommitRef.current;
    const will = coreVal("will");
    const t = (b as any).tuning || cart.tuning;
    const r = L5.applyStimulation(prev, will, finalVal - prev, t);

    const eng = {
      fluids: b.fluids || cart.fluids,
      wet: { ...(b.wet || {vagina:0, anus:0, penis:0}) },
      clothing: b.clothing || [],
      core: {
        awareness:coreVal("awareness"),
        purity:coreVal("purity"),
        physique:coreVal("physique"),
        will,
        beauty:coreVal("beauty"),
        promiscuity:coreVal("promiscuity"),
        exhibitionism:coreVal("exhibitionism"),
        deviancy:coreVal("deviancy"),
      },
      cond: { ...b.conditions, arousal: r.arousal },
      minutesPerTurn: b.minutesPerTurn ?? 10,
      tuning: t
    };

    let next = L5.tickBodyWetness(eng, prev, false);
    if (!hasP) next.wet.penis = 0; // no-penis clamp
    
    setB((bb:any) => ({ ...bb, wet: next.wet, conditions: { ...(bb.conditions||{}), arousal: r.arousal } }));
    if (r.stunnedTurns) push(`Orgasm → stunned ${r.stunnedTurns} turn${r.stunnedTurns===1?"":"s"}`);
    lastACommitRef.current = r.arousal;
    arousalDraftRef.current = null;
  };
  
  // generic handlers used by the mapped sliders
  const handleCondChange = C((k:string, n:number) => {
    if (k !== "arousal") { setCond(k, n); return; }
    // while dragging arousal: update the visible number only
    arousalDraftRef.current = n;
    setB((p:any) => ({ ...p, conditions:{ ...p.conditions, arousal:n }}));
  }, [setCond, b]);

  const handleCondCommit = C((k:string) => {
    if (k !== "arousal") return;
    const v = arousalDraftRef.current ?? (b.conditions?.arousal ?? 0);
    commitArousal(v);
  }, [b.conditions?.arousal, commitArousal]);
  E(()=>{if(prevInRef.current&&!innocActive){if(stored>0){setB((b:any)=>({...b,conditions:{...b.conditions,trauma:clamp((b.conditions?.trauma||0)+stored,0,100)}}));push(`Innocence ended — applied ${stored} stored trauma.`);setStored(0)}else push("Innocence ended.")}prevInRef.current=innocActive},[innocActive,stored,push]);
  const sex=(()=>{const i=["Flat (Flat/AAA)","Budding (AA)","Tiny (A)","Small (B)","Modest (C)","Full (D)","Large (DD)","Huge (E+)"].indexOf(tits),big=i>=2,flat=i<=1;return hasP&&!hasV?(big?"Dick-Girl":"Male"):!hasP&&hasV?(flat?"Cunt-Boy":"Female"):hasP&&hasV?(big?"Futa":"Herm"):"Androgynous"})();
  const bIdx=M(()=>stageOf({id:"beauty",value:beauty,max:100},b.statMeta||{}).index??0,[beauty,b.statMeta]);
  E(()=>setB((b:any)=>{const p=(b.clothing||[]).map((c:any)=>("visible"in c)?c:{...c,visible:c.slot!=="underwear"});return{...b,clothing:p}}),[]);
  const allure=M(()=>allureCalc((b.clothing||[]),bIdx,visF),[b.clothing,bIdx,visF]);
  E(()=>setB((x:any)=>({...x,conditions:{...x.conditions,allure}})),[allure]);
  const setPct=C((i:number,val:number)=>setB((b:any)=>{const ss=[...(b.sexSkills||[])];if(!ss[i])return b;const pct=clamp((val|0),0,100),r=rank(pct);ss[i]={...ss[i],pct,rank:r};return({...b,sexSkills:ss})}),[]);
  const roll=C(()=>{const s=b.sexSkills?.[ri];if(!s){push("No skill selected.");return}const r=rank(s.pct),dm=DCM[r]??0,d=1+Math.floor(Math.random()*20),ef=d+dm,ok=ef>=dc;setLast({text:ok?"SUCCESS":"FAIL",color:ok?"text-emerald-400":"text-rose-400"});push(`Check: ${s.name} | d20:${d} (${r} ${dm>=0?"+":""}${dm} → ${ef}) vs DC ${dc} → ${ok?"SUCCESS":"FAIL"}`)},[b.sexSkills,ri,dc,push]);
  const addIt=C(()=>setStash((s:any)=>[...s,{id:(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`),kind:"misc",name:"New item",qty:1}]),[]), updIt=C((id:string,p:any)=>setStash((s:any[])=>s.map((i:any)=>i.id===id?{...i,...p}:i)),[]), delIt=C((id:string)=>setStash((s:any[])=>s.filter((i:any)=>i.id!==id)),[]);
  const ex=()=>{const out={version:b.version||CAR.version,coreStats:b.coreStats,innocence:b.innocence,conditions:b.conditions,equippedClothing:b.clothing,sexSkills:b.sexSkills,skillNodes:b.skillNodes,econRules:b.econRules,statMeta:b.statMeta,text:b.text,body:{hasPenis:hasP,penisInches:pIn,penisWetness:b.wet.penis,hasVagina:hasV,vaginaDepthIn:vDep,vaginaWidthIn:vWid,vaginaWetness:b.wet.vagina,anusWetness:b.wet.anus,titsSize:tits,assSize:ass,sex,gender,visibleFluids:visF},run:{location:loc,intensity:int},stash};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out)],{type:'application/json'}));a.download='ui.cartridge.json';a.click();URL.revokeObjectURL(a.href)};
  const im=(e:any)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(String(r.result));setB((b:any)=>({...b,version:j.version||b.version,coreStats:j.coreStats||b.coreStats,innocence:j.innocence||b.innocence,conditions:j.conditions||b.conditions,clothing:(j.equippedClothing||j.clothing||b.clothing)?.map((c:any)=>({visible:c.slot!=="underwear",...c})),sexSkills:j.sexSkills||b.sexSkills,skillNodes:j.skillNodes||b.skillNodes,econRules:j.econRules||b.econRules,statMeta:j.statMeta||b.statMeta,text:j.text||b.text}));if(j.body){setB((p:any)=>({...p,wet:{...p.wet,vagina:clamp(+((j.body.vaginaWetness??p.wet?.vagina??0)),0,120),penis:clamp(+((j.body.penisWetness??p.wet?.penis??0)),0,120),anus:clamp(+((j.body.anusWetness??p.wet?.anus??0)),0,120)}}))}if(j.run){setLoc(j.run.location||loc);setInt(+j.run.intensity||int)}if(j.stash)setStash(j.stash);push('Imported ui.cartridge.json')}catch{push('Import failed: invalid JSON')}};r.readAsText(f)};
  const innS=M(()=>innStage(inn),[inn]);
  const d20 = () => 1 + Math.floor(Math.random() * 20);
  const labelFromLength = (len: number) =>
    len < 1  ? "Micro" :
    len < 3  ? "Tiny"  :
    len < 5  ? "Small" :
    len < 7  ? "Normal":
    len < 10 ? "Large" : "Huge";
  const diaFromLabel = (lab: string) =>
    lab === "Micro" ? 0.8 :
    lab === "Tiny"  ? 1.0 :
    lab === "Small" ? 1.2 :
    lab === "Normal"? 1.4 :
    lab === "Large" ? 1.6 : 1.8;
  const auto=C(()=>{const inEncounter=!!(b as any)?.encounter?.active;const prevA=+(b.conditions.arousal||0);const t=(b as any).tuning||cart.tuning;const coreSnapshot={awareness:coreVal("awareness"),purity:coreVal("purity"),physique:coreVal("physique"),will:coreVal("will"),beauty:coreVal("beauty"),promiscuity:coreVal("promiscuity"),exhibitionism:coreVal("exhibitionism"),deviancy:coreVal("deviancy")};const eng={fluids:b.fluids||cart.fluids,wet:{...b.wet},clothing:b.clothing||[],core:coreSnapshot,cond:{...b.conditions},minutesPerTurn:turn,tuning:t};let s=L5.tickBodyWetness(eng,prevA,inEncounter);if (!hasP) s.wet.penis = 0;s=L5.transferLewdToClothes(s);      // simple passive decays on the engine result
  s.cond.pain = L5.clamp(s.cond.pain - (1 + Math.floor(s.core.will / 50)), 0, 200);
  if (s.cond.control >= 60) s.cond.stress = L5.clamp(s.cond.stress - 1, 0, 100);s=L5.dryClothes(s);setB((prev:any)=>({...prev,wet:s.wet,conditions:s.cond,clothing:s.clothing}))},[b,turn,coreVal,hasP]);
  E(()=>setB((prev:any)=>prev.minutesPerTurn===turn?prev:{...prev,minutesPerTurn:turn}),[turn]);
  E(()=>{if(typeof localStorage==="undefined")return;const bundle={...b,clothing:b.clothing||[],fluids:b.fluids||cart.fluids,tuning:b.tuning||cart.tuning,wet:b.wet,minutesPerTurn:b.minutesPerTurn??turn};const payload={bundle,location:loc,intensity:int,hasPenis:hasP,penisInches:pIn,hasVagina:hasV,vagDepth:vDep,vagWidth:vWid,titsSize:tits,assSize:ass,gender,visibleFluids:visF,turnMins:turn,innocencePool:inn,storedTrauma:stored,tShadow,stash,log};try{localStorage.setItem(LS,JSON.stringify(payload))}catch{}},[LS,b,loc,int,hasP,pIn,hasV,vDep,vWid,tits,ass,gender,visF,turn,inn,stored,tShadow,stash,log]);
  const Tabs=("Character|Attributes|Inventory|Skill Tree|Misc").split('|');
  const[tab,setTab]=S("Character");
  const Btn=({t}:{t:string})=>(<button onClick={()=>setTab(t)} className={`px-3 py-1.5 ${CN.r} ${CN.b} ${tab===t?"bg-zinc-800 border-white/20 text-zinc-100":"bg-zinc-900/60 border-white/10 text-zinc-300"}`}>{t}</button>);
  return(<div className={`${CN.p} text-zinc-100`}>
    <div className="mb-3 flex flex-wrap items-center gap-2"><div className="text-sm">UI synced to cartridge</div><div className="flex items-center gap-2 text-sm"><span>Skill</span><select className="h-7 rounded bg-zinc-950/60 border border-white/10 text-zinc-100" value={ri} onChange={e=>setRI(+e.target.value)}>{(b.sexSkills||[]).map((s:any,i:number)=>(<option key={i} value={i}>{s.name}</option>))}</select><span>DC</span><input type="number" className="h-7 w-16 rounded border border-white/10 bg-zinc-950/60 px-2" value={dc} onChange={e=>setDC(clamp(+e.target.value||0,1,40))}/><button className="h-7 rounded border border-white/10 bg-zinc-900/80 px-2" onClick={roll}>Roll d20</button>{last&&<span className={`ml-2 text-xs ${last.color}`}>{last.text}</span>}</div><div className="ml-auto flex items-center gap-2 text-sm"><span>Location</span><input className="h-7 w-40 rounded border border-white/10 bg-zinc-950/60 px-2" value={loc} onChange={e=>setLoc(e.target.value)}/><span>Intensity</span><input type="number" className="h-7 w-16 rounded border border-white/10 bg-zinc-950/60 px-2" value={int} onChange={e=>setInt(clamp(+e.target.value||0,0,5))}/></div></div>
    <div className="mb-3 flex flex-wrap gap-2">{Tabs.map(t=><Btn key={t} t={t}/> )}</div>
    {tab==="Character"&&(<div className="grid grid-cols-2 gap-4">
      <div className="col-span-1"><div className={`${BOX} ${CN.p}`}><div className="flex items-center justify-between"><div className="text-lg font-semibold">Conditions</div><div className={`text-xs ${CN.s} flex items-center gap-2`}><span>Sex: <span className={`${CN.t} font-semibold`}>{sex}</span></span><span>Gender:</span><select className="h-7 rounded bg-zinc-950/60 border border-white/10 text-zinc-100" value={gender} onChange={e=>setG(e.target.value)}>{["Male","Female","Trans Male","Trans Female","Non-Binary"].map(g=>(<option key={g} value={g}>{g}</option>))}</select>{!innocActive?<button className="ml-2 h-7 rounded border border-white/10 bg-zinc-900/80 px-2" onClick={()=>{setInn(-20);setB((b:any)=>({...b,coreStats:(b.coreStats||[]).map((s:any)=>s.id==="awareness"?{...s,value:0}:s)}));push('Innocence started at 20/20')}}>Start Innocence</button>:<button className="ml-2 h-7 rounded border border-white/10 bg-zinc-900/80 px-2" onClick={()=>{setInn(0);push('Innocence ended manually')}}>End Innocence</button>}</div></div>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {["pain","arousal","fatigue","stress","control"].map(k => {
            const v = +(b.conditions?.[k] || 0);
            return (
              <div
                key={k}
                className={`${CN.r} ${CN.b} ${CN.z} p-2`}
                onPointerUp={() => handleCondCommit(k)}
                onTouchEnd={() => handleCondCommit(k)}
                
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize text-zinc-200">{k}</span>
                  <span className={`text-[10px] ${CN.s}`}>{v}</span>
                </div>
                <Gauge v={v} max={100}/>
                <div className={`mt-1 text-[11px] ${CN.x}`}>{condText(b,k,v)}</div>
                <div className="mt-2">
                  <Slider
                    label="Adjust"
                    value={v}
                    onChange={(n)=>handleCondChange(k,n)}
                    // If your Slider supports it, you can also add:
                    // onChangeEnd={() => handleCondCommit(k)}
                  />
                </div>
              </div>
            );
          })}
          {innocActive&&(<div className={`${CN.r} ${CN.b} ${CN.z} p-2`}><div className="flex items-center justify-between text-xs"><span className="text-zinc-200">Innocence</span><span className={`text-[10px] ${CN.s}`}>{Math.abs(inn)}/20</span></div><Gauge v={Math.abs(inn)} max={20}/><div className={`mt-1 text-[11px] ${CN.x}`}>{innS.stage}</div><div className={`mt-1 text-[11px] ${CN.x}`}>Stored trauma: {stored}</div></div>)}
          <div className={`${CN.r} ${CN.b} ${CN.z} p-2`}><div className="flex items-center justify-between text-xs"><span className="text-zinc-200">Trauma</span><span className={`text-[10px] ${CN.s}`}>{+(b.conditions?.trauma||0)}</span></div><Gauge v={+(b.conditions?.trauma||0)} max={100}/><div className={`mt-1 text-[11px] ${CN.x}`}>{condText(b,"trauma",+(b.conditions?.trauma||0))}</div><div className="mt-2"><Slider label="Adjust" value={+(b.conditions?.trauma||0)} onChange={n=>setCond("trauma",n)}/></div></div>
          <div className={`${CN.r} ${CN.b} ${CN.z} p-2`}><div className="flex items-center justify-between text-xs"><span className="text-zinc-200">Allure (calculated)</span><span className={`text-[10px] ${CN.s}`}>{b.conditions?.allure||0}</span></div><Gauge v={+(b.conditions?.allure||0)} max={100}/><div className={`mt-1 text-[11px] ${CN.x}`}>{tx('ui.allureDesc','') || aDesc(+(b.conditions?.allure||0))}</div><div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-zinc-300"><label className="flex items-center gap-2"><input type="checkbox" checked={visF.piss} onChange={e=>setVF((f:any)=>({...f,piss:e.target.checked}))}/>Piss visible</label><label className="flex items-center gap-2"><input type="checkbox" checked={visF.slime} onChange={e=>setVF((f:any)=>({...f,slime:e.target.checked}))}/>Slime visible</label><label className="flex items-center gap-2"><input type="checkbox" checked={visF.cum} onChange={e=>setVF((f:any)=>({...f,cum:e.target.checked}))}/>Cum visible</label><label className="flex items-center gap-2"><input type="checkbox" checked={visF.femcum} onChange={e=>setVF((f:any)=>({...f,femcum:e.target.checked}))}/>Femcum visible</label></div></div></div>
        </div></div>
      <div className="col-span-1"><div className={`${BOX} ${CN.p}`}><div className={`text-lg font-semibold ${CN.t}`}>Clothing</div><div className="mt-2 grid grid-cols-1 gap-2">{(b.clothing||[]).map((c:any,i:number)=>{const k=cat(c.slot),t=wetlab(+c.wetness||0),tr=(c.wetness||0)>=100;return(<div key={i} className={`${CN.r} ${CN.b} bg-zinc-950/50 p-2 text-xs`}><div className="flex items-center justify-between"><div className="text-zinc-200">{k.toUpperCase()} • {c.name}</div><div className={`flex items-center gap-2 ${CN.s}`}><span>{integ(c.integrity)}</span>{typeof c.reveal==='number'&&<span>Reveal {c.reveal}/100</span>}{"wetness"in c?<span>Wet {c.wetness}/200</span>:null}</div></div>{("wetness"in c)&&(<><Gauge v={c.wetness||0} max={200}/><div className={`mt-1 text-[11px] ${CN.x}`}>{t}{tr?" — acts as if not worn (transparent)":""}</div></>)}</div>)})}{!b.clothing?.length&&<div className={`text-xs ${CN.s}`}>None.</div>}</div><div className={`mt-3 ${CN.r} ${CN.b} ${CN.z} p-2 text-[11px] ${CN.s}`}><div className="flex items-center justify-between"><div className={`font-semibold ${CN.t}`}>Lewd wetness</div><div className="flex items-center gap-2"><span>Turn</span><input type="number" min={1} max={60} step={1} className="h-7 w-16 rounded border border-white/10 bg-zinc-900/70 px-2" value={turn} onChange={e=>setTurn(clamp(+e.target.value||0,1,60))}/><span>min</span><button className="h-7 rounded border border-white/10 bg-zinc-900/80 px-2" onClick={auto}>Apply 1 turn</button></div></div><div>{tx('ui.lewdWetness','')}</div></div>
        <div className={`mt-3 ${CN.r} ${CN.b} ${CN.z} p-2`}>
          <div className={`text-lg font-semibold ${CN.t}`}>Fluids & Body</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={hasP} onChange={e=>setHP(e.target.checked)}/>Penis</label>
            {hasP&&(<div className="flex items-center gap-2"><span>Size</span><input type="number" min={0.6} max={12} step={0.1} className="h-7 w-20 rounded border border-white/10 bg-zinc-900/70 px-2" value={pIn} onChange={e=>setPIn(clamp(+e.target.value||0,0.6,12))}/><span className="opacity-70">{pLab(pIn)}</span></div>)}
            <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={hasV} onChange={e=>setHV(e.target.checked)}/>Vagina</label>
            {hasV&&(<div className="grid grid-cols-2 gap-2"><div className="flex items-center gap-2"><span>Depth</span><input type="number" min={1} max={12} step={0.1} className="h-7 w-20 rounded border border-white/10 bg-zinc-900/70 px-2" value={vDep} onChange={e=>setVD(clamp(+e.target.value||0,1,12))}/></div><div className="flex items-center gap-2"><span>Width</span><input type="number" min={0.8} max={3} step={0.1} className="h-7 w-20 rounded border border-white/10 bg-zinc-900/70 px-2" value={vWid} onChange={e=>setVW(clamp(+e.target.value||0,0.8,3))}/></div></div>)}
            <div className="col-span-2 items-center flex gap-2"><span>Tits:</span><select className="h-7 rounded bg-zinc-950/60 border border-white/10 text-zinc-100" value={tits} onChange={e=>setTits(e.target.value)}>{["Flat (Flat/AAA)","Budding (AA)","Tiny (A)","Small (B)","Modest (C)","Full (D)","Large (DD)","Huge (E+)"].map(i=>(<option key={i} value={i}>{i}</option>))}</select></div>
            <div className="col-span-2 items-center flex gap-2"><span>Ass:</span><select className="h-7 rounded bg-zinc-950/60 border border-white/10 text-zinc-100" value={ass} onChange={e=>setAss(e.target.value)}>{["Slender","Modest","Round","Plump","Large","Huge"].map(i=>(<option key={i} value={i}>{i}</option>))}</select></div>
            <div className="col-span-3 grid grid-cols-3 gap-2">
              <Slider label="Vagina wetness" value={b.wet.vagina} max={120}
                onChange={n=>setB((x: { wet: any; })=>({...x, wet:{...x.wet, vagina:n}}))} />
              <Slider label="Anal wetness" value={b.wet.anus} max={120}
                onChange={n=>setB((x: { wet: any; })=>({...x, wet:{...x.wet, anus:n}}))} />
              <Slider label="Penis lube" value={b.wet.penis} max={120}
                onChange={n=>setB((x: { wet: any; })=>({...x, wet:{...x.wet, penis:n}}))} />
            </div>
          </div>
        </div>
      </div></div></div>)}
    {tab==="Attributes"&&(<div className="grid grid-cols-12 gap-4"><div className="col-span-12 lg:col-span-7"><div className={`${BOX} ${CN.p}`}><div className={`text-lg font-semibold ${CN.t}`}>Core Stats</div><div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">{(b.coreStats||[]).map((s:any)=>s.id==="awareness"?(<Card key={s.id} s={{...s,value:innocActive?0:s.value}} meta={b.statMeta||{}} awMode={innocActive} onGainAw={gainAw} onChange={setCore} desc={tx(`coreDesc.${s.id}`)}/>):(<Card key={s.id} s={s} meta={b.statMeta||{}} onChange={setCore} desc={tx(`coreDesc.${s.id}`)}/>))}</div></div></div><div className="col-span-12 lg:col-span-5"><div className={`${BOX} ${CN.p}`}><div className={`text-lg font-semibold ${CN.t}`}>Sexual Skills</div><div className="mt-2 grid gap-2">{(b.sexSkills||[]).map((s:any,i:number)=>(<div key={i} className={`${CN.r} ${CN.b} ${CN.z} p-2 text-xs`}><div className="flex items-center justify-between gap-2"><input className="h-7 flex-1 rounded bg-zinc-900/70 border border-white/10 px-2" value={s.name} onChange={e=>setB((b:any)=>{const ss=[...(b.sexSkills||[])];ss[i]={...ss[i],name:e.target.value};return{...b,sexSkills:ss}})}/><span className="rounded px-2 py-1 bg-zinc-900/70 border border-white/10 text-zinc-200">{rank(s.pct)} rank</span></div><div className="mt-2"><Slider label={`Proficiency ${s.pct}`} value={s.pct} onChange={v=>setPct(i,v)}/></div></div>))}</div><button className={`h-8 ${CN.r} ${CN.b} bg-zinc-900/80 px-3 text-xs`} onClick={()=>setB((b:any)=>({...b,sexSkills:[...(b.sexSkills||[]),{name:"New Skill",pct:0,rank:"F"}]}))}>Add skill</button>
</div></div></div>)}
    {tab==="Inventory"&&(<div className={`${BOX} ${CN.p}`}><div className={`text-lg font-semibold ${CN.t}`}>Stash</div><div className="mt-2 grid gap-2">{stash.map((i:any)=>(<div key={i.id} className={`${CN.r} ${CN.b} ${CN.z} p-2 text-xs flex items-center gap-2`}><input className="h-7 flex-1 rounded bg-zinc-900/70 border border-white/10 px-2" value={i.name} onChange={e=>updIt(i.id,{name:e.target.value})}/><input type="number" className="h-7 w-20 rounded bg-zinc-900/70 border border-white/10 px-2" value={i.qty} onChange={e=>updIt(i.id,{qty:+(e.target.value||0)})}/><select className="h-7 rounded bg-zinc-900/70 border border-white/10 px-2" value={i.kind} onChange={e=>updIt(i.id,{kind:e.target.value})}><option>misc</option><option>clothes</option><option>toy</option></select><button className="h-7 rounded border border-white/10 bg-rose-900/60 px-2" onClick={()=>delIt(i.id)}>Delete</button></div>))}{!stash.length&&<div className={`text-xs ${CN.s}`}>Empty.</div>}</div><div className="mt-2"><button className={`h-8 ${CN.r} ${CN.b} bg-zinc-900/80 px-3 text-xs`} onClick={addIt}>Add item</button></div></div>)}
    {tab==="Skill Tree"&&(<div className={`${BOX} ${CN.p}`}><div className={`text-lg font-semibold ${CN.t}`}>Skill Nodes</div><div className={`mt-2 text-xs ${CN.s}`}>No nodes defined yet. Import via JSON ("skillNodes").</div></div>)}
    {tab==="Misc"&&(<div className="grid grid-cols-12 gap-4"><div className="col-span-12 lg:col-span-7"><div className={`${BOX} ${CN.p}`}><div className={`text-lg font-semibold ${CN.t}`}>Event Log</div><div className={`${CN.r} ${CN.b} ${CN.z} mt-2 h-64 overflow-auto p-2 text-[11px] ${CN.s}`}>{log.map((l:any,i:number)=>(<div key={i} className="whitespace-pre">{l}</div>))}</div><div className="mt-2 flex gap-2"><button className={`h-8 ${CN.r} ${CN.b} bg-zinc-900/80 px-3 text-xs`} onClick={()=>setLog([])}>Clear</button>
<button className={`h-8 ${CN.r} ${CN.b} bg-zinc-900/80 px-3 text-xs`} onClick={ex}>Export JSON</button><label className={`h-8 ${CN.r} ${CN.b} bg-zinc-900/80 px-3 text-xs flex items-center cursor-pointer`}>Import<input type="file" accept="application/json" onChange={im} className="hidden"/></label><Button onClick={() => {
  const eng0 = toEngine();
  const s = { ...eng0, cond: { ...eng0.cond, arousal: b.conditions.arousal } };
  const next = L5.tickBodyWetness(s, 60, false);
  alert(`Wet after tick: vag=${next.wet.vagina} pen=${next.wet.penis} anus=${next.wet.anus}`);
}}>
  Smoke: self-lube tick
</Button>
<Button onClick={() => {
  const len = hasP ? pIn : 0;
  const lab = labelFromLength(len);
  const dia = diaFromLabel(lab);
  const skillPct = (b.sexSkills?.[ri]?.pct) ?? 40;
  const promiscuity = +((b.coreStats||[]).find((s:any)=>s.id==="promiscuity")?.value || 0);
  const physique    = +((b.coreStats||[]).find((s:any)=>s.id==="physique")?.value || 0);

  const gate = L5.penetrationGateDC({
    target: "vagina",
    penisLengthIn: len,
    penisDiaIn: dia,
    vagDepthIn: hasV ? vDep : undefined,
    vagWidthIn: hasV ? vWid : undefined,
    wetness: b.wet.vagina,                 // <-- use the separate wet state
    skillPct,
    promiscuity,
    physique,
    conditions: b.conditions,
    tuning: (b as any).tuning || cart.tuning
  });

  const roll  = d20();
  const total = roll + gate.totalMod;
  const ok    = total >= gate.dc;

  const painNext = L5.clamp((b.conditions?.pain||0) + (ok ? gate.painOnSuccess : gate.painOnFail), 0, 200);
  setB((prev:any)=>({...prev, conditions:{...prev.conditions, pain: painNext}}));

  // breakdown so you can see wetness effect
  push(`Gate: wet=${b.wet.vagina} skill=${skillPct}% rank=${gate.skillRank} wetBonus=${gate.wetBonus} sizeΔ=${gate.sizeDelta} depthPenalty=${gate.depthPenalty} | d20=${roll} + ${gate.totalMod} = ${total} vs DC ${gate.dc} → ${ok?'SUCCESS':'FAIL'} (pain +${ok?gate.painOnSuccess:gate.painOnFail})`);
}}>
  Test vaginal penetration gate
</Button>
</div></div></div><div className="col-span-12 lg:col-span-5"><div className={`${BOX} ${CN.p}`}><div className={`text-lg font-semibold ${CN.t}`}>Progression & Balance</div><div className={`mt-2 text-xs ${CN.s}`}>Hook here for XP curves, DC targets, and tuning; powered by cartridge.</div></div></div></div>)}
  </div>)}
