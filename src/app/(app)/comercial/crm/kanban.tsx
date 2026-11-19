"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { alterarCampo } from "@/app/(app)/acoes-entidades";
import { data as fData, reais } from "@/lib/formatos";
import { linkWhatsapp } from "@/lib/whatsapp";

export type LeadCartao = {
  id: string;
  nome: string;
  whatsapp: string | null;
  coluna_id: string | null;
  procedimento: string | null;
  valor: number | null;
  proxima_acao: string | null;
  proxima_acao_data: string | null;
};
type Coluna = { id: string; nome: string; tipo: string };

function Cartao({ l, colunas, podeEditar, hoje, mover }: { l: LeadCartao; colunas: Coluna[]; podeEditar: boolean; hoje: string; mover: (id: string, col: string) => void }) {
  const zap = linkWhatsapp(l.whatsapp);
  const atrasada = l.proxima_acao_data && l.proxima_acao_data < hoje;
  const ehHoje = l.proxima_acao_data === hoje;
  return (
    <div
      draggable={podeEditar}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
      className="rounded-xl border border-borda bg-superficie p-3 shadow-[0_1px_2px_rgba(46,36,33,0.05)]"
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/item/leads/${l.id}`} className="font-medium leading-tight hover:text-destaque-escuro">{l.nome}</Link>
        {zap && (
          <a href={zap} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${l.nome}`} className="shrink-0 rounded-full p-1 text-sucesso hover:bg-sucesso/10">
            <MessageCircle className="size-4" />
          </a>
        )}
      </div>
      {(l.procedimento || l.valor) && (
        <p className="mt-1 text-xs text-suave">
          {l.procedimento}
          {l.procedimento && l.valor ? " · " : ""}
          {l.valor ? reais(Number(l.valor), true) : ""}
        </p>
      )}
      {l.proxima_acao && (
        <p className={`mt-2 rounded-lg px-2 py-1 text-xs ${atrasada ? "bg-erro/10 text-erro" : ehHoje ? "bg-alerta/10 text-alerta" : "bg-superficie-2"}`}>
          {l.proxima_acao}
          {l.proxima_acao_data && <span className="font-medium"> · {ehHoje ? "hoje" : fData(l.proxima_acao_data).slice(0, 5)}</span>}
        </p>
      )}
      {podeEditar && (
        <select
          aria-label={`Mover ${l.nome} para`}
          className="mt-2 w-full rounded-md border border-borda bg-superficie-2 px-2 py-1 text-xs text-suave"
          value={l.coluna_id ?? ""}
          onChange={(e) => mover(l.id, e.target.value)}
        >
          {colunas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      )}
    </div>
  );
}

export function Kanban({ colunas, leads, podeEditar, hoje }: { colunas: Coluna[]; leads: LeadCartao[]; podeEditar: boolean; hoje: string }) {
  const [lista, moverOtimista] = useOptimistic(leads, (s, { id, col }: { id: string; col: string }) =>
    s.map((l) => (l.id === id ? { ...l, coluna_id: col } : l)),
  );
  const [, iniciar] = useTransition();
  const [sobre, setSobre] = useState<string | null>(null);
  const [aba, setAba] = useState(colunas[0]?.id ?? "");
  const [erro, setErro] = useState("");

  function mover(id: string, col: string) {
    iniciar(async () => {
      moverOtimista({ id, col });
      const r = await alterarCampo("leads", id, "coluna_id", col);
      if (r?.erro) setErro(r.erro);
    });
  }

  const porColuna = (id: string) => lista.filter((l) => l.coluna_id === id);
  const semColuna = lista.filter((l) => !l.coluna_id || !colunas.some((c) => c.id === l.coluna_id));

  return (
    <>
      {erro && <p className="mb-2 text-sm text-erro">{erro}</p>}
      {/* Celular: uma coluna por vez */}
      <div className="lg:hidden">
        <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {colunas.map((c) => (
            <button
              key={c.id}
              onClick={() => setAba(c.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm ${aba === c.id ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda bg-superficie text-suave"}`}
            >
              {c.nome} <span className="opacity-70">{porColuna(c.id).length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {porColuna(aba).map((l) => <Cartao key={l.id} l={l} colunas={colunas} podeEditar={podeEditar} hoje={hoje} mover={mover} />)}
          {!porColuna(aba).length && <p className="py-6 text-center text-sm text-suave">Nenhuma paciente nesta etapa.</p>}
        </div>
      </div>

      {/* Computador: quadro com todas as colunas */}
      <div className="hidden gap-3 overflow-x-auto pb-4 lg:flex">
        {colunas.map((c) => (
          <section
            key={c.id}
            onDragOver={(e) => {
              if (!podeEditar) return;
              e.preventDefault();
              setSobre(c.id);
            }}
            onDragLeave={() => setSobre(null)}
            onDrop={(e) => {
              e.preventDefault();
              setSobre(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) mover(id, c.id);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border p-2 transition ${sobre === c.id ? "border-destaque bg-destaque-suave" : "border-borda bg-superficie-2"}`}
            aria-label={c.nome}
          >
            <header className="flex items-center justify-between px-2 py-1.5">
              <h2 className="font-sans text-sm font-medium">{c.nome}</h2>
              <span className="rounded-full bg-superficie px-2 text-xs text-suave">{porColuna(c.id).length}</span>
            </header>
            <div className="flex min-h-24 flex-col gap-2">
              {porColuna(c.id).map((l) => <Cartao key={l.id} l={l} colunas={colunas} podeEditar={podeEditar} hoje={hoje} mover={mover} />)}
            </div>
          </section>
        ))}
      </div>
      {semColuna.length > 0 && (
        <p className="mt-2 text-xs text-suave">{semColuna.length} paciente(s) sem etapa definida: abra e escolha uma etapa.</p>
      )}
    </>
  );
}
