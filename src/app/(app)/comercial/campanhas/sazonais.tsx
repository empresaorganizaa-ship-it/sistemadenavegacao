"use client";

import { useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { adicionarSazonais } from "./acoes";

export function BotaoSazonais({ ano }: { ano: number }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      className="botao-secundario"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await adicionarSazonais(ano);
          alert(r?.erro ?? r?.ok);
        })
      }
      title="Dia da Mulher, Dia das Mães, Namorados, aniversário do consultório, Black Friday e fim de ano"
    >
      <CalendarPlus className="size-4" /> {pendente ? "Adicionando…" : "Datas sazonais"}
    </button>
  );
}
