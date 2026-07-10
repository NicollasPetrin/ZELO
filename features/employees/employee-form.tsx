"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/fields";
import { FormMessage } from "@/components/form-message";
import { saveEmployeeAction } from "@/features/employees/actions";
import { roleLabels } from "@/lib/labels";
import { employeeSchema, userRoles } from "@/lib/validations";

type EmployeeValues = z.infer<typeof employeeSchema>;

export type EmployeeBillingContext = {
  planName: string;
  activeUserCount: number;
  includedUsers: number;
  maxUsers: number | null;
  pricePerExtraUser: string;
  currentMonthlyTotal: string;
  nextMonthlyTotal: string;
  upgradePlanName: string;
};

export function EmployeeForm({
  departments,
  initial,
  compact,
  billing,
}: {
  departments: Array<{ id: string; name: string }>;
  initial?: Partial<EmployeeValues>;
  compact?: boolean;
  billing?: EmployeeBillingContext;
}) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    control,
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
      confirmExtraUserCharge: false,
    },
  });
  const isActive = useWatch({ control, name: "isActive" });
  const confirmsExtraUserCharge = useWatch({ control, name: "confirmExtraUserCharge" });
  const activatesNewSeat = Boolean(isActive) && !initial?.isActive;
  const reachesHardLimit = Boolean(
    billing && activatesNewSeat && billing.maxUsers !== null && billing.activeUserCount >= billing.maxUsers,
  );
  const createsExtraCharge = Boolean(
    billing && activatesNewSeat && billing.activeUserCount >= billing.includedUsers && !reachesHardLimit,
  );
  const nextExtraUsers = billing ? Math.max(0, billing.activeUserCount + 1 - billing.includedUsers) : 0;

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
            confirmExtraUserCharge: false,
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
      {billing && reachesHardLimit ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Limite maximo do plano atingido</p>
              <p className="mt-1 leading-6">
                O Plano {billing.planName} permite ate {billing.maxUsers} usuarios ativos. Para ativar mais pessoas,
                mude para o Plano {billing.upgradePlanName}.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {billing && createsExtraCharge ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <div className="flex gap-2">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Usuario adicional faturavel</p>
              <p className="mt-1 leading-6">
                Este funcionario ultrapassa os {billing.includedUsers} usuarios incluidos no Plano {billing.planName} e
                adiciona {billing.pricePerExtraUser}/mes a assinatura.
              </p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-amber-700">Ativos apos inclusao</dt>
                  <dd className="font-semibold">{billing.activeUserCount + 1}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-amber-700">Usuarios extras</dt>
                  <dd className="font-semibold">{nextExtraUsers}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-amber-700">Mensalidade estimada</dt>
                  <dd className="font-semibold">{billing.nextMonthlyTotal}</dd>
                </div>
              </dl>
              <label className="mt-3 flex items-start gap-2 text-sm font-medium text-amber-950">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-amber-300" {...register("confirmExtraUserCharge")} />
                <span>Estou de acordo com o acrescimo de {billing.pricePerExtraUser}/mes na assinatura.</span>
              </label>
              <FieldError message={errors.confirmExtraUserCharge?.message} />
            </div>
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register("isActive")} />
          Acesso ativo
        </label>
        <Button type="submit" disabled={isPending || reachesHardLimit || (createsExtraCharge && !confirmsExtraUserCharge)}>
          {isPending ? "Salvando..." : initial?.id ? "Salvar funcionario" : "Cadastrar funcionario"}
        </Button>
      </div>
      <div className="mt-3">
        <FormMessage message={message} error={error} />
      </div>
    </form>
  );
}
