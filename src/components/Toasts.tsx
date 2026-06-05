"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function Toasts() {
  const { toasts } = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: { id: string; title: string; description?: string; variant?: string } }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
    const timer = setTimeout(() => setShow(false), 3600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        show ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
      } min-w-[280px] max-w-sm rounded-md border p-3 shadow-lg ${
        toast.variant === "destructive"
          ? "border-destructive bg-destructive text-destructive-foreground"
          : "border-border bg-background text-foreground"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {toast.title && (
            <p className="text-sm font-medium leading-none">{toast.title}</p>
          )}
          {toast.description && (
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={() => setShow(false)}
          className="shrink-0 opacity-60 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
