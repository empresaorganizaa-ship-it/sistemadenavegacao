// Métricas calculadas automaticamente a partir dos números digitados.

export type MetricaMes = {
  ano: number;
  mes: number;
  faturamento: number | null;
  investimento_anuncios: number | null;
  leads_novos: number | null;
  avaliacoes_agendadas: number | null;
  avaliacoes_realizadas: number | null;
  vendas_fechadas: number | null;
  pacientes_retorno: number | null;
  indicacoes_recebidas: number | null;
};

/** Divisão segura: devolve null quando não dá para calcular. */
export function dividir(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a === null || a === undefined || b === null || b === undefined || b === 0) return null;
  return a / b;
}

export function calcular(m: Partial<MetricaMes> | null | undefined, metaDoMes?: number | null) {
  return {
    ticketMedio: dividir(m?.faturamento, m?.vendas_fechadas),
    taxaAgendamento: dividir(m?.avaliacoes_agendadas, m?.leads_novos),
    taxaComparecimento: dividir(m?.avaliacoes_realizadas, m?.avaliacoes_agendadas),
    taxaConversao: dividir(m?.vendas_fechadas, m?.avaliacoes_realizadas),
    custoPorLead: dividir(m?.investimento_anuncios, m?.leads_novos),
    percentualMeta: dividir(m?.faturamento, metaDoMes),
  };
}

/** Divide um valor em n partes iguais em centavos; a sobra vai para os primeiros meses. */
export function distribuirIgualmente(total: number, partes: number): number[] {
  if (partes <= 0) return [];
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / partes);
  const sobra = centavos - base * partes;
  return Array.from({ length: partes }, (_, i) => (base + (i < sobra ? 1 : 0)) / 100);
}

export function somar(valores: (number | null | undefined)[]): number {
  return valores.reduce<number>((s, v) => s + (v ?? 0), 0);
}
