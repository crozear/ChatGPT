import React from "react";
export const Badge = ({ children, variant = "secondary" }: { children: React.ReactNode; variant?: "secondary" }) =>
  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-100">{children}</span>;
export default Badge;
