"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { marcarCombinado } from "./acoes";
import { RESPONSAVEIS, rotuloOpcao } from "@/lib/entidades";
import { data as fData } from "@/lib/formatos";

export type Combinado = {
  id: string;
  texto: string;
  responsavel: string;
  prazo: string | null;
  feito: boolean;
  encontro_id: string;
  encontro?: string;
};

export function ListaCombinados({
  itens, podeMarcar, hoje, mostrarEncontro = false, acoes,
}: {
  itens: Combinado[];
  podeMarcar: boolean;
  hoje: string;
  mostrarEncontro?: boolean;
  acoes?: Record<string, React.ReactNode>;
}) {
  const [lista, alternar] = useOptimistic(itens, (s, id: string) => s.map((i) => (i.id === id ? { ...i, feito: !i.feito } : i)));
  const [, iniciar] = useTransition();
  return (
    <ul className="flex flex-col gap-1">
      {lista.map((c) => {
        const atrasado = !c.feito && c.prazo && c.prazo < hoje;
        const ehHoje = !c.feito && c.prazo === hoje;
        return (
          <li key={c.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-superficie-2">
            <button
              type="button"
              disabled={!podeMarcar}
              aria-pressed={c.feito}
              aria-label={c.feito ? `Desmarcar: ${c.texto}` : `Marcar como feito: ${c.texto}`}
              onClick={() => iniciar(async () => { alternar(c.id); await marcarCombinado(c.id, !c.feito); })}
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition disabled:cursor-default ${c.feito ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda bg-superficie"}`}
            >
              {c.feito && <Check className="size-3.5" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${c.feito ? "text-suave line-through" : ""}`}>{c.texto}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-suave">
                <span>{rotuloOpcao(RESPONSAVEIS, c.responsavel)}</span>
                {c.prazo && (
                  <span className={atrasado ? "font-medium text-erro" : ehHoje ? "font-medium text-alerta" : ""}>
                    · prazo {ehHoje ? "hoje" : fData(c.prazo)}{atrasado ? " (atrasado)" : ""}
                  </span>
                )}
                {mostrarEncontro && c.encontro && (
                  <Link href={`/encontros/${c.encontro_id}`} className="hover:text-texto">· {c.encontro}</Link>
                )}
              </p>
            </div>
            {acoes?.[c.id]}
          </li>
        );
      })}
    </ul>
  );
}
