"use client";

import { useMemo, useState, useTransition } from "react";
import { distribuirMeses, salvarMeses, type Resultado } from "./acoes";
import { Aviso } from "@/components/ui";
import { MESES, lerNumero, paraCampo, porcentagem, reais } from "@/lib/formatos";

type Props = {
  cicloId: string;
  metaCiclo: number;
  meses: { mes: string; valor: number }[];
  realizado: Record<string, number | null>;
  podeEditar: boolean;
};

function nomeMes(iso: string) {
  const [a, m] = iso.split("-").map(Number);
  return `${MESES[m - 1]}/${a}`;
}

export function TabelaMeses({ cicloId, metaCiclo, meses, realizado, podeEditar }: Props) {
  const inicial = useMemo(() => Object.fromEntries(meses.map((m) => [m.mes, paraCampo(m.valor, 2)])), [meses]);
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [chaveInicial, setChaveInicial] = useState(inicial);
  const [resultado, setResultado] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();

  // quando o servidor devolve dados novos (ex.: após distribuir), recarrega os campos
  if (chaveInicial !== inicial) {
    setChaveInicial(inicial);
    setValores(inicial);
  }

  const soma = meses.reduce((s, m) => s + (lerNumero(valores[m.mes]) ?? 0), 0);
  const diferenca = Math.round((soma - metaCiclo) * 100) / 100;
  const alterado = meses.some((m) => valores[m.mes] !== inicial[m.mes]);

  return (
    <div className="cartao">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl">Meta por mês</h2>
        {podeEditar && (
          <button
            className="botao-secundario"
            disabled={pendente}
            onClick={() => {
              if (!alterado || confirm("Isso substitui os valores digitados pela divisão igual. Continuar?"))
                iniciar(async () => setResultado(await distribuirMeses(cicloId)));
            }}
          >
            Distribuir igualmente
          </button>
        )}
      </div>

      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-y border-borda bg-superficie-2 text-left text-xs tracking-wide text-suave uppercase">
              <th className="px-5 py-2 font-medium">Mês</th>
              <th className="px-2 py-2 font-medium">Meta (R$)</th>
              <th className="px-2 py-2 text-right font-medium">Realizado</th>
              <th className="px-5 py-2 text-right font-medium">% atingido</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => {
              const meta = lerNumero(valores[m.mes]);
              const real = realizado[m.mes] ?? null;
              const pct = real !== null && meta ? real / meta : null;
              return (
                <tr key={m.mes} className="border-b border-borda last:border-0">
                  <td className="px-5 py-2 whitespace-nowrap">{nomeMes(m.mes)}</td>
                  <td className="px-2 py-1.5">
                    <input
                      aria-label={`Meta de ${nomeMes(m.mes)}`}
                      inputMode="decimal"
                      className="campo py-1.5 tabular-nums"
                      value={valores[m.mes] ?? ""}
                      disabled={!podeEditar}
                      onChange={(e) => setValores((v) => ({ ...v, [m.mes]: e.target.value }))}
                    />
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{reais(real, true)}</td>
                  <td className={`px-5 py-2 text-right tabular-nums ${pct !== null && pct >= 1 ? "font-medium text-sucesso" : ""}`}>
                    {porcentagem(pct, 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-borda bg-superficie-2 font-medium">
              <td className="px-5 py-2">Soma dos meses</td>
              <td className="px-2 py-2 tabular-nums">{reais(soma)}</td>
              <td colSpan={2} className="px-5 py-2 text-right text-xs font-normal text-suave">
                Meta do ciclo: {reais(metaCiclo)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {diferenca !== 0 && (
          <Aviso tipo="alerta">
            A soma dos meses está {diferenca > 0 ? "acima" : "abaixo"} da meta do ciclo em{" "}
            <strong>{reais(Math.abs(diferenca))}</strong>.
          </Aviso>
        )}
        {resultado?.erro && <Aviso tipo="erro">{resultado.erro}</Aviso>}
        {resultado?.ok && !alterado && <Aviso tipo="sucesso">{resultado.ok}</Aviso>}
        {podeEditar && (
          <button
            className="botao self-end"
            disabled={pendente || !alterado}
            onClick={() =>
              iniciar(async () =>
                setResultado(await salvarMeses(cicloId, meses.map((m) => ({ mes: m.mes, valor: valores[m.mes] ?? "" })))),
              )
            }
          >
            {pendente ? "Salvando…" : "Salvar metas dos meses"}
          </button>
        )}
      </div>
    </div>
  );
}
