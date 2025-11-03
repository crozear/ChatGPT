# ChatGPT – Lilith-5 Cartridges

This repo holds **content cartridges** for the Lilith-5 text-based dungeon crawler UI that runs in ChatGPT’s canvas.

## Files
- `cartridges/schema.v1.json` – JSON Schema for cartridges.
- `cartridges/demo.v1.json` – Small example cartridge with a few nodes and foes.

## Raw URLs (for the in-canvas URL Loader)
> Use these in the loader once it’s wired:

```text
https://raw.githubusercontent.com/crozear/ChatGPT/main/cartridges/schema.v1.json
https://raw.githubusercontent.com/crozear/ChatGPT/main/cartridges/demo.v1.json
```

## Cartridge shape (v1)
```json
{
  "version": "v1",
  "skillNodes": [/* … */],
  "bestiary": [/* … */],
  "descriptors": { /* optional, any long text tables */ },
  "econRules": [ /* … */ ]
}
```

## Minimal Loader Snippet (to paste into the canvas app)
```ts
// 1) Add a place to store data (switch const -> let):
// let SKILL_NODES: SkillNode[] = []
// let BESTIARY: Beast[] = []
// let ECON_RULES: {title:string;text:string}[] = []

// 2) Minimal URL loader (inside a tiny React component):
function CartridgeLoader() {
  const [url, setUrl] = React.useState("");
  const [, setTick] = React.useState(0);
  async function load() {
    const res = await fetch(url);
    const data = await res.json();
    SKILL_NODES = data.skillNodes ?? SKILL_NODES;
    BESTIARY = data.bestiary ?? BESTIARY;
    ECON_RULES = data.econRules ?? ECON_RULES;
    setTick(t=>t+1); // force refresh
  }
  return (<div className="flex gap-2">
    <input className="flex-1 bg-zinc-950/60 text-zinc-100" value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste raw GitHub JSON…"/>
    <button onClick={load} className="rounded bg-fuchsia-600 px-3 py-1 text-white">Load</button>
  </div>);
}
```

We’ll keep cartridges here and grow them as we refine balance/encounters.
