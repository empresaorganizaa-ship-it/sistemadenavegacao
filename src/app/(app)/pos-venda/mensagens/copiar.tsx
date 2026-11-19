"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopiarTexto({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="botao-secundario px-3 py-1.5 text-xs"
      onClick={() => {
        navigator.clipboard.writeText(texto);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
    >
      {ok ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {ok ? "Copiado" : "Copiar"}
    </button>
  );
}
