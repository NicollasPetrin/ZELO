"use client";

import { usePathname } from "next/navigation";
import { SubscriptionRequiredCard } from "@/components/subscription-required-card";

export function SubscriptionGate({
  hasActiveSubscription,
  children,
}: {
  hasActiveSubscription: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Telas que continuam de pe sem assinatura. Sao as duas saidas de quem esta
  // travado: resolver o pagamento e falar com o suporte. Bloquear a conversa com
  // o suporte fecharia a porta justamente para quem precisa dela.
  const sempreLiberado = ["/settings", "/conversas"];

  if (hasActiveSubscription || sempreLiberado.some((rota) => pathname.startsWith(rota))) {
    return children;
  }

  return <SubscriptionRequiredCard />;
}
