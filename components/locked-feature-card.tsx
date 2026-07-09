import { LockKeyhole } from "lucide-react";

export function LockedFeatureCard({
  title,
  description,
  requiredPlan,
}: {
  title: string;
  description: string;
  requiredPlan: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-slate-500">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          <p className="mt-3 inline-flex rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Disponivel no Plano {requiredPlan}
          </p>
        </div>
      </div>
    </div>
  );
}

