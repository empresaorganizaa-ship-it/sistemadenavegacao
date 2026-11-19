"use client";

import { useTransition } from "react";
import { alterarCampo } from "@/app/(app)/acoes-entidades";
import { STATUS_INDICACAO } from "@/lib/entidades";

export function ControlesIndicacao({ id, status, recompensa, podeEditar }: { id: string; status: string; recompensa: boolean; podeEditar: boolean }) {
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <select
        aria-label="Status da indicação"
        className="rounded-md border border-borda bg-superficie px-2 py-1 text-xs"
        defaultValue={status}
        disabled={!podeEditar || pendente}
        onChange={(e) => iniciar(async () => void (await alterarCampo("indicacoes", id, "status", e.target.value)))}
      >
        {STATUS_INDICACAO.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
      </select>
      <label className="flex items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          className="size-4 accent-[var(--destaque)]"
          defaultChecked={recompensa}
          disabled={!podeEditar || pendente}
          onChange={(e) => iniciar(async () => void (await alterarCampo("indicacoes", id, "recompensa_entregue", e.target.checked)))}
        />
        Recompensa entregue
      </label>
    </div>
  );
}
