import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { SiteFooter } from "@/components/site-footer";
import { buttonClassName } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Política de privacidade - Zelo",
  description: "Quais dados a Zelo coleta, por que coleta, com quem compartilha e como exercer seus direitos.",
};

/*
  O conteudo abaixo descreve o que o sistema realmente faz: os campos vieram do
  schema do Prisma, o processamento de pagamento do modulo lib/asaas, a ligacao
  com o Google de lib/google e features/calendar, e a hospedagem da
  infraestrutura em uso. Nao e parecer juridico. Antes de tratar
  isto como documento oficial, peca revisao de quem responde pelo juridico da
  empresa e preencha a identificacao em components/site-footer.tsx.
*/
export default function PrivacidadePage() {
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
        <h1 className="text-3xl font-semibold leading-tight md:text-4xl">Política de privacidade</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Esta página explica quais dados a Zelo coleta, para que usa, com quem compartilha e como você exerce os seus
          direitos previstos na Lei Geral de Proteção de Dados.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Dados que coletamos</h2>
          <p className="mt-3 leading-7 text-slate-700">
            No cadastro da empresa: razão social ou nome, CNPJ ou CPF, segmento, telefone, e-mail e endereço. Do
            responsável e de cada pessoa cadastrada depois: nome, e-mail, cargo, setor e papel de acesso. A senha nunca
            é guardada em texto: fica apenas o resultado de uma função de derivação com sal.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Durante o uso, guardamos o conteúdo que você cria — tarefas, prazos, comentários, anexos, metas e setores —
            e um registro de atividades com quem fez o que e quando, além de registros técnicos de sessão e de limite de
            tentativas de acesso.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Por que usamos esses dados</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Para executar o contrato: manter sua conta, separar o que é de cada empresa, mostrar a cada pessoa apenas o
            que o papel dela permite, emitir a cobrança da assinatura e cumprir obrigações legais e fiscais. Não usamos
            os dados da sua operação para publicidade e não os vendemos.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Com quem compartilhamos</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Com a Asaas, que processa os pagamentos e recebe os dados necessários para emitir a cobrança. Os dados do
            seu cartão são digitados no ambiente da processadora e a Zelo não tem acesso a eles.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            A aplicação e o banco de dados são hospedados em provedores de infraestrutura com servidores nos Estados
            Unidos. Isso caracteriza transferência internacional de dados, feita para viabilizar o próprio serviço.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Google Agenda</h2>
          <p className="mt-3 leading-7 text-slate-700">
            A ligação com o Google Agenda é opcional e individual: cada pessoa liga a própria agenda, e o dono da
            empresa não liga nem desliga a de ninguém. Enquanto você não conectar, a Zelo não pede nada ao Google.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Ao conectar, pedimos duas permissões: criar e gerenciar compromissos na sua agenda e ver o endereço de
            e-mail da conta escolhida. A permissão de compromissos é usada apenas nos compromissos que a própria Zelo
            cria a partir das suas tarefas — não lemos, não alteramos e não apagamos os seus outros compromissos. O
            e-mail é guardado apenas para mostrar na tela qual conta está ligada.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Vão para o Google somente os dados da tarefa que viram o compromisso: título, prioridade, prazo, descrição,
            setor, quem pediu e o link de volta para a tarefa na Zelo. Mudou o prazo ou a prioridade, o compromisso muda
            junto; concluída ou cancelada, ele sai da agenda.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Como protegemos os dados recebidos do Google:
          </p>
          <ul className="mt-3 space-y-2 leading-7 text-slate-700">
            <li>
              <strong>Em trânsito:</strong> todo tráfego entre o seu navegador, a Zelo e as APIs do Google usa HTTPS com
              TLS. Nenhum dado do Google trafega em canal aberto.
            </li>
            <li>
              <strong>Em repouso:</strong> as autorizações de acesso ficam cifradas no banco com AES-256-GCM, e a chave
              fica fora do banco, no ambiente da aplicação. Uma cópia do banco sozinha não abre nada.
            </li>
            <li>
              <strong>Quem alcança:</strong> os dados são isolados por empresa e por papel de acesso. As autorizações só
              são decifradas no servidor, no instante da chamada ao Google, e nenhuma pessoa da Zelo as lê.
            </li>
            <li>
              <strong>Ao desligar:</strong> desconectar a agenda apaga as autorizações e os vínculos entre tarefa e
              compromisso na mesma operação, sem cópia guardada.
            </li>
          </ul>
          <p className="mt-3 leading-7 text-slate-700">
            Não vendemos esses dados, não os usamos para publicidade, não os usamos para treinar modelos e não os
            compartilhamos com terceiros. O uso das informações recebidas das APIs do Google segue a Política de Dados
            do Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Você desliga quando quiser, na própria tela de Agenda dentro da Zelo: as autorizações são apagadas na hora e
            a Zelo perde o acesso. Os compromissos já criados continuam na sua agenda, e você apaga os que quiser por
            lá. Também dá para remover o acesso da Zelo direto na sua Conta Google, em myaccount.google.com/permissions.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Seus direitos</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Você pode pedir confirmação de tratamento, acesso, correção, portabilidade, anonimizacao, eliminação dos
            dados e informação sobre com quem foram compartilhados. O pedido é feito pelo e-mail de contato indicado no
            rodapé, e respondemos no prazo da lei.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Retenção</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Mantemos os dados enquanto a conta existir. Encerrada a conta, os dados são eliminados, exceto o que
            precisamos guardar por obrigação legal ou fiscal e o mínimo necessário para defesa em processo.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Alterações</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Se esta política mudar de forma relevante, avisamos dentro da plataforma antes de a mudança passar a valer.
          </p>
        </section>
      </article>

      <SiteFooter />
    </main>
  );
}
