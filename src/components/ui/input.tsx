import React from "react";
import clsx from "clsx";
export const Input = ({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) =>
  <input className={clsx("h-10 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-zinc-100 placeholder:text-zinc-400", className)} {...p} />;
export default Input;
