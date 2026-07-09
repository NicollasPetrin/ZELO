"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/fields";
import { FormMessage } from "@/components/form-message";
import { createTaskAction, updateTaskAction } from "@/features/tasks/actions";
import { priorityLabels, recurrenceLabels, statusLabels } from "@/lib/labels";
import { recurrenceTypes, taskPriorities, taskSchema, taskStatuses } from "@/lib/validations";

type TaskValues = z.infer<typeof taskSchema>;

export type TaskFormInitial = Partial<TaskValues> & {
  recurrenceType?: TaskValues["recurrenceType"];
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
};

export function TaskForm({
  users,
  departments,
  initial,
  allowRecurrence = true,
}: {
  users: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  initial?: TaskFormInitial;
  allowRecurrence?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema) as Resolver<TaskValues>,
    defaultValues: {
      id: initial?.id,
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      assigneeId: initial?.assigneeId ?? users[0]?.id ?? "",
      departmentId: initial?.departmentId ?? departments[0]?.id ?? "",
      dueDate: initial?.dueDate ?? "",
      priority: initial?.priority ?? "MEDIUM",
      status: initial?.status ?? "PENDING",
      recurrenceType: initial?.recurrenceType ?? "NONE",
      weekDays: initial?.weekDays ?? "",
      monthDay: initial?.monthDay ?? "",
      recurrenceStartDate: initial?.recurrenceStartDate ?? initial?.dueDate ?? "",
      recurrenceEndDate: initial?.recurrenceEndDate ?? "",
    },
  });

  const recurrenceType = useWatch({ control, name: "recurrenceType" });

  const onSubmit = handleSubmit((values) => {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = initial?.id ? await updateTaskAction(values) : await createTaskAction(values);
      if (result.ok) {
        setMessage(result.message);
        if (!initial?.id) {
          reset({
            title: "",
            description: "",
            assigneeId: users[0]?.id ?? "",
            departmentId: departments[0]?.id ?? "",
            dueDate: "",
            priority: "MEDIUM",
            status: "PENDING",
            recurrenceType: "NONE",
            weekDays: "",
            monthDay: "",
            recurrenceStartDate: "",
            recurrenceEndDate: "",
          });
        }
        router.refresh();
        if (result.data?.id) {
          router.push(`/tasks/${result.data.id}`);
        }
      } else {
        setError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" {...register("id")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5 lg:col-span-2">
          <Label>Titulo</Label>
          <Input placeholder="Ex.: Conferir estoque do corredor 2" {...register("title")} />
          <FieldError message={errors.title?.message} />
        </div>
        <div className="space-y-1.5 lg:col-span-2">
          <Label>Descricao</Label>
          <Textarea placeholder="Explique o que deve ser feito e qual resultado esperado." {...register("description")} />
          <FieldError message={errors.description?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Responsavel</Label>
          <Select {...register("assigneeId")}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
          <FieldError message={errors.assigneeId?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Setor</Label>
          <Select {...register("departmentId")}>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
          <FieldError message={errors.departmentId?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Prazo</Label>
          <Input type="date" {...register("dueDate")} />
          <FieldError message={errors.dueDate?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <Select {...register("priority")}>
            {taskPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select {...register("status")}>
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </Select>
        </div>
        {allowRecurrence ? (
          <div className="space-y-1.5">
            <Label>Recorrencia</Label>
            <Select {...register("recurrenceType")}>
              {recurrenceTypes.map((type) => (
                <option key={type} value={type}>
                  {recurrenceLabels[type]}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <input type="hidden" value="NONE" {...register("recurrenceType")} />
        )}
        {allowRecurrence && recurrenceType !== "NONE" ? (
          <>
            <div className="space-y-1.5">
              <Label>Inicio da recorrencia</Label>
              <Input type="date" {...register("recurrenceStartDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim opcional</Label>
              <Input type="date" {...register("recurrenceEndDate")} />
            </div>
            {recurrenceType === "SPECIFIC_WEEKDAYS" ? (
              <div className="space-y-1.5">
                <Label>Dias da semana</Label>
                <Input placeholder="0 domingo, 1 segunda... Ex.: 1,3,5" {...register("weekDays")} />
              </div>
            ) : null}
            {recurrenceType === "SPECIFIC_MONTH_DAY" ? (
              <div className="space-y-1.5">
                <Label>Dia do mes</Label>
                <Input type="number" min="1" max="31" {...register("monthDay")} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FormMessage message={message} error={error} />
        <Button type="submit" disabled={isPending} className="sm:ml-auto">
          {isPending ? "Salvando..." : initial?.id ? "Salvar tarefa" : "Criar tarefa"}
        </Button>
      </div>
    </form>
  );
}
