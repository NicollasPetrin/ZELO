import type { TaskPriority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { priorityLabels } from "@/lib/labels";

const priorityClasses: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-indigo-100 text-indigo-800",
  HIGH: "bg-amber-100 text-amber-800",
  URGENT: "bg-rose-100 text-rose-800",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge className={priorityClasses[priority]}>{priorityLabels[priority]}</Badge>;
}
