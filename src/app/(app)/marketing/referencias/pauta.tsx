"use client";

import { useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { transformarEmPauta } from "./acoes";

export function BotaoPauta({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      className="inline-flex items-center gap-1 text-xs font-medium text-destaque-escuro hover:underline"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await transformarEmPauta(id);
          if (r?.erro) alert(r.erro);
        })
      }
    >
      <CalendarPlus className="size-3.5" /> {pendente ? "Criando…" : "Transformar em pauta"}
    </button>
  );
}
