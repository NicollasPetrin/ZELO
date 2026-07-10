"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { deleteEmployeeAction } from "@/features/employees/actions";

export function EmployeeDeleteButton({
  employeeId,
  employeeName,
  isCurrentUser,
}: {
  employeeId: string;
  employeeName: string;
  isCurrentUser: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = await deleteEmployeeAction(employeeId);

      if (result.ok) {
        setMessage(result.message);
        setConfirming(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (confirming) {
    return (
      <div className="max-w-72 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
        <p className="font-semibold">Excluir funcionario?</p>
        <p className="mt-1 leading-5">
          {employeeName} sera removido se ainda nao houver historico operacional vinculado.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={buttonClassName("ghost", "sm")} type="button" disabled={isPending} onClick={submit}>
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </button>
          <button className={buttonClassName("secondary", "sm")} type="button" disabled={isPending} onClick={() => setConfirming(false)}>
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
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
        className={buttonClassName("ghost", "sm")}
        type="button"
        disabled={isCurrentUser || isPending}
        onClick={() => {
          setMessage(undefined);
          setError(undefined);
          setConfirming(true);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Excluir
      </button>
      <FormMessage message={message} error={error} />
    </div>
  );
}
