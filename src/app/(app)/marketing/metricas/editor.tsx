"use client";

import { useMemo, useState, useTransition } from "react";
import { salvarMetricasMarketing } from "./acoes";
import { CAMPOS_MKT, type CampoMkt } from "./campos";
import { MESES, MESES_CURTOS, paraCampo, lerNumero, porcentagem } from "@/lib/formatos";
import { dividir } from "@/lib/calculos";
import { Aviso } from "@/components/ui";

type Linha = Partial<Record<CampoMkt, number | null>> & { comentario?: string | null };
type Valores = Record<number, Record<string, string>>;
const MESES_LISTA = Array.from({ length: 12 }, (_, i) => i + 1);

export function EditorMarketing({ ano, dados, mesInicial, podeEditar }: { ano: number; dados: Record<number, Linha>; mesInicial: number; podeEditar: boolean }) {
  const inicial = useMemo(() => {
    const v: Valores = {};
    for (const m of MESES_LISTA) {
      v[m] = { comentario: dados[m]?.comentario ?? "" };
      for (const c of CAMPOS_MKT) v[m][c.chave] = paraCampo(dados[m]?.[c.chave] ?? null);
    }
    return v;
  }, [dados]);
  const [valores, setValores] = useState(inicial);
  const [base, setBase] = useState(inicial);
  const [mes, setMes] = useState(mesInicial);
  const [r, setR] = useState<{ erro?: string; ok?: string }>();
  const [pendente, iniciar] = useTransition();
  if (base !== inicial) {
    setBase(inicial);
    setValores(inicial);
  }
  const alterados = MESES_LISTA.filter((m) => Object.keys(valores[m]).some((k) => valores[m][k] !== inicial[m][k]));
  const mudar = (m: number, k: string, t: string) => {
    setR(undefined);
    setValores((v) => ({ ...v, [m]: { ...v[m], [k]: t } }));
  };
  const taxaEng = (m: number) => dividir(lerNumero(valores[m].engajamento), lerNumero(valores[m].alcance));

  return (
    <>
      <div className="cartao hidden overflow-hidden p-0 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="bg-superficie-2 text-xs tracking-wide text-suave uppercase">
                <th className="sticky left-0 z-10 bg-superficie-2 px-4 py-2 text-left font-medium">{ano}</th>
                {MESES_LISTA.map((m) => <th key={m} className="px-1 py-2 text-center font-medium">{MESES_CURTOS[m - 1]}</th>)}
              </tr>
            </thead>
            <tbody>
              {CAMPOS_MKT.map((c) => (
                <tr key={c.chave} className="border-t border-borda">
                  <th scope="row" className="sticky left-0 z-10 bg-superficie px-4 py-1.5 text-left font-normal whitespace-nowrap">{c.rotulo}</th>
                  {MESES_LISTA.map((m) => (
                    <td key={m} className="px-0.5 py-1">
                      <input
                        aria-label={`${c.rotulo} em ${MESES[m - 1]}`}
                        inputMode="numeric"
                        className="campo min-w-[64px] px-1.5 py-1 text-right text-xs tabular-nums"
                        value={valores[m][c.chave]}
                        disabled={!podeEditar}
                        onChange={(e) => mudar(m, c.chave, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-borda">
                <th scope="row" className="sticky left-0 z-10 bg-superficie px-4 py-2 text-left font-normal text-suave">Taxa de engajamento</th>
                {MESES_LISTA.map((m) => <td key={m} className="px-1.5 py-2 text-right text-xs tabular-nums">{porcentagem(taxaEng(m))}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 lg:mt-6">
        <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {MESES_LISTA.map((m) => (
            <button key={m} onClick={() => setMes(m)} className={`shrink-0 rounded-full border px-3 py-1 text-sm ${m === mes ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda bg-superficie text-suave"}`}>
              {MESES_CURTOS[m - 1]}
            </button>
          ))}
        </div>
        <div className="cartao">
          <h2 className="mb-3 text-2xl">{MESES[mes - 1]} <span className="text-suave">{ano}</span></h2>
          <div className="grid grid-cols-2 gap-3 lg:hidden">
            {CAMPOS_MKT.map((c) => (
              <div key={c.chave}>
                <label className="rotulo normal-case" htmlFor={`mk-${c.chave}`}>{c.rotulo}</label>
                <input id={`mk-${c.chave}`} inputMode="numeric" className="campo tabular-nums" value={valores[mes][c.chave]} disabled={!podeEditar} onChange={(e) => mudar(mes, c.chave, e.target.value)} />
              </div>
            ))}
            <div className="col-span-2 text-sm text-suave">Taxa de engajamento: <strong className="text-texto">{porcentagem(taxaEng(mes))}</strong></div>
          </div>
          <label className="rotulo mt-4 lg:mt-0" htmlFor="mk-comentario">Comentário da consultora sobre o mês</label>
          <textarea id="mk-comentario" className="campo" rows={3} value={valores[mes].comentario} disabled={!podeEditar} onChange={(e) => mudar(mes, "comentario", e.target.value)} placeholder="O que funcionou, o que ajustar…" />
        </div>
      </div>

      {podeEditar && (
        <div className="sticky bottom-20 z-20 mt-4 flex flex-wrap items-center justify-end gap-3 lg:bottom-4">
          {r?.erro && <Aviso tipo="erro">{r.erro}</Aviso>}
          {r?.ok && !alterados.length && <Aviso tipo="sucesso">{r.ok}</Aviso>}
          <button
            className="botao shadow-md"
            disabled={pendente || !alterados.length}
            onClick={() => iniciar(async () => setR(await salvarMetricasMarketing(ano, alterados.map((m) => ({ mes: m, valores: valores[m] })))))}
          >
            {pendente ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      )}
    </>
  );
}
