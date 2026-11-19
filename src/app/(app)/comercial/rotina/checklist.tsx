"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { marcarTarefa } from "./acoes";

type Item = { id: string; titulo: string; descricao: string | null; feito: boolean };

export function Checklist({ itens, periodo, podeEditar }: { itens: Item[]; periodo: string; podeEditar: boolean }) {
  const [lista, alternar] = useOptimistic(itens, (s, id: string) => s.map((i) => (i.id === id ? { ...i, feito: !i.feito } : i)));
  const [, iniciar] = useTransition();
  return (
    <ul className="flex flex-col gap-1">
      {lista.map((i) => (
        <li key={i.id}>
          <button
            type="button"
            disabled={!podeEditar}
            onClick={() =>
              iniciar(async () => {
                alternar(i.id);
                await marcarTarefa(i.id, periodo, !i.feito);
              })
            }
            className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-superficie-2 disabled:cursor-default disabled:hover:bg-transparent"
            aria-pressed={i.feito}
          >
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition ${i.feito ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda bg-superficie"}`}>
              {i.feito && <Check className="size-3.5" />}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm ${i.feito ? "text-suave line-through" : ""}`}>{i.titulo}</span>
              {i.descricao && <span className="block text-xs text-suave">{i.descricao}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
