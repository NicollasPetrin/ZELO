"use client";

import { useState, useTransition } from "react";
import { Check, CreditCard, Power, X } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { toggleEmployeeAction } from "@/features/employees/actions";
import type { EmployeeBillingContext } from "@/features/employees/employee-form";

export function EmployeeStatusButton({
  employeeId,
  isActive,
  isCurrentUser,
  billing,
}: {
  employeeId: string;
  isActive: boolean;
  isCurrentUser: boolean;
  billing: EmployeeBillingContext;
}) {
  const [confirmingCharge, setConfirmingCharge] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const activatesSeat = !isActive;
  const reachesHardLimit =
    activatesSeat && billing.maxUsers !== null && billing.activeUserCount >= billing.maxUsers;
  const createsExtraCharge =
    activatesSeat && billing.activeUserCount >= billing.includedUsers && !reachesHardLimit;
  const nextExtraUsers = Math.max(0, billing.activeUserCount + 1 - billing.includedUsers);

  function submit(confirmExtraUserCharge = false) {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = await toggleEmployeeAction(employeeId, !isActive, confirmExtraUserCharge);

      if (result.ok) {
        setMessage(result.message);
        setConfirmingCharge(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (reachesHardLimit) {
    return (
      <div className="max-w-60 space-y-2">
        <button className={buttonClassName("secondary", "sm")} type="button" disabled>
          <Power className="h-3.5 w-3.5" />
          Upgrade necessario
        </button>
        <p className="text-xs leading-5 text-rose-700">
          O Plano {billing.planName} chegou ao limite de {billing.maxUsers} usuarios ativos. Mude para o Plano {billing.upgradePlanName}.
        </p>
      </div>
    );
  }

  if (confirmingCharge) {
    return (
      <div className="max-w-72 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        <div className="flex gap-2">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Confirmar usuario extra</p>
            <p className="mt-1 leading-5">
              Ativar este acesso adiciona {billing.pricePerExtraUser}/mes. A mensalidade estimada passa para {billing.nextMonthlyTotal}, com {nextExtraUsers} usuario{nextExtraUsers === 1 ? "" : "s"} extra{nextExtraUsers === 1 ? "" : "s"}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={buttonClassName("primary", "sm")} type="button" disabled={isPending} onClick={() => submit(true)}>
                <Check className="h-3.5 w-3.5" />
                Concordo
              </button>
              <button className={buttonClassName("ghost", "sm")} type="button" disabled={isPending} onClick={() => setConfirmingCharge(false)}>
                <X className="h-3.5 w-3.5" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <FormMessage message={message} error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        className={buttonClassName("secondary", "sm")}
        type="button"
        disabled={isCurrentUser || isPending}
        onClick={() => {
          if (createsExtraCharge) {
            setMessage(undefined);
            setError(undefined);
            setConfirmingCharge(true);
            return;
          }

          submit(false);
        }}
      >
        <Power className="h-3.5 w-3.5" />
        {isPending ? "Salvando..." : isActive ? "Inativar" : "Ativar"}
      </button>
      <FormMessage message={message} error={error} />
    </div>
  );
}
