import React from "react";
import clsx from "clsx";

export const Dialog = ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) => {
  React.useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onOpenChange(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="flex h-full w-full items-start justify-center overflow-y-auto bg-black/60 p-4"
        onMouseDown={handleBackdropMouseDown}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogContent = ({ className, children, onMouseDown, ...rest }: React.HTMLAttributes<HTMLDivElement>) => {
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onMouseDown?.(event);
  };

  return (
    <div
      {...rest}
      onMouseDown={handleMouseDown}
      className={clsx(
        "relative w-full max-w-5xl max-h-[calc(100vh-4rem)] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900/95 p-4 text-zinc-100 shadow-xl",
        className
      )}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
};

export const DialogHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={clsx("mb-2", className)} {...p} />;

export const DialogTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) =>
  <h2 className={clsx("text-lg font-semibold", className)} {...p} />;

export default Dialog;
