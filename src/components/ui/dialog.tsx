import React from "react";
import clsx from "clsx";
export const Dialog = ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) =>
  open ? <div className="fixed inset-0 z-50">{children}</div> : null;
export const DialogContent = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className="fixed inset-0 bg-black/60" role="dialog">
    <div className={clsx("mx-auto mt-16 w-full max-w-5xl rounded-2xl border border-white/10 bg-zinc-900/95 p-4 text-zinc-100", className)}>{children}</div>
  </div>;
export const DialogHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={clsx("mb-2", className)} {...p} />;
export const DialogTitle = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <h2 className={clsx("text-lg font-semibold", className)} {...p} />;
export default Dialog;
