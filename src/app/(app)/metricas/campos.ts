import type { MetricaMes } from "@/lib/calculos";

export type CampoNumerico = Exclude<keyof MetricaMes, "ano" | "mes">;

export const CAMPOS: { chave: CampoNumerico; rotulo: string; dinheiro?: boolean }[] = [
  { chave: "faturamento", rotulo: "Faturamento", dinheiro: true },
  { chave: "investimento_anuncios", rotulo: "Investimento em anúncios", dinheiro: true },
  { chave: "leads_novos", rotulo: "Leads novos" },
  { chave: "avaliacoes_agendadas", rotulo: "Avaliações agendadas" },
  { chave: "avaliacoes_realizadas", rotulo: "Avaliações realizadas" },
  { chave: "vendas_fechadas", rotulo: "Vendas fechadas" },
  { chave: "pacientes_retorno", rotulo: "Retornos / recompras" },
  { chave: "indicacoes_recebidas", rotulo: "Indicações recebidas" },
];
