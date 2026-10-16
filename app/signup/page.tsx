import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { AuthError, AuthShell } from "@/components/auth/auth-shell";
import { ProductPreview } from "@/components/auth/product-preview";
import { signupAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input, Label } from "@/components/ui/fields";
import { PasswordInput } from "@/components/ui/password-input";
import { BillingAddressFields } from "@/features/billing/billing-address-fields";
import { planDetails, planOrder } from "@/lib/plans";
import { TRIAL_DAYS } from "@/lib/subscription";

const errorMessages: Record<string, string> = {
  dados:
    "Algum campo está inválido. Confira o CNPJ, o telefone, o endereço, o e-mail e a senha (8 caracteres, com letra maiúscula e caractere especial).",
  email: "Este e-mail já está cadastrado. Entre na conta ou use outro e-mail.",
  rate: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  documento: "Este CNPJ ou CPF já está cadastrado em outra conta.",
  dadosCobranca: "Complete os dados de cobrança para assinar o plano.",
};

function Bloco({ numero, titulo, descricao, children }: { numero: number; titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="flex items-center gap-2 text-sm font-semibold text-slate-950">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
          {numero}
        </span>
        {titulo}
      </legend>
      {descricao ? <p className="-mt-2 text-xs leading-5 text-slate-500">{descricao}</p> : null}
      {children}
    </fieldset>
  );
}

function Vantagem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 text-sm leading-6 text-slate-700">
      <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; plano?: string; teste?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = params.error ? errorMessages[params.error] : null;
  // Plano escolhido na landing. Sem ele o cadastro segue como antes, so criando
  // a conta — quem quer conhecer o produto nao e obrigado a pagar na porta.
  const planCode = planOrder.find((code) => code === params.plano) ?? null;
  const plan = planCode ? planDetails[planCode] : null;
  // Escolher plano e comecar o teste sao a mesma coisa agora: o mes gratuito e
  // da empresa, nao do link por onde ela entrou. Nao ha mais dois caminhos.
  const comTeste = Boolean(plan);

  // O resumo do plano aparece no painel lateral em tela larga e no topo do
  // formulario no celular, onde o painel nao existe.
  const resumoDoPlano = plan ? (
    <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Plano {plan.name}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{TRIAL_DAYS} dias grátis</p>
      <p className="text-sm text-slate-600">
        Depois, {plan.price}/mês · {plan.includedUsers} usuários incluídos
      </p>
      <ul className="mt-3 space-y-1">
        <Vantagem>Nenhum cartão é pedido: o teste começa na tela seguinte.</Vantagem>
        <Vantagem>Ao fim do teste o acesso é bloqueado até o pagamento, e seus dados continuam guardados.</Vantagem>
      </ul>
      <Link href="/signup" className="mt-3 inline-block text-xs font-semibold text-emerald-700 underline hover:text-emerald-800">
        Prefiro só criar a conta
      </Link>
    </div>
  ) : null;

  return (
    <AuthShell
      wide
      topLink={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Entrar
          </Link>
        </>
      }
      aside={
        <>
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold leading-tight text-slate-950">Tire a equipe do grupo de WhatsApp.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Tarefas com responsável, prazo e prova de conclusão, separadas por setor, num ambiente só da sua empresa.
            </p>
          </div>
          {resumoDoPlano ?? <ProductPreview />}
          {resumoDoPlano ? null : (
            <ul className="max-w-md space-y-1">
              <Vantagem>{TRIAL_DAYS} dias grátis em qualquer plano, sem cartão.</Vantagem>
              <Vantagem>O plano é escolhido na tela seguinte.</Vantagem>
            </ul>
          )}
        </>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
        {comTeste ? `Testar o Plano ${plan?.name}` : "Criar a conta da sua empresa"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {comTeste ? (
          `Leva uns dois minutos. O teste de ${TRIAL_DAYS} dias começa assim que a conta é criada.`
        ) : (
          <>
            Leva uns dois minutos. O plano é escolhido na tela seguinte, com {TRIAL_DAYS} dias grátis e sem cartão.{" "}
            <Link href="/#planos" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Ver planos
            </Link>
          </>
        )}
      </p>

      {resumoDoPlano ? <div className="mt-6 lg:hidden">{resumoDoPlano}</div> : null}

      {error ? <AuthError>{error}</AuthError> : null}

      <form action={signupAction} className="mt-8 space-y-8">
        {plan ? <input type="hidden" name="plan" value={plan.code} /> : null}

        <Bloco numero={1} titulo="Sua empresa">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Nome da empresa</Label>
            <Input id="companyName" name="companyName" placeholder="Ex.: Mercado Bom Preço" required minLength={2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="document">CNPJ ou CPF</Label>
              <Input id="document" name="document" inputMode="numeric" autoComplete="off" placeholder="Somente números" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="(11) 98765-4321" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="segment">Segmento (opcional)</Label>
            <Input id="segment" name="segment" placeholder="Ex.: varejo, clínica, serviços" />
          </div>
        </Bloco>

        {/* Os dados de cobranca sao pedidos uma vez, aqui, mesmo sem plano
            escolhido: e o que faz o pagamento no fim do teste ser um clique
            em vez de um cadastro novo. */}
        <Bloco
          numero={2}
          titulo="Endereço de cobrança"
          descricao="Pedimos agora para que, no fim do teste, assinar seja um clique. Digite o CEP e o resto se preenche."
        >
          <BillingAddressFields />
        </Bloco>

        <Bloco numero={3} titulo="Seu acesso" descricao="Você entra como dono da conta e cadastra a equipe depois.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ownerName">Seu nome</Label>
              <Input id="ownerName" name="ownerName" autoComplete="name" placeholder="Nome completo" required minLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" aria-describedby="regra-senha" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <PasswordInput id="confirmPassword" name="confirmPassword" required minLength={8} autoComplete="new-password" />
            </div>
          </div>
          <p id="regra-senha" className="-mt-1 text-xs leading-5 text-slate-500">
            Pelo menos 8 caracteres, com uma letra maiúscula e um caractere especial, como ! @ # ou $.
          </p>
        </Bloco>

        <SubmitButton
          className="h-11 w-full"
          pendingLabel="Criando sua conta..."
          icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
        >
          {comTeste ? "Criar conta e começar o teste" : "Criar conta"}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
