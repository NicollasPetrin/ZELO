"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Botao de envio que mostra o progresso enquanto a server action roda.
 *
 * Precisa ser um componente separado porque useFormStatus so enxerga o
 * formulario acima dele na arvore. Sem isso o formulario fica parado e sem
 * resposta visual, e a pessoa acha que travou e clica de novo — chegando a
 * criar duas contas.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  icon,
}: {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
  icon?: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending} className={cn(className)}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          {icon}
        </>
      )}
    </Button>
  );
}
