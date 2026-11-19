"use client";

import { useMemo, useState, useTransition } from "react";
import { salvarLeadsOrigem, type Resultado } from "./acoes";
import { MESES, MESES_CURTOS, lerNumero } from "@/lib/formatos";
import { Aviso } from "@/components/ui";
import type { OrigemLead } from "@/lib/tipos";

type Props = {
  ano: number;
  origens: OrigemLead[];
  valores: { origem_id: string; mes: number; quantidade: number }[];
  leadsPorMes: Record<number, number | null>;
  podeEditar: boolean;
};

const MESES_LISTA = Array.from({ length: 12 }, (_, i) => i + 1);
const chave = (o: string, m: number) => `${o}:${m}`;

export function EditorOrigens({ ano, origens, valores, leadsPorMes, podeEditar }: Props) {
  const inicial = useMemo(() => {
    const r: Record<string, string> = {};
    for (const v of valores) r[chave(v.origem_id, v.mes)] = String(v.quantidade);
    return r;
  }, [valores]);
  const [estado, setEstado] = useState(inicial);
  const [base, setBase] = useState(inicial);
  const [resultado, setResultado] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();

  if (base !== inicial) {
    setBase(inicial);
    setEstado(inicial);
  }

  const alteradas = Object.keys(estado).filter((k) => (estado[k] ?? "") !== (inicial[k] ?? ""));
  const totalMes = (m: number) => origens.reduce((s, o) => s + (lerNumero(estado[chave(o.id, m)]) ?? 0), 0);

  if (!origens.length) return null;

  return (
    <section className="cartao mt-8 p-0">
      <div className="px-5 pt-5">
        <h2 className="text-xl">Leads por origem</h2>
        <p className="text-sm text-suave">
          De onde vieram os leads de cada mês. A lista de origens pode ser editada em Configurações.
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-superficie-2 text-xs tracking-wide text-suave uppercase">
              <th className="sticky left-0 z-10 bg-superficie-2 px-4 py-2 text-left font-medium">Origem</th>
              {MESES_LISTA.map((m) => (
                <th key={m} className="px-1 py-2 text-center font-medium">{MESES_CURTOS[m - 1]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {origens.map((o) => (
              <tr key={o.id} className="border-t border-borda">
                <th scope="row" className="sticky left-0 z-10 bg-superficie px-4 py-1.5 text-left font-normal whitespace-nowrap">
                  {o.nome}
                </th>
                {MESES_LISTA.map((m) => (
                  <td key={m} className="px-0.5 py-1">
                    <input
                      aria-label={`Leads de ${o.nome} em ${MESES[m - 1]}`}
                      inputMode="numeric"
                      className="campo min-w-[52px] px-1.5 py-1 text-right text-xs tabular-nums"
                      value={estado[chave(o.id, m)] ?? ""}
                      disabled={!podeEditar}
                      onChange={(e) => {
                        setResultado(undefined);
                        setEstado((s) => ({ ...s, [chave(o.id, m)]: e.target.value }));
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-borda bg-superficie-2 font-medium">
              <th scope="row" className="sticky left-0 z-10 bg-superficie-2 px-4 py-2 text-left">Total</th>
              {MESES_LISTA.map((m) => {
                const t = totalMes(m);
                const leads = leadsPorMes[m];
                const diferente = leads !== null && t > 0 && t !== leads;
                return (
                  <td
                    key={m}
                    className={`px-1.5 py-2 text-right text-xs tabular-nums ${diferente ? "text-alerta" : ""}`}
                    title={diferente ? `Diferente dos leads novos do mês (${leads})` : undefined}
                  >
                    {t || "—"}
                    {diferente && " ⚠"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda px-5 py-3">
        <p className="text-xs text-suave">⚠ = total diferente do número de leads novos digitado no mês.</p>
        <div className="flex items-center gap-3">
          {resultado?.erro && <Aviso tipo="erro">{resultado.erro}</Aviso>}
          {resultado?.ok && !alteradas.length && <Aviso tipo="sucesso">{resultado.ok}</Aviso>}
          {podeEditar && (
            <button
              className="botao"
              disabled={pendente || !alteradas.length}
              onClick={() =>
                iniciar(async () => {
                  const itens = alteradas.map((k) => {
                    const [origem_id, mes] = k.split(":");
                    return { origem_id, mes: Number(mes), quantidade: estado[k] ?? "" };
                  });
                  setResultado(await salvarLeadsOrigem(ano, itens));
                })
              }
            >
              {pendente ? "Salvando…" : "Salvar leads por origem"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
