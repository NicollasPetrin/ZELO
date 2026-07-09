"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";
import { FormMessage } from "@/components/form-message";
import { saveCompanySettingsAction } from "@/features/settings/actions";
import { companySettingsSchema } from "@/lib/validations";

type CompanySettingsValues = z.infer<typeof companySettingsSchema>;

export function CompanySettingsForm({
  company,
}: {
  company: {
    name: string;
    segment: string | null;
    employeeCount: number | null;
    isActive: boolean;
  };
}) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySettingsValues>({
    resolver: zodResolver(companySettingsSchema) as Resolver<CompanySettingsValues>,
    defaultValues: {
      name: company.name,
      segment: company.segment ?? "",
      employeeCount: company.employeeCount ?? "",
      isActive: company.isActive,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = await saveCompanySettingsAction(values);
      if (result.ok) {
        setMessage(result.message);
      } else {
        setError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nome da empresa</Label>
          <Input {...register("name")} />
          <FieldError message={errors.name?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Segmento</Label>
          <Input placeholder="Ex.: Mercado, clinica, oficina" {...register("segment")} />
        </div>
        <div className="space-y-1.5">
          <Label>Quantidade de funcionarios</Label>
          <Input type="number" min="0" {...register("employeeCount")} />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register("isActive")} />
          Empresa ativa
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FormMessage message={message} error={error} />
        <Button type="submit" disabled={isPending} className="sm:ml-auto">
          {isPending ? "Salvando..." : "Salvar configuracoes"}
        </Button>
      </div>
    </form>
  );
}
