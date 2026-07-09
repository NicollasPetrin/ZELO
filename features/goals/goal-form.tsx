"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/fields";
import { FormMessage } from "@/components/form-message";
import { saveGoalAction } from "@/features/goals/actions";
import { goalPeriodLabels, goalStatusLabels, goalUnitLabels } from "@/lib/labels";
import { goalPeriods, goalSchema, goalStatuses, goalUnits } from "@/lib/validations";

type GoalValues = z.infer<typeof goalSchema>;

export function GoalForm({
  departments,
  users,
  initial,
  allowAssignments = true,
}: {
  departments: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  initial?: Partial<GoalValues>;
  allowAssignments?: boolean;
}) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalValues>({
    resolver: zodResolver(goalSchema) as Resolver<GoalValues>,
    defaultValues: {
      id: initial?.id,
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      targetValue: initial?.targetValue ?? 0,
      currentValue: initial?.currentValue ?? 0,
      unit: initial?.unit ?? "BRL",
      period: initial?.period ?? "MONTHLY",
      status: initial?.status ?? "ON_TRACK",
      departmentId: initial?.departmentId ?? "",
      responsibleId: initial?.responsibleId ?? "",
      startDate: initial?.startDate ?? "",
      endDate: initial?.endDate ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = await saveGoalAction(values);
      if (result.ok) {
        setMessage(result.message);
        if (!initial?.id) {
          reset({
            title: "",
            description: "",
            targetValue: 0,
            currentValue: 0,
            unit: "BRL",
            period: "MONTHLY",
            status: "ON_TRACK",
            departmentId: "",
            responsibleId: "",
            startDate: "",
            endDate: "",
          });
        }
      } else {
        setError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" {...register("id")} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Titulo da meta</Label>
          <Input placeholder="Ex.: Vender R$ 50.000 no mes" {...register("title")} />
          <FieldError message={errors.title?.message} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Descricao</Label>
          <Textarea placeholder="Explique o que sera acompanhado." {...register("description")} />
        </div>
        <div className="space-y-1.5">
          <Label>Valor alvo</Label>
          <Input type="number" step="0.01" {...register("targetValue")} />
          <FieldError message={errors.targetValue?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Valor atual</Label>
          <Input type="number" step="0.01" {...register("currentValue")} />
        </div>
        <div className="space-y-1.5">
          <Label>Unidade</Label>
          <Select {...register("unit")}>
            {goalUnits.map((unit) => (
              <option key={unit} value={unit}>
                {goalUnitLabels[unit]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Periodo</Label>
          <Select {...register("period")}>
            {goalPeriods.map((period) => (
              <option key={period} value={period}>
                {goalPeriodLabels[period]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select {...register("status")}>
            {goalStatuses.map((status) => (
              <option key={status} value={status}>
                {goalStatusLabels[status]}
              </option>
            ))}
          </Select>
        </div>
        {allowAssignments ? (
          <>
            <div className="space-y-1.5">
              <Label>Setor opcional</Label>
              <Select {...register("departmentId")}>
                <option value="">Empresa inteira</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsavel opcional</Label>
              <Select {...register("responsibleId")}>
                <option value="">Sem responsavel direto</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </div>
          </>
        ) : (
          <>
            <input type="hidden" value="" {...register("departmentId")} />
            <input type="hidden" value="" {...register("responsibleId")} />
          </>
        )}
        <div className="space-y-1.5">
          <Label>Data inicial</Label>
          <Input type="date" {...register("startDate")} />
          <FieldError message={errors.startDate?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Data final</Label>
          <Input type="date" {...register("endDate")} />
          <FieldError message={errors.endDate?.message} />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FormMessage message={message} error={error} />
        <Button type="submit" disabled={isPending} className="sm:ml-auto">
          {isPending ? "Salvando..." : initial?.id ? "Salvar meta" : "Criar meta"}
        </Button>
      </div>
    </form>
  );
}
