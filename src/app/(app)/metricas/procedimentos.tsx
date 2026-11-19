"use client";

import { useMemo, useState, useTransition } from "react";
import { salvarFaturamentoProcedimento, type Resultado } from "./acoes";
import { MESES, MESES_CURTOS, lerNumero, paraCampo, reais } from "@/lib/formatos";
import { Aviso } from "@/components/ui";

const MESES_LISTA = Array.from({ length: 12 }, (_, i) => i + 1);
const chave = (s: string, m: number) => `${s}:${m}`;

export function EditorProcedimentos({
  ano, servicos, valores, faturamentoPorMes, podeEditar,
}: {
  ano: number;
  servicos: { id: string; nome: string }[];
  valores: { servico_id: string; mes: number; valor: number }[];
  faturamentoPorMes: Record<number, number | null>;
  podeEditar: boolean;
}) {
  const inicial = useMemo(() => Object.fromEntries(valores.map((v) => [chave(v.servico_id, v.mes), paraCampo(v.valor, 2)])), [valores]);
  const [estado, setEstado] = useState<Record<string, string>>(inicial);
  const [base, setBase] = useState(inicial);
  const [r, setR] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();
  if (base !== inicial) {
    setBase(inicial);
    setEstado(inicial);
  }
  const alteradas = Object.keys(estado).filter((k) => (estado[k] ?? "") !== (inicial[k] ?? ""));
  const total = (m: number) => servicos.reduce((s, x) => s + (lerNumero(estado[chave(x.id, m)]) ?? 0), 0);

  return (
    <section className="cartao mt-8 p-0">
      <div className="px-5 pt-5">
        <h2 className="text-xl">Faturamento por procedimento <span className="font-sans text-xs text-suave">(opcional)</span></h2>
        <p className="text-sm text-suave">Quanto cada procedimento faturou no mês, em R$. A lista vem de Pós-venda → Serviços.</p>
      </div>
      {servicos.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="bg-superficie-2 text-xs tracking-wide text-suave uppercase">
                <th className="sticky left-0 z-10 bg-superficie-2 px-4 py-2 text-left font-medium">Procedimento</th>
                {MESES_LISTA.map((m) => <th key={m} className="px-1 py-2 text-center font-medium">{MESES_CURTOS[m - 1]}</th>)}
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id} className="border-t border-borda">
                  <th scope="row" className="sticky left-0 z-10 bg-superficie px-4 py-1.5 text-left font-normal whitespace-nowrap">{s.nome}</th>
                  {MESES_LISTA.map((m) => (
                    <td key={m} className="px-0.5 py-1">
                      <input
                        aria-label={`Faturamento de ${s.nome} em ${MESES[m - 1]}`}
                        inputMode="decimal"
                        className="campo min-w-[76px] px-1.5 py-1 text-right text-xs tabular-nums"
                        value={estado[chave(s.id, m)] ?? ""}
                        disabled={!podeEditar}
                        onChange={(e) => { setR(undefined); setEstado((x) => ({ ...x, [chave(s.id, m)]: e.target.value })); }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-borda bg-superficie-2 font-medium">
                <th scope="row" className="sticky left-0 z-10 bg-superficie-2 px-4 py-2 text-left">Total</th>
                {MESES_LISTA.map((m) => {
                  const t = total(m);
                  const fat = faturamentoPorMes[m];
                  const dif = t > 0 && fat !== null && Math.abs(t - fat) > 0.5;
                  return (
                    <td key={m} className={`px-1.5 py-2 text-right text-xs tabular-nums ${dif ? "text-alerta" : ""}`} title={dif ? `Diferente do faturamento do mês (${reais(fat, true)})` : undefined}>
                      {t ? reais(t, true) : "—"}{dif && " ⚠"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 pt-3 text-sm text-suave">Cadastre os procedimentos em Pós-venda → Serviços para usar esta tabela.</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda px-5 py-3 mt-4">
        <p className="text-xs text-suave">⚠ = soma diferente do faturamento digitado no mês.</p>
        <div className="flex items-center gap-3">
          {r?.erro && <Aviso tipo="erro">{r.erro}</Aviso>}
          {r?.ok && !alteradas.length && <Aviso tipo="sucesso">{r.ok}</Aviso>}
          {podeEditar && servicos.length > 0 && (
            <button
              className="botao"
              disabled={pendente || !alteradas.length}
              onClick={() =>
                iniciar(async () => {
                  setR(await salvarFaturamentoProcedimento(ano, alteradas.map((k) => {
                    const [servico_id, mes] = k.split(":");
                    return { servico_id, mes: Number(mes), valor: estado[k] ?? "" };
                  })));
                })
              }
            >
              {pendente ? "Salvando…" : "Salvar faturamento por procedimento"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
