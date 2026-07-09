import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "light" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

export function buttonClassName(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900",
    size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
    variant === "primary" && "bg-slate-950 text-white hover:bg-slate-800",
    variant === "secondary" && "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    variant === "light" && "bg-white text-slate-950 hover:bg-slate-100",
    variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={cn(buttonClassName(variant, size), className)} {...props} />;
}
