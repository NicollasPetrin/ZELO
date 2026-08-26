import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { assertIpRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

const VIACEP_TIMEOUT_MS = 5000;

/**
 * Consulta de CEP.
 *
 * A busca passa por aqui em vez de ir do navegador direto ao ViaCEP porque a
 * CSP da aplicacao permite apenas connect-src 'self'. Manter assim tem duas
 * vantagens alem da regra: o endereco do terceiro nao fica exposto na pagina, e
 * da para limitar abuso antes de repassar a chamada.
 */
export async function GET(request: NextRequest) {
  const cep = (request.nextUrl.searchParams.get("cep") ?? "").replace(/\D/g, "");

  if (cep.length !== 8) {
    return NextResponse.json({ error: "CEP invalido." }, { status: 400 });
  }

  try {
    // Endpoint publico repassado com nosso limite: sem isso qualquer pessoa
    // usaria a Zelo como proxy gratuito para varrer a base do ViaCEP.
    await assertIpRateLimit("cep", 60, 60_000);
  } catch {
    return NextResponse.json({ error: "Muitas consultas. Aguarde um momento." }, { status: 429 });
  }

  let dados: {
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: string | boolean;
  };

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(VIACEP_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });

    if (!resposta.ok) {
      return NextResponse.json({ error: "CEP nao encontrado." }, { status: 404 });
    }

    dados = await resposta.json();
  } catch (error) {
    console.error("[cep] falha ao consultar o ViaCEP:", error);

    // Preencher sozinho e conveniencia: quando falha, a pessoa digita o
    // endereco na mao e o cadastro segue.
    return NextResponse.json({ error: "Nao foi possivel consultar o CEP agora." }, { status: 503 });
  }

  // O ViaCEP responde 200 com {"erro":"true"} quando o CEP nao existe, entao
  // olhar so o status deixaria passar um endereco vazio.
  if (dados.erro || !dados.logradouro) {
    return NextResponse.json({ error: "CEP nao encontrado." }, { status: 404 });
  }

  return NextResponse.json(
    {
      address: dados.logradouro ?? "",
      province: dados.bairro ?? "",
      city: dados.localidade ?? "",
      state: dados.uf ?? "",
    },
    {
      // Endereco de CEP muda muito raramente; cachear evita repetir a consulta
      // a cada tecla numa mesma sessao.
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
