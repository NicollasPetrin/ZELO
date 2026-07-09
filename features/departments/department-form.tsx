"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/fields";
import { FormMessage } from "@/components/form-message";
import { saveDepartmentAction } from "@/features/departments/actions";
import { departmentSchema } from "@/lib/validations";

type DepartmentValues = z.infer<typeof departmentSchema>;

export function DepartmentForm({
  initial,
  compact,
}: {
  initial?: Partial<DepartmentValues>;
  compact?: boolean;
}) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema) as Resolver<DepartmentValues>,
    defaultValues: {
      id: initial?.id,
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      isActive: initial?.isActive ?? true,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = await saveDepartmentAction(values);
      if (result.ok) {
        setMessage(result.message);
        if (!initial?.id) {
          reset({ name: "", description: "", isActive: true });
        }
      } else {
        setError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-3" : "rounded-md border border-slate-200 bg-white p-4 shadow-sm"}>
      <input type="hidden" {...register("id")} />
      <div className={compact ? "grid gap-3" : "grid gap-4 md:grid-cols-[1fr_2fr_auto]"}>
        <div className="space-y-1.5">
          <Label>Nome do setor</Label>
          <Input placeholder="Ex.: Vendas" {...register("name")} />
          <FieldError message={errors.name?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Descricao</Label>
          {compact ? (
            <Input placeholder="Rotina e responsabilidade do setor" {...register("description")} />
          ) : (
            <Textarea placeholder="Rotina e responsabilidade do setor" {...register("description")} />
          )}
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : initial?.id ? "Salvar" : "Criar setor"}
          </Button>
        </div>
      </div>
      <FormMessage message={message} error={error} />
    </form>
  );
}
