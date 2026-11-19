"use client";

import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { MESES, MESES_CURTOS, inteiro, porcentagem, reais } from "@/lib/formatos";

const EIXO = { stroke: "var(--texto-suave)", fontSize: 11, tickLine: false, axisLine: false } as const;
const GRADE = <CartesianGrid vertical={false} stroke="var(--borda)" strokeDasharray="0" />;

function Dica({
  active,
  payload,
  label,
  formatar,
}: {
  active?: boolean;
  payload?: { name: string; value: number | null; color?: string; dataKey: string }[];
  label?: number;
  formatar: (v: number | null) => string;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-borda bg-superficie px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{MESES[label - 1]}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="text-suave">{p.name}</span>
          <span className="font-medium tabular-nums">{formatar(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function abreviarReais(v: number) {
  if (Math.abs(v) >= 1000) return `${inteiro(Math.round(v / 1000))} mil`;
  return inteiro(v);
}

export type PontoMes = { mes: number; realizado: number | null; meta: number | null };

/** Faturamento realizado (barras) × meta (linha de referência), mesma escala em R$. */
export function GraficoFaturamento({ dados, altura = 260 }: { dados: PontoMes[]; altura?: number }) {
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-suave">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-destaque" /> Realizado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-suave" /> Meta
        </span>
        <span className="ml-auto">valores em R$</span>
      </div>
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={dados} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="25%">
          {GRADE}
          <XAxis dataKey="mes" tickFormatter={(m) => MESES_CURTOS[m - 1]} {...EIXO} />
          <YAxis tickFormatter={abreviarReais} width={52} {...EIXO} />
          <Tooltip
            cursor={{ fill: "var(--superficie-2)" }}
            content={(p) => <Dica {...(p as unknown as Record<string, never>)} formatar={(v) => reais(v, true)} />}
          />
          <Bar dataKey="realizado" name="Realizado" fill="var(--destaque)" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Line
            dataKey="meta"
            name="Meta"
            type="step"
            stroke="var(--texto-suave)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4, fill: "var(--texto-suave)", stroke: "var(--superficie)", strokeWidth: 2 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Uma série por gráfico (leads, conversão...). */
export function GraficoSimples({
  dados,
  tipo,
  nome,
  formato,
  altura = 200,
}: {
  dados: { mes: number; valor: number | null }[];
  tipo: "barras" | "linha";
  nome: string;
  formato: "inteiro" | "porcentagem";
  altura?: number;
}) {
  const fmt = (v: number | null) => (formato === "porcentagem" ? porcentagem(v, 1) : inteiro(v));
  const eixoY = (v: number) => (formato === "porcentagem" ? porcentagem(v, 0) : inteiro(v));
  const comum = { data: dados, margin: { top: 8, right: 8, left: 0, bottom: 0 } };
  const dica = <Tooltip cursor={tipo === "barras" ? { fill: "var(--superficie-2)" } : { stroke: "var(--borda)" }} content={(p) => <Dica {...(p as unknown as Record<string, never>)} formatar={fmt} />} />;

  return (
    <ResponsiveContainer width="100%" height={altura}>
      {tipo === "barras" ? (
        <BarChart {...comum} barCategoryGap="25%">
          {GRADE}
          <XAxis dataKey="mes" tickFormatter={(m) => MESES_CURTOS[m - 1]} {...EIXO} />
          <YAxis tickFormatter={eixoY} width={44} allowDecimals={false} {...EIXO} />
          {dica}
          <Bar dataKey="valor" name={nome} fill="var(--destaque)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      ) : (
        <LineChart {...comum}>
          {GRADE}
          <XAxis dataKey="mes" tickFormatter={(m) => MESES_CURTOS[m - 1]} {...EIXO} />
          <YAxis tickFormatter={eixoY} width={44} {...EIXO} />
          {dica}
          <Line
            dataKey="valor"
            name={nome}
            stroke="var(--destaque)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--destaque)", stroke: "var(--superficie)", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "var(--destaque)", stroke: "var(--superficie)", strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
