import type { TaskStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { statusLabels } from "@/lib/labels";
import { cn } from "@/lib/cn";

const statusClasses: Record<TaskStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  IN_REVIEW: "bg-violet-100 text-violet-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-rose-100 text-rose-800",
  CANCELED: "bg-zinc-100 text-zinc-600",
};

export function StatusBadge({ status, late }: { status: TaskStatus; late?: boolean }) {
  const shownStatus = late && !["COMPLETED", "CANCELED"].includes(status) ? "OVERDUE" : status;

  return <Badge className={cn(statusClasses[shownStatus])}>{statusLabels[shownStatus]}</Badge>;
}
