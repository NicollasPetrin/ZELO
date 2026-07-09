"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/fields";
import { FormMessage } from "@/components/form-message";
import { saveEmployeeAction } from "@/features/employees/actions";
import { roleLabels } from "@/lib/labels";
import { employeeSchema, userRoles } from "@/lib/validations";

type EmployeeValues = z.infer<typeof employeeSchema>;

export function EmployeeForm({
  departments,
  initial,
  compact,
}: {
  departments: Array<{ id: string; name: string }>;
  initial?: Partial<EmployeeValues>;
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
  } = useForm<EmployeeValues>({
    resolver: zodResolver(employeeSchema) as Resolver<EmployeeValues>,
    defaultValues: {
      id: initial?.id,
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      role: initial?.role ?? "EMPLOYEE",
      departmentId: initial?.departmentId ?? departments[0]?.id ?? "",
      position: initial?.position ?? "",
      password: "",
      isActive: initial?.isActive ?? true,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = await saveEmployeeAction(values);
      if (result.ok) {
        setMessage(result.message);
        if (!initial?.id) {
          reset({
            name: "",
            email: "",
            role: "EMPLOYEE",
            departmentId: departments[0]?.id ?? "",
            position: "",
            password: "",
            isActive: true,
          });
        }
      } else {
        setError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-3" : "rounded-md border border-slate-200 bg-white p-4 shadow-sm"}>
      <input type="hidden" {...register("id")} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input placeholder="Nome completo" {...register("name")} />
          <FieldError message={errors.name?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input placeholder="email@empresa.com" type="email" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Papel</Label>
          <Select {...register("role")}>
            {userRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </Select>
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
          <Label>Cargo</Label>
          <Input placeholder="Ex.: Gerente operacional" {...register("position")} />
        </div>
        <div className="space-y-1.5">
          <Label>{initial?.id ? "Nova senha" : "Senha inicial"}</Label>
          <Input placeholder={initial?.id ? "Deixe em branco para manter" : "Min. 10 caracteres, letra e numero"} type="password" {...register("password")} />
          <FieldError message={errors.password?.message} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register("isActive")} />
          Acesso ativo
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : initial?.id ? "Salvar funcionario" : "Cadastrar funcionario"}
        </Button>
      </div>
      <div className="mt-3">
        <FormMessage message={message} error={error} />
      </div>
    </form>
  );
}
