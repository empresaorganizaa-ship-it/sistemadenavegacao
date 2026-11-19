"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { marcarAniversario } from "../acoes";

export function MarcarEnviado({ leadId, ano, enviado, podeEditar }: { leadId: string; ano: number; enviado: boolean; podeEditar: boolean }) {
  const [v, set] = useOptimistic(enviado);
  const [, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={!podeEditar}
      aria-pressed={v}
      onClick={() => iniciar(async () => { set(!v); await marcarAniversario(leadId, ano, !v); })}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${v ? "border-sucesso/30 bg-sucesso/10 text-sucesso" : "border-borda text-suave"}`}
    >
      {v && <Check className="size-3.5" />} {v ? "Enviado" : "Marcar enviado"}
    </button>
  );
}
