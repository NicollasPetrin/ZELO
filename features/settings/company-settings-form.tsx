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
    document: string | null;
    phone: string | null;
    postalCode: string | null;
    address: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    province: string | null;
    documentLocked: boolean;
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
      document: company.document ?? "",
      phone: company.phone ?? "",
      postalCode: company.postalCode ?? "",
      address: company.address ?? "",
      addressNumber: company.addressNumber ?? "",
      addressComplement: company.addressComplement ?? "",
      province: company.province ?? "",
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
          <Label>CNPJ ou CPF</Label>
          <Input
            inputMode="numeric"
            autoComplete="off"
            placeholder="Somente numeros"
            readOnly={company.documentLocked}
            aria-describedby="ajuda-documento"
            {...register("document")}
          />
          <FieldError message={errors.document?.message} />
          <p id="ajuda-documento" className="text-xs leading-5 text-slate-600">
            {company.documentLocked
              ? "Bloqueado porque a assinatura ja foi iniciada. Fale com o suporte para corrigir."
              : "Necessario para assinar um plano. A processadora exige o documento para emitir a cobranca."}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input inputMode="tel" autoComplete="tel" placeholder="(11) 98765-4321" {...register("phone")} />
          <FieldError message={errors.phone?.message} />
          <p className="text-xs leading-5 text-slate-600">
            Necessario para assinar um plano. A processadora exige o telefone do pagador.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>CEP</Label>
          <Input inputMode="numeric" autoComplete="postal-code" placeholder="01310-100" {...register("postalCode")} />
          <FieldError message={errors.postalCode?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Logradouro</Label>
          <Input autoComplete="address-line1" placeholder="Avenida Paulista" {...register("address")} />
        </div>
        <div className="space-y-1.5">
          <Label>Numero</Label>
          <Input placeholder="1000" {...register("addressNumber")} />
        </div>
        <div className="space-y-1.5">
          <Label>Complemento</Label>
          <Input placeholder="Sala 12 (opcional)" {...register("addressComplement")} />
        </div>
        <div className="space-y-1.5">
          <Label>Bairro</Label>
          <Input placeholder="Bela Vista" {...register("province")} />
          <p className="text-xs leading-5 text-slate-600">
            CEP, logradouro, numero e bairro sao exigidos pela processadora para assinar um plano.
          </p>
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
