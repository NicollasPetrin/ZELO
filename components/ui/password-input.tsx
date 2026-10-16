"use client";

import { useState, type ComponentPropsWithRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/fields";

/** Campo de senha com o botao de mostrar/esconder: no celular, errar a senha sem ver o que digitou e a causa mais comum de login recusado. */
export function PasswordInput(props: Omit<ComponentPropsWithRef<"input">, "type">) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visivel ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisivel((atual) => !atual)}
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={visivel}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate-400 hover:text-slate-700"
      >
        {visivel ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
