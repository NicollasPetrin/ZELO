"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input, Label } from "@/components/ui/fields";
import { CEP_MENSAGENS, lookupCep, onlyDigits } from "@/lib/cep";

type Estado = "parado" | "buscando" | "preenchido" | "naoEncontrado" | "indisponivel";

/**
 * Campos de endereco de cobranca com preenchimento pelo CEP.
 *
 * O foco vai para o numero depois de preencher: e o unico campo que a consulta
 * nao traz, entao e sempre o proximo que a pessoa precisa digitar.
 */
export function BillingAddressFields() {
  const [estado, setEstado] = useState<Estado>("parado");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const numeroRef = useRef<HTMLInputElement>(null);
  const ultimoBuscado = useRef<string>("");

  async function buscar(valor: string) {
    const digitos = onlyDigits(valor);

    // Sem isto a consulta repetiria a cada tecla depois do oitavo digito.
    if (digitos.length !== 8 || digitos === ultimoBuscado.current) {
      return;
    }

    ultimoBuscado.current = digitos;
    setEstado("buscando");

    const resultado = await lookupCep(digitos);

    if (!resultado.ok) {
      setEstado(resultado.motivo === "naoEncontrado" ? "naoEncontrado" : "indisponivel");
      return;
    }

    setAddress(resultado.address);
    setProvince(resultado.province);
    setEstado("preenchido");
    numeroRef.current?.focus();
  }

  const mensagem = estado === "parado" ? null : CEP_MENSAGENS[estado];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div className="space-y-1.5">
          <Label>CEP</Label>
          <Input
            name="postalCode"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="01310-100"
            maxLength={9}
            required
            onChange={(event) => buscar(event.target.value)}
            onBlur={(event) => buscar(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Numero</Label>
          <Input ref={numeroRef} name="addressNumber" placeholder="1000" required />
        </div>
      </div>

      {mensagem ? (
        <p
          className={`flex items-center gap-1.5 text-xs leading-5 ${
            estado === "preenchido" ? "text-emerald-700" : "text-slate-600"
          }`}
          role="status"
          aria-live="polite"
        >
          {estado === "buscando" ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
          {mensagem}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label>Logradouro</Label>
        <Input
          name="address"
          autoComplete="address-line1"
          placeholder="Avenida Paulista"
          required
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div className="space-y-1.5">
          <Label>Bairro</Label>
          <Input
            name="province"
            placeholder="Bela Vista"
            required
            value={province}
            onChange={(event) => setProvince(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Complemento</Label>
          <Input name="addressComplement" placeholder="Sala 12 (opcional)" />
        </div>
      </div>
    </>
  );
}
