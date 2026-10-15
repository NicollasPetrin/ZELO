import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { SiteFooter } from "@/components/site-footer";
import { buttonClassName } from "@/components/ui/button";
import { planDetails, planOrder } from "@/lib/plans";
import { GRACE_PERIOD_DAYS, TRIAL_DAYS } from "@/lib/subscription";

export const metadata: Metadata = {
  title: "Termos de uso - Zelo",
  description: "Condições de contratação, cobrança, limites de plano e encerramento da conta na Zelo.",
};

/*
  Os prazos e limites citados aqui saem do proprio codigo — TRIAL_DAYS,
  GRACE_PERIOD_DAYS e lib/plans — para que o texto nao envelheca sozinho quando
  a regra mudar. Isto descreve o funcionamento do sistema; nao e parecer
  juridico e pede revisao de quem responde pelo juridico da empresa.
*/
const planos = planOrder.map((plan) => planDetails[plan]);

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 px-4 py-5 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo variant="icon" decorative className="h-9 w-9" />
            <span className="font-semibold">Zelo</span>
          </Link>
          <Link href="/" className={buttonClassName("secondary", "sm") + " min-h-10 lg:min-h-0"}>
            Voltar ao site
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-14 lg:px-8 lg:py-20">
        <h1 className="text-3xl font-semibold leading-tight md:text-4xl">Termos de uso</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Condições de uso da Zelo, plataforma de gestão de tarefas, prazos, setores e metas para microempresas.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">A conta</h2>
          <p className="mt-3 leading-7 text-slate-700">
            A conta pertence a empresa cadastrada. Quem faz o cadastro assume o papel de dono e responde pelos acessos
            que criar. Cada pessoa acessa com credencial própria, e a senha não deve ser compartilhada. Dono, gerente e
            funcionário enxergam recortes diferentes do sistema.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Teste e cobrança</h2>
          <p className="mt-3 leading-7 text-slate-700">
            O primeiro período é gratuito por {TRIAL_DAYS} dias. Terminado o teste, a assinatura passa a ser cobrada
            mensalmente pelo valor do plano escolhido. A cobrança é processada pela Asaas.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Em caso de atraso, o acesso continua por {GRACE_PERIOD_DAYS} dias de tolerância, com aviso dentro da
            plataforma. Passado esse prazo sem confirmação do pagamento, as funcionalidades ficam bloqueadas até a
            regularização. Os dados não são apagados por atraso.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Planos e limites</h2>
          <ul className="mt-3 space-y-2 leading-7 text-slate-700">
            {planos.map((plano) => (
              <li key={plano.code}>
                <strong className="font-semibold">{plano.name}</strong> - {plano.price} por mês, com{" "}
                {plano.includedUsers} usuários inclusos e limite de{" "}
                {plano.maxUsers === null ? "usuários ilimitado" : `${plano.maxUsers} usuarios`}. Usuário além do
                incluído custa {plano.pricePerExtraUser} por mês.
              </li>
            ))}
          </ul>
          <p className="mt-3 leading-7 text-slate-700">
            A troca de plano acontece nas configurações da empresa. A mudança para um plano menor só é aceita se ele
            comportar a quantidade de usuários ativos que a conta já tem.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Uso aceitável</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Não é permitido usar a plataforma para atividade ilegal, tentar acessar dados de outra empresa, sobrecarregar
            a infraestrutura de forma proposital ou revender o acesso sem autorização.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Conteúdo da sua empresa</h2>
          <p className="mt-3 leading-7 text-slate-700">
            As tarefas, metas, anexos e demais registros cadastrados continuam sendo da sua empresa. A Zelo os armazena e
            processa para prestar o serviço, conforme a{" "}
            <Link href="/privacidade" className="font-medium text-emerald-700 underline underline-offset-2">
              política de privacidade
            </Link>
            .
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Encerramento</h2>
          <p className="mt-3 leading-7 text-slate-700">
            O encerramento da assinatura é solicitado pelo e-mail de contato indicado no rodapé. Podemos suspender uma
            conta que descumpra estes termos, com aviso prévio sempre que possível.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Disponibilidade</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Trabalhamos para manter o serviço no ar, mas ele pode ficar indisponível por manutenção ou por falha de
            terceiros dos quais depende, como provedor de infraestrutura e processadora de pagamento.
          </p>
        </section>
      </article>

      <SiteFooter />
    </main>
  );
}
