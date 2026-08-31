import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

/**
 * PREENCHER ANTES DE DIVULGAR A LANDING.
 *
 * Quem vende assinatura recorrente pela internet precisa se identificar: o
 * Codigo de Defesa do Consumidor exige nome, CNPJ e endereco visiveis, e a
 * LGPD exige um canal de contato para o titular exercer os direitos dele.
 *
 * Estes valores nao foram inventados de proposito. Substitua pelos dados reais
 * da empresa; enquanto estiverem assim, aparecem na tela como pendencia, e nao
 * como informacao.
 */
const empresa = {
  razaoSocial: "[PREENCHER: razao social]",
  cnpj: "[PREENCHER: CNPJ]",
  endereco: "[PREENCHER: endereco]",
  email: "[PREENCHER: e-mail de contato]",
};

const temIdentificacao = !empresa.razaoSocial.startsWith("[PREENCHER");

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 px-4 py-12 text-slate-400 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <BrandLogo variant="fullDark" decorative className="h-auto w-[150px]" />
            <p className="mt-4 max-w-sm text-sm leading-6">
              Gestao de tarefas, prazos, setores e metas para microempresas que precisam sair do improviso.
            </p>
          </div>

          <nav aria-label="Produto">
            <h2 className="text-sm font-semibold text-white">Produto</h2>
            <ul className="mt-3 space-y-1 text-sm">
              <li><Link href="/#produto" className="inline-block py-2 hover:text-white">Recursos</Link></li>
              <li><Link href="/#como-funciona" className="inline-block py-2 hover:text-white">Como funciona</Link></li>
              <li><Link href="/#demonstracao" className="inline-block py-2 hover:text-white">Demonstracao</Link></li>
              <li><Link href="/#planos" className="inline-block py-2 hover:text-white">Planos</Link></li>
            </ul>
          </nav>

          <nav aria-label="Conta e documentos">
            <h2 className="text-sm font-semibold text-white">Conta</h2>
            <ul className="mt-3 space-y-1 text-sm">
              <li><Link href="/login" className="inline-block py-2 hover:text-white">Entrar</Link></li>
              <li><Link href="/signup" className="inline-block py-2 hover:text-white">Criar conta</Link></li>
              <li><Link href="/termos" className="inline-block py-2 hover:text-white">Termos de uso</Link></li>
              <li><Link href="/privacidade" className="inline-block py-2 hover:text-white">Politica de privacidade</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm">
          {temIdentificacao ? (
            <p>
              {empresa.razaoSocial} - CNPJ {empresa.cnpj} - {empresa.endereco} - {empresa.email}
            </p>
          ) : (
            <p className="text-amber-300">
              Identificacao da empresa pendente: preencha razao social, CNPJ, endereco e e-mail de contato em
              components/site-footer.tsx antes de divulgar a pagina.
            </p>
          )}
          <p className="mt-2">&copy; {new Date().getFullYear()} Zelo. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
