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

  if (hasActiveSubscription || pathname.startsWith("/settings")) {
    return children;
  }

  return <SubscriptionRequiredCard />;
}
