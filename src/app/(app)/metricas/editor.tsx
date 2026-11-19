"use client";

import { useMemo, useState, useTransition } from "react";
import { salvarMetricas, type Resultado } from "./acoes";
import { CAMPOS, type CampoNumerico } from "./campos";
import { calcular, type MetricaMes } from "@/lib/calculos";
import { MESES, MESES_CURTOS, lerNumero, paraCampo, porcentagem, reais } from "@/lib/formatos";
import { Autoria, Aviso } from "@/components/ui";
import type { Auditoria } from "@/lib/tipos";

type Props = {
  ano: number;
  mesInicial: number;
  dados: Record<number, MetricaMes & Auditoria>;
  metas: Record<number, number>;
  nomes: Record<string, string>;
  podeEditar: boolean;
};

type Valores = Record<number, Record<CampoNumerico, string>>;

const CALCULADOS: { rotulo: string; valor: (c: ReturnType<typeof calcular>) => string }[] = [
  { rotulo: "Ticket médio", valor: (c) => reais(c.ticketMedio, true) },
  { rotulo: "Taxa de agendamento", valor: (c) => porcentagem(c.taxaAgendamento) },
  { rotulo: "Taxa de comparecimento", valor: (c) => porcentagem(c.taxaComparecimento) },
  { rotulo: "Taxa de conversão", valor: (c) => porcentagem(c.taxaConversao) },
  { rotulo: "Custo por lead", valor: (c) => reais(c.custoPorLead) },
  { rotulo: "% da meta do mês", valor: (c) => porcentagem(c.percentualMeta, 0) },
];

const MESES_LISTA = Array.from({ length: 12 }, (_, i) => i + 1);

function paraValores(dados: Props["dados"]): Valores {
  const v: Valores = {} as Valores;
  for (const mes of MESES_LISTA) {
    v[mes] = {} as Record<CampoNumerico, string>;
    for (const c of CAMPOS) v[mes][c.chave] = paraCampo(dados[mes]?.[c.chave] ?? null, c.dinheiro ? 2 : 0);
  }
  return v;
}

function lerValores(v: Record<CampoNumerico, string>): Partial<MetricaMes> {
  const r: Partial<MetricaMes> = {};
  for (const c of CAMPOS) {
    r[c.chave] = lerNumero(v[c.chave]);
  }
  return r;
}

export function EditorMetricas({ ano, mesInicial, dados, metas, nomes, podeEditar }: Props) {
  const inicial = useMemo(() => paraValores(dados), [dados]);
  const [valores, setValores] = useState<Valores>(inicial);
  const [base, setBase] = useState(inicial);
  const [mesAberto, setMesAberto] = useState(mesInicial);
  const [resultado, setResultado] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();

  if (base !== inicial) {
    setBase(inicial);
    setValores(inicial);
  }

  const alterados = MESES_LISTA.filter((m) => CAMPOS.some((c) => valores[m][c.chave] !== inicial[m][c.chave]));

  function mudar(mes: number, campo: CampoNumerico, texto: string) {
    setResultado(undefined);
    setValores((v) => ({ ...v, [mes]: { ...v[mes], [campo]: texto } }));
  }

  function salvar() {
    iniciar(async () => {
      setResultado(await salvarMetricas(ano, alterados.map((mes) => ({ mes, valores: valores[mes] }))));
    });
  }

  const calc = (mes: number) => calcular(lerValores(valores[mes]), metas[mes]);

  const barraSalvar = podeEditar && (
    <div className="sticky bottom-20 z-20 mt-4 flex flex-wrap items-center justify-end gap-3 lg:bottom-4">
      {resultado?.erro && <Aviso tipo="erro">{resultado.erro}</Aviso>}
      {resultado?.ok && alterados.length === 0 && <Aviso tipo="sucesso">{resultado.ok}</Aviso>}
      {alterados.length > 0 && (
        <span className="rounded-full bg-superficie px-3 py-1 text-xs text-suave shadow-sm">
          {alterados.length === 1 ? "1 mês alterado" : `${alterados.length} meses alterados`}
        </span>
      )}
      <button className="botao shadow-md" disabled={pendente || alterados.length === 0} onClick={salvar}>
        {pendente ? "Salvando…" : "Salvar alterações"}
      </button>
    </div>
  );

  return (
    <>
      {/* Computador: tabela com uma coluna por mês */}
      <div className="cartao hidden overflow-hidden p-0 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="bg-superficie-2 text-xs tracking-wide text-suave uppercase">
                <th className="sticky left-0 z-10 bg-superficie-2 px-4 py-2 text-left font-medium">{ano}</th>
                {MESES_LISTA.map((m) => (
                  <th key={m} className="px-1 py-2 text-center font-medium" title={MESES[m - 1]}>
                    {MESES_CURTOS[m - 1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAMPOS.map((c) => (
                <tr key={c.chave} className="border-t border-borda">
                  <th scope="row" className="sticky left-0 z-10 bg-superficie px-4 py-1.5 text-left font-normal whitespace-nowrap">
                    {c.rotulo}
                    {c.dinheiro && <span className="text-suave"> (R$)</span>}
                  </th>
                  {MESES_LISTA.map((m) => (
                    <td key={m} className="px-0.5 py-1">
                      <input
                        aria-label={`${c.rotulo} em ${MESES[m - 1]}`}
                        inputMode={c.dinheiro ? "decimal" : "numeric"}
                        className={`campo px-1.5 py-1 text-right text-xs tabular-nums ${c.dinheiro ? "min-w-[84px]" : "min-w-[60px]"}`}
                        value={valores[m][c.chave]}
                        disabled={!podeEditar}
                        onChange={(e) => mudar(m, c.chave, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td colSpan={13} className="bg-superficie-2 px-4 py-1.5 text-xs font-medium tracking-wide text-suave uppercase">
                  Calculados automaticamente
                </td>
              </tr>
              {CALCULADOS.map((k) => (
                <tr key={k.rotulo} className="border-t border-borda">
                  <th scope="row" className="sticky left-0 z-10 bg-superficie px-4 py-2 text-left font-normal whitespace-nowrap text-suave">
                    {k.rotulo}
                  </th>
                  {MESES_LISTA.map((m) => (
                    <td key={m} className="px-1.5 py-2 text-right text-xs tabular-nums">
                      {k.valor(calc(m))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-borda px-4 py-2 text-[11px] text-suave">
          Passe o mouse sobre um mês para ver o nome completo. Valores com vírgula: 1.234,56.
        </div>
      </div>

      {/* Celular: um cartão por mês */}
      <div className="lg:hidden">
        <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {MESES_LISTA.map((m) => (
            <button
              key={m}
              onClick={() => setMesAberto(m)}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
                m === mesAberto ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda bg-superficie text-suave"
              } ${alterados.includes(m) && m !== mesAberto ? "border-destaque text-destaque-escuro" : ""}`}
            >
              {MESES_CURTOS[m - 1]}
            </button>
          ))}
        </div>
        <div className="cartao">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-2xl">
              {MESES[mesAberto - 1]} <span className="text-suave">{ano}</span>
            </h2>
            {metas[mesAberto] !== undefined && <span className="text-xs text-suave">Meta: {reais(metas[mesAberto], true)}</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {CAMPOS.map((c) => (
              <div key={c.chave}>
                <label className="rotulo normal-case" htmlFor={`m-${c.chave}`}>
                  {c.rotulo}
                  {c.dinheiro && " (R$)"}
                </label>
                <input
                  id={`m-${c.chave}`}
                  inputMode={c.dinheiro ? "decimal" : "numeric"}
                  className="campo tabular-nums"
                  value={valores[mesAberto][c.chave]}
                  disabled={!podeEditar}
                  onChange={(e) => mudar(mesAberto, c.chave, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-superficie-2 p-3">
            <p className="rotulo">Calculados automaticamente</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {CALCULADOS.map((k) => (
                <div key={k.rotulo}>
                  <dt className="text-xs text-suave">{k.rotulo}</dt>
                  <dd className="font-medium tabular-nums">{k.valor(calc(mesAberto))}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Autoria registro={dados[mesAberto]} nomes={nomes} className="mt-3" />
        </div>
      </div>

      {/* Autoria por mês (computador) */}
      <details className="mt-2 hidden text-xs text-suave lg:block">
        <summary className="cursor-pointer">Quem preencheu cada mês</summary>
        <ul className="mt-2 grid grid-cols-3 gap-x-6 gap-y-1">
          {MESES_LISTA.filter((m) => dados[m]).map((m) => (
            <li key={m} className="flex gap-1">
              <span className="font-medium text-texto">{MESES_CURTOS[m - 1]}:</span>
              <Autoria registro={dados[m]} nomes={nomes} />
            </li>
          ))}
        </ul>
      </details>

      {barraSalvar}
    </>
  );
}
