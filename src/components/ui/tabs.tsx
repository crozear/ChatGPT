import React, { useState, createContext, useContext } from "react";
import clsx from "clsx";
const Ctx = createContext<{ value: string; set: (v: string) => void } | null>(null);
export const Tabs = ({ defaultValue, children, className }: { defaultValue: string; children: React.ReactNode; className?: string; }) => {
  const [value, set] = useState(defaultValue);
  return <div className={className}><Ctx.Provider value={{ value, set }}>{children}</Ctx.Provider></div>;
};
export const TabsList = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={clsx("inline-flex rounded-xl p-1 gap-1", className)} {...p} />;
export const TabsTrigger = ({ value, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) => {
  const ctx = useContext(Ctx)!; const active = ctx.value === value;
  return (
    <button onClick={() => ctx.set(value)} className={clsx(
      "px-3 py-1.5 rounded-lg text-sm transition",
      active ? "bg-zinc-800 text-zinc-100" : "text-zinc-300 hover:text-zinc-100"
    )} {...p}>{children}</button>
  );
};
export const TabsContent = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => {
  const ctx = useContext(Ctx)!; if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
};
