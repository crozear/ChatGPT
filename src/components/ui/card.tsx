import React from "react";
import clsx from "clsx";
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={clsx("rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur", className)} {...p} />;
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={clsx("p-4", className)} {...p} />;
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <h3 className={clsx("text-zinc-50 text-lg font-semibold", className)} {...p} />;
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={clsx("p-4 pt-0", className)} {...p} />;
export default Card;
