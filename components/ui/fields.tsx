import type { ComponentPropsWithRef, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-medium uppercase tracking-normal text-slate-500", className)} {...props} />;
}

// ComponentPropsWithRef em vez de InputHTMLAttributes: no React 19 o ref e uma
// prop comum, e sem isto quem precisa focar o campo nao consegue passa-lo.
export function Input({ className, ...props }: ComponentPropsWithRef<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition",
        "placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition",
        "focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition",
        "placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-medium text-rose-600">{message}</p>;
}
