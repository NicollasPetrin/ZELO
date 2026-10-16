import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/cn";

/**
 * Moldura das telas de entrar e de criar conta: o formulario de um lado, e do
 * outro (so em tela larga) um painel com a cara do produto. No celular fica so
 * o formulario, que e o que a pessoa veio fazer.
 */
export function AuthShell({
  topLink,
  aside,
  wide = false,
  children,
}: {
  topLink: ReactNode;
  aside: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-h-screen bg-white lg:grid", wide ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" : "lg:grid-cols-2")}>
      <div className="flex min-h-screen flex-col px-4 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 rounded-md">
            <BrandLogo variant="icon" decorative preload className="h-8 w-8" />
            <span className="text-base font-semibold text-slate-950">Zelo</span>
          </Link>
          <p className="text-right text-sm text-slate-600">{topLink}</p>
        </header>

        <main className="flex flex-1 items-start py-8 sm:items-center sm:py-10">
          <div className={cn("mx-auto w-full", wide ? "max-w-xl" : "max-w-sm")}>{children}</div>
        </main>

        <footer className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>Zelo · Gestão simples da operação</span>
          <Link href="/termos" className="hover:text-slate-800">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="hover:text-slate-800">
            Privacidade
          </Link>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-emerald-100 bg-gradient-to-br from-emerald-50 via-slate-50 to-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col justify-center gap-8 px-10 py-12 xl:px-14">{aside}</div>
      </aside>
    </div>
  );
}

/** Aviso de erro do formulario, lido por leitor de tela assim que aparece. */
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm leading-6 text-rose-800">
      {children}
    </p>
  );
}
