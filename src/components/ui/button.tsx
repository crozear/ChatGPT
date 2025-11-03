import React from "react";
import clsx from "clsx";
export function Button({ className, children, variant = "default", size = "md", ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default"|"secondary"; size?: "sm"|"md"|"lg" }) {
  const base = "inline-flex items-center justify-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-fuchsia-400/50 disabled:opacity-50";
  const variants = { default: "bg-fuchsia-600/80 hover:bg-fuchsia-500/90 text-white", secondary: "border border-white/10 bg-zinc-900/80 hover:bg-zinc-800/90 text-zinc-100" };
  const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4", lg: "h-11 px-5 text-lg" };
  return (<button className={clsx(base, variants[variant], sizes[size], className)} {...props}>{children}</button>);
}
export default Button;
