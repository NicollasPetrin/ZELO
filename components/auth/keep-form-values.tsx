"use client";

import { useEffect, useRef } from "react";

/**
 * Devolve ao formulario o que a pessoa tinha digitado quando o envio volta
 * com erro.
 *
 * O login e o cadastro respondem com um redirecionamento para a propria
 * pagina (?error=...), e a pagina nova chega com os campos vazios: errar a
 * senha obrigava a digitar o e-mail de novo, e um CNPJ invalido apagava o
 * cadastro inteiro. Aqui os valores ficam so na aba atual (sessionStorage),
 * nunca na URL, e senhas e campos escondidos nunca sao guardados.
 */
export function KeepFormValues({ storageKey, focusAfterRestore }: { storageKey: string; focusAfterRestore?: string }) {
  const marcador = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = marcador.current?.closest("form");
    if (!form) {
      return;
    }

    const campos = () =>
      Array.from(form.elements).filter(
        (el): el is HTMLInputElement => el instanceof HTMLInputElement && Boolean(el.name) && !["password", "hidden", "file", "checkbox", "radio"].includes(el.type),
      );

    const guardar = () => {
      try {
        const valores = Object.fromEntries(campos().map((el) => [el.name, el.value]));
        sessionStorage.setItem(storageKey, JSON.stringify(valores));
      } catch {
        // Sem armazenamento (aba anonima, bloqueado): o formulario so nao lembra.
      }
    };
    form.addEventListener("submit", guardar);

    if (new URLSearchParams(window.location.search).has("error")) {
      try {
        const salvos = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}") as Record<string, string>;
        // Pelo setter nativo e com evento de input: alguns campos sao
        // controlados pelo React (endereco, bairro), e so mudar o value no DOM
        // seria desfeito no proximo render.
        const definir = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        let restaurou = false;
        for (const el of campos()) {
          const valor = salvos[el.name];
          if (valor && !el.value) {
            definir?.call(el, valor);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            restaurou = true;
          }
        }
        if (restaurou && focusAfterRestore) {
          form.querySelector<HTMLInputElement>(`[name="${focusAfterRestore}"]`)?.focus();
        }
      } catch {
        // Valor guardado ilegivel: segue com o formulario vazio.
      }
    } else {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // idem
      }
    }

    return () => form.removeEventListener("submit", guardar);
  }, [storageKey, focusAfterRestore]);

  return <span ref={marcador} hidden />;
}
