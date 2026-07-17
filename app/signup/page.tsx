import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { signupAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";

const errorMessages: Record<string, string> = {
  dados: "Revise os dados. A senha deve ter 10 caracteres, letra maiuscula, minuscula e numero.",
  email: "Este e-mail ja esta cadastrado. Entre na conta ou use outro e-mail.",
  rate: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = params.error ? errorMessages[params.error] : null;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm lg:grid-cols-[1fr_440px]">
        <section className="flex min-h-[620px] flex-col justify-between bg-slate-950 p-8 text-white">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo variant="iconDark" decorative className="h-11 w-11" priority />
              <div>
                <h1 className="text-xl font-semibold">Zelo</h1>
                <p className="text-sm text-slate-300">Gestao simples da operacao</p>
              </div>
            </Link>
            <p className="mt-16 max-w-lg text-3xl font-semibold leading-tight">
              Crie sua empresa e comece com tarefas, setores e metas salvos em um ambiente proprio.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
            <p>Conta isolada por empresa.</p>
            <p>Sessao protegida por cookie seguro.</p>
            <p>Senha forte obrigatoria.</p>
          </div>
        </section>

        <section className="p-8">
          <div className="mb-8 flex items-center gap-2 text-sm font-medium text-slate-500">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Cadastro sem cobranca automatica
          </div>
          <h2 className="text-2xl font-semibold text-slate-950">Criar conta</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Os dados cadastrados ficam salvos por empresa. As funcionalidades sao liberadas somente apos uma assinatura ativa.
          </p>

          <form action={signupAction} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Input name="companyName" placeholder="Nome da empresa" required minLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <Input name="segment" placeholder="Ex.: varejo, clinica, servicos" />
            </div>
            <div className="space-y-1.5">
              <Label>Seu nome</Label>
              <Input name="ownerName" placeholder="Nome completo" required minLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input name="email" type="email" placeholder="voce@empresa.com" required />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input name="password" type="password" required minLength={10} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar senha</Label>
              <Input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" />
            </div>
            {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            <Button type="submit" className="w-full">
              Criar conta e entrar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
            <LockKeyhole className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Ja tem conta?
            <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Entrar
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
