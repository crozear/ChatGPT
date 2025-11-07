import React from "react";
import clsx from "clsx";
export const Select = ({ defaultValue, onValueChange, children }: { defaultValue?: string; onValueChange?: (v: string) => void; children: React.ReactNode; }) => {
  const [v, setV] = React.useState(defaultValue || "");
  React.useEffect(() => {
    setV(defaultValue ?? "");
  }, [defaultValue]);
  return <div data-value={v}>{React.Children.map(children as any, (c: any) => React.cloneElement(c, { value: v, setValue: (x: string) => { setV(x); onValueChange?.(x); } }))}</div>;
};
export const SelectTrigger = ({ className, children }: React.HTMLAttributes<HTMLButtonElement>) =>
  <button className={clsx("h-10 w-40 rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-left text-zinc-100", className)}>{children}</button>;
export const SelectValue = () => null;
export const SelectContent = ({ children }: React.HTMLAttributes<HTMLDivElement>) => <div className="hidden">{children}</div>;
export const SelectItem = ({ value, children, setValue }: any) =>
  <button className="hidden" onClick={() => setValue?.(value)}>{children}</button>;
export default Select;
