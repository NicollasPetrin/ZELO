import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { loginAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";

const errorMessages: Record<string, string> = {
  credenciais: "E-mail ou senha invalidos.",
  preencha: "Preencha e-mail e senha para entrar.",
};

export default async function LoginPage({
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
      <div className="grid w-full max-w-5xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm lg:grid-cols-[1fr_420px]">
        <section className="flex min-h-[520px] flex-col justify-between bg-slate-950 p-8 text-white">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo variant="iconDark" decorative className="h-11 w-11" priority />
              <div>
                <h1 className="text-xl font-semibold">Zelo</h1>
                <p className="text-sm text-slate-300">Rotina da equipe em um lugar visivel.</p>
              </div>
            </Link>
            <p className="mt-16 max-w-lg text-3xl font-semibold leading-tight">
              Entre para continuar gerenciando tarefas, prazos, setores e metas da sua empresa.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
            <p>Dados separados por empresa.</p>
            <p>Acesso protegido por sessao assinada.</p>
            <p>Permissoes por dono, gerente e funcionario.</p>
          </div>
        </section>

        <section className="p-8">
          <div className="mb-8 flex items-center gap-2 text-sm font-medium text-slate-500">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Acesso seguro
          </div>
          <h2 className="text-2xl font-semibold text-slate-950">Entrar</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use o e-mail e a senha cadastrados na sua conta.</p>

          <form action={loginAction} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input name="password" type="password" autoComplete="current-password" required />
            </div>
            {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            <Button type="submit" className="w-full">
              Entrar no painel
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Ainda nao tem conta?{" "}
            <Link href="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Criar conta
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
