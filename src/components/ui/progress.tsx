import React from "react";
export const Progress = ({ value, className }: { value: number; className?: string }) =>
  <div className={`${className or "h-2"} relative overflow-hidden rounded bg-zinc-800`}>
    <div className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>;
export default Progress;
