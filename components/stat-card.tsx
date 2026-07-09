import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "warning" | "danger" | "success";
}) {
  const toneClass = {
    neutral: "border-slate-200 bg-white",
    warning: "border-amber-200 bg-amber-50",
    danger: "border-rose-200 bg-rose-50",
    success: "border-emerald-200 bg-emerald-50",
  }[tone];

  return (
    <div className={`rounded-md border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {icon ? <div className="text-slate-500">{icon}</div> : null}
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}
