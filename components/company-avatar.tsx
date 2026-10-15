import { companyInitials } from "@/lib/company-logo";
import { cn } from "@/lib/cn";

/** Logo da empresa, ou as iniciais quando nao ha logo. */
export function CompanyAvatar({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  if (logoUrl) {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem privada servida pela propria app; o otimizador de imagem nao passaria o cookie da sessao */}
        <img src={logoUrl} alt={`Logo ${name}`} className="h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-700 font-semibold text-white", className)}
    >
      {companyInitials(name)}
    </span>
  );
}

/** URL da logo com a data do envio, para o cache do navegador nunca servir a anterior. */
export function companyLogoUrl(company: { logoKey: string | null; logoUpdatedAt: Date | null }) {
  return company.logoKey ? `/api/empresa/logo?v=${company.logoUpdatedAt?.getTime() ?? 0}` : null;
}
