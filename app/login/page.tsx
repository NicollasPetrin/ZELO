import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError, AuthShell } from "@/components/auth/auth-shell";
import { ProductPreview } from "@/components/auth/product-preview";
import { loginAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input, Label } from "@/components/ui/fields";
import { PasswordInput } from "@/components/ui/password-input";
import { TRIAL_DAYS } from "@/lib/subscription";

const errorMessages: Record<string, string> = {
  credenciais: "E-mail ou senha inválidos.",
  preencha: "Preencha e-mail e senha para entrar.",
  rate: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
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
    <AuthShell
      topLink={
        <>
          Não tem conta?{" "}
          <Link href="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Criar conta
          </Link>
        </>
      }
      aside={
        <>
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold leading-tight text-slate-950">Cada tarefa com dono, prazo e lugar certo.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              O seu dia no Início, os setores com o que está atrasado e o quadro da equipe. Tudo no mesmo lugar.
            </p>
          </div>
          <ProductPreview />
        </>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Entrar na Zelo</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Use o e-mail e a senha da sua conta.</p>

      {error ? <AuthError>{error}</AuthError> : null}

      <form action={loginAction} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com" required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </div>
        <SubmitButton className="h-11 w-full" pendingLabel="Entrando...">
          Entrar
        </SubmitButton>
      </form>

      <div className="mt-8 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        Primeira vez por aqui?{" "}
        <Link href="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800">
          Crie a conta da sua empresa
        </Link>{" "}
        e teste {TRIAL_DAYS} dias grátis, sem cartão.
      </div>
    </AuthShell>
  );
}
