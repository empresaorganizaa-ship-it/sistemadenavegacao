"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { comentar, excluirComentario } from "@/app/(app)/acoes-entidades";
import { Aviso } from "./ui";

export function FormComentario({ entidade, registroId }: { entidade: string; registroId: string }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await comentar(entidade, registroId, texto);
          if (r?.erro) setErro(r.erro);
          else {
            setTexto("");
            setErro("");
          }
        });
      }}
    >
      <label htmlFor={`c-${registroId}`} className="sr-only">Novo comentário</label>
      <textarea
        id={`c-${registroId}`}
        className="campo"
        rows={2}
        placeholder="Escreva um comentário…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <button className="botao self-end" disabled={pendente || !texto.trim()}>
        {pendente ? "Enviando…" : "Comentar"}
      </button>
    </form>
  );
}

export function ApagarComentario({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      aria-label="Apagar comentário"
      className="text-suave hover:text-erro"
      disabled={pendente}
      onClick={() => confirm("Apagar este comentário?") && iniciar(async () => void (await excluirComentario(id)))}
    >
      <X className="size-3.5" />
    </button>
  );
}
