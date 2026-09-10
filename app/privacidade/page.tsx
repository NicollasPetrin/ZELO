import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { SiteFooter } from "@/components/site-footer";
import { buttonClassName } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Politica de privacidade - Zelo",
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
        <h1 className="text-3xl font-semibold leading-tight md:text-4xl">Politica de privacidade</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Esta pagina explica quais dados a Zelo coleta, para que usa, com quem compartilha e como voce exerce os seus
          direitos previstos na Lei Geral de Protecao de Dados.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Dados que coletamos</h2>
          <p className="mt-3 leading-7 text-slate-700">
            No cadastro da empresa: razao social ou nome, CNPJ ou CPF, segmento, telefone, e-mail e endereco. Do
            responsavel e de cada pessoa cadastrada depois: nome, e-mail, cargo, setor e papel de acesso. A senha nunca
            e guardada em texto: fica apenas o resultado de uma funcao de derivacao com sal.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Durante o uso, guardamos o conteudo que voce cria — tarefas, prazos, comentarios, anexos, metas e setores —
            e um registro de atividades com quem fez o que e quando, alem de registros tecnicos de sessao e de limite de
            tentativas de acesso.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Por que usamos esses dados</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Para executar o contrato: manter sua conta, separar o que e de cada empresa, mostrar a cada pessoa apenas o
            que o papel dela permite, emitir a cobranca da assinatura e cumprir obrigacoes legais e fiscais. Nao usamos
            os dados da sua operacao para publicidade e nao os vendemos.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Com quem compartilhamos</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Com a Asaas, que processa os pagamentos e recebe os dados necessarios para emitir a cobranca. Os dados do
            seu cartao sao digitados no ambiente da processadora e a Zelo nao tem acesso a eles.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            A aplicacao e o banco de dados sao hospedados em provedores de infraestrutura com servidores nos Estados
            Unidos. Isso caracteriza transferencia internacional de dados, feita para viabilizar o proprio servico.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Google Agenda</h2>
          <p className="mt-3 leading-7 text-slate-700">
            A ligacao com o Google Agenda e opcional e individual: cada pessoa liga a propria agenda, e o dono da
            empresa nao liga nem desliga a de ninguem. Enquanto voce nao conectar, a Zelo nao pede nada ao Google.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Ao conectar, pedimos duas permissoes: criar e gerenciar compromissos na sua agenda e ver o endereco de
            e-mail da conta escolhida. A permissao de compromissos e usada apenas nos compromissos que a propria Zelo
            cria a partir das suas tarefas — nao lemos, nao alteramos e nao apagamos os seus outros compromissos. O
            e-mail e guardado apenas para mostrar na tela qual conta esta ligada.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Vao para o Google somente os dados da tarefa que viram o compromisso: titulo, prioridade, prazo, descricao,
            setor, quem pediu e o link de volta para a tarefa na Zelo. Mudou o prazo ou a prioridade, o compromisso muda
            junto; concluida ou cancelada, ele sai da agenda.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Como protegemos os dados recebidos do Google:
          </p>
          <ul className="mt-3 space-y-2 leading-7 text-slate-700">
            <li>
              <strong>Em transito:</strong> todo trafego entre o seu navegador, a Zelo e as APIs do Google usa HTTPS com
              TLS. Nenhum dado do Google trafega em canal aberto.
            </li>
            <li>
              <strong>Em repouso:</strong> as autorizacoes de acesso ficam cifradas no banco com AES-256-GCM, e a chave
              fica fora do banco, no ambiente da aplicacao. Uma copia do banco sozinha nao abre nada.
            </li>
            <li>
              <strong>Quem alcanca:</strong> os dados sao isolados por empresa e por papel de acesso. As autorizacoes so
              sao decifradas no servidor, no instante da chamada ao Google, e nenhuma pessoa da Zelo as le.
            </li>
            <li>
              <strong>Ao desligar:</strong> desconectar a agenda apaga as autorizacoes e os vinculos entre tarefa e
              compromisso na mesma operacao, sem copia guardada.
            </li>
          </ul>
          <p className="mt-3 leading-7 text-slate-700">
            Nao vendemos esses dados, nao os usamos para publicidade, nao os usamos para treinar modelos e nao os
            compartilhamos com terceiros. O uso das informacoes recebidas das APIs do Google segue a Politica de Dados
            do Usuario dos Servicos de API do Google, incluindo os requisitos de Uso Limitado.
          </p>
          <p className="mt-3 leading-7 text-slate-700">
            Voce desliga quando quiser, na propria tela de Agenda dentro da Zelo: as autorizacoes sao apagadas na hora e
            a Zelo perde o acesso. Os compromissos ja criados continuam na sua agenda, e voce apaga os que quiser por
            la. Tambem da para remover o acesso da Zelo direto na sua Conta Google, em myaccount.google.com/permissions.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Seus direitos</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Voce pode pedir confirmacao de tratamento, acesso, correcao, portabilidade, anonimizacao, eliminacao dos
            dados e informacao sobre com quem foram compartilhados. O pedido e feito pelo e-mail de contato indicado no
            rodape, e respondemos no prazo da lei.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Retencao</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Mantemos os dados enquanto a conta existir. Encerrada a conta, os dados sao eliminados, exceto o que
            precisamos guardar por obrigacao legal ou fiscal e o minimo necessario para defesa em processo.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Alteracoes</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Se esta politica mudar de forma relevante, avisamos dentro da plataforma antes de a mudanca passar a valer.
          </p>
        </section>
      </article>

      <SiteFooter />
    </main>
  );
}
