"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moverEtapa } from "@/app/(app)/acompanhamento/acoes";
import { data as fData } from "@/lib/formatos";

export type Acao = {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string;
};
type Status = "proxima" | "andamento" | "concluida";

const COLUNAS: { status: Status; titulo: string; marca: string }[] = [
  { status: "proxima", titulo: "A fazer", marca: "bg-borda" },
  { status: "andamento", titulo: "Em andamento", marca: "bg-alerta" },
  { status: "concluida", titulo: "Concluído", marca: "bg-sucesso" },
];

function Cartao({ a, hoje, podeMover, compacto, mover }: { a: Acao; hoje: string; podeMover: boolean; compacto: boolean; mover: (id: string, s: Status) => void }) {
  const feito = a.status === "concluida";
  const atrasada = !feito && a.data_fim && a.data_fim < hoje;
  const ehHoje = !feito && a.data_fim === hoje;
  return (
    <div
      draggable={podeMover}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
      className={`rounded-xl border border-borda bg-superficie p-3 shadow-[0_1px_2px_rgba(46,36,33,0.05)] ${podeMover ? "lg:cursor-grab" : ""}`}
    >
      <Link href={`/item/etapas_acompanhamento/${a.id}`} className={`block text-sm leading-snug font-medium hover:text-destaque-escuro ${feito ? "text-suave line-through" : ""}`}>
        {a.titulo}
      </Link>
      {!compacto && a.descricao && <p className="mt-1 line-clamp-3 text-xs text-suave">{a.descricao}</p>}
      {a.data_fim && (
        <p className={`mt-2 inline-block rounded-md px-1.5 py-0.5 text-[11px] ${atrasada ? "bg-erro/10 text-erro" : ehHoje ? "bg-alerta/10 text-alerta" : "bg-superficie-2 text-suave"}`}>
          {feito ? "prazo era " : "prazo "}{ehHoje ? "hoje" : fData(a.data_fim)}{atrasada ? " · atrasada" : ""}
        </p>
      )}
      {podeMover && (
        <div className="mt-2 flex gap-1" role="group" aria-label={`Mover "${a.titulo}"`}>
          {COLUNAS.filter((c) => c.status !== a.status).map((c) => (
            <button
              key={c.status}
              type="button"
              onClick={() => mover(a.id, c.status)}
              className="rounded-md border border-borda px-2 py-0.5 text-[11px] text-suave transition hover:border-destaque hover:text-destaque-escuro"
            >
              → {c.titulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Quadro do cronograma do acompanhamento: A fazer | Em andamento | Concluído. */
export function QuadroCronograma({
  acoes, hoje, podeMover, compacto = false, limiteConcluidas,
}: {
  acoes: Acao[];
  hoje: string;
  podeMover: boolean;
  compacto?: boolean;
  /** no Início, mostra só as últimas concluídas */
  limiteConcluidas?: number;
}) {
  const [lista, moverOtimista] = useOptimistic(acoes, (s, { id, status }: { id: string; status: Status }) =>
    s.map((a) => (a.id === id ? { ...a, status } : a)),
  );
  const [, iniciar] = useTransition();
  const [sobre, setSobre] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  // no celular, uma coluna por vez (começa por "Em andamento", se houver)
  const [aba, setAba] = useState<Status>(acoes.some((a) => a.status === "andamento") ? "andamento" : "proxima");

  function mover(id: string, status: Status) {
    iniciar(async () => {
      moverOtimista({ id, status });
      const r = await moverEtapa(id, status);
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <>
      {erro && <p className="mb-2 text-sm text-erro">{erro}</p>}
      <div className="mb-2 flex gap-1.5 md:hidden" role="tablist" aria-label="Colunas do cronograma">
        {COLUNAS.map((c) => (
          <button
            key={c.status}
            type="button"
            role="tab"
            aria-selected={aba === c.status}
            onClick={() => setAba(c.status)}
            className={`flex-1 whitespace-nowrap rounded-full border px-1 py-1 text-xs ${aba === c.status ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda bg-superficie text-suave"}`}
          >
            {c.titulo} <span className="opacity-70">{lista.filter((a) => a.status === c.status).length}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {COLUNAS.map((c) => {
          let doStatus = lista.filter((a) => a.status === c.status);
          const total = doStatus.length;
          if (c.status === "concluida" && limiteConcluidas !== undefined) doStatus = doStatus.slice(-limiteConcluidas);
          return (
            <section
              key={c.status}
              aria-label={c.titulo}
              onDragOver={(e) => {
                if (!podeMover) return;
                e.preventDefault();
                setSobre(c.status);
              }}
              onDragLeave={() => setSobre(null)}
              onDrop={(e) => {
                e.preventDefault();
                setSobre(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) mover(id, c.status);
              }}
              className={`flex-col rounded-2xl border p-2 transition md:flex ${aba === c.status ? "flex" : "hidden"} ${sobre === c.status ? "border-destaque bg-destaque-suave" : "border-borda bg-superficie-2"}`}
            >
              <header className="hidden items-center justify-between px-2 py-1.5 md:flex">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className={`size-2 rounded-full ${c.marca}`} aria-hidden />
                  {c.titulo}
                </span>
                <span className="rounded-full bg-superficie px-2 text-xs text-suave">{total}</span>
              </header>
              <div className="flex min-h-16 flex-col gap-2">
                {doStatus.map((a) => (
                  <Cartao key={a.id} a={a} hoje={hoje} podeMover={podeMover} compacto={compacto} mover={mover} />
                ))}
                {!total && <p className="px-2 py-3 text-center text-xs text-suave">Nada aqui.</p>}
                {total > doStatus.length && (
                  <Link href="/acompanhamento" className="px-2 py-1 text-center text-xs text-suave underline underline-offset-4">
                    e mais {total - doStatus.length} concluída(s)
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
