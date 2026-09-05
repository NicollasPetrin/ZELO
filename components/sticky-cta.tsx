"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Barra de acao fixa, so no celular.
 *
 * A pagina tem cerca de onze telas de rolagem no telefone, e a acao principal
 * so existe na primeira e na ultima. Quem se convence no meio do caminho
 * precisa rolar ate o fim para achar o botao — e desistir e mais barato do que
 * procurar.
 *
 * A barra nao aparece de saida: enquanto o botao do topo estiver visivel, ela
 * seria uma segunda copia do mesmo comando disputando a mesma tela. Ela entra
 * quando aquele botao sai de vista, que e exatamente o momento em que a pessoa
 * fica sem meio de agir.
 *
 * Observar a interseccao custa menos que ouvir a rolagem: o navegador avisa
 * quando o alvo cruza a borda da tela, em vez de o codigo comparar posicoes a
 * cada quadro e forcar leitura de layout junto.
 */
export function StickyCta({ href, label, watchId }: { href: string; label: string; watchId: string }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const alvo = document.getElementById(watchId);

    if (!alvo) {
      return;
    }

    // Só mostra depois de ter visto o alvo ao menos uma vez. Sem isto, quem
    // abrisse a pagina ja rolada — por um link com ancora, ou pela restauracao
    // de posicao do navegador — veria a barra surgir antes de existir algo de
    // onde ela pudesse ter vindo.
    let jaApareceu = false;

    const observer = new IntersectionObserver(([entrada]) => {
      jaApareceu = jaApareceu || entrada.isIntersecting;
      setVisivel(jaApareceu && !entrada.isIntersecting);
    });

    observer.observe(alvo);

    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div
      // inert enquanto escondida: sem isto o botao continua no caminho do
      // teclado, e o foco desaparece atras de uma barra invisivel.
      inert={!visivel}
      aria-hidden={!visivel}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-emerald-900/10 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-300 motion-reduce:transition-none lg:hidden ${
        visivel ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link
        href={href}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#247451] text-sm font-semibold text-white transition-colors hover:bg-[#1c5c40] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        {label}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
