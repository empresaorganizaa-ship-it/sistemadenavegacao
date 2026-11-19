"use server";

import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { lerNumero } from "@/lib/formatos";
import { CAMPOS } from "./campos";

export type Resultado = { erro?: string; ok?: string } | undefined;

function atualizar() {
  revalidatePath("/metricas");
  revalidatePath("/inicio");
  revalidatePath("/metas");
}

export async function salvarMetricas(
  ano: number,
  meses: { mes: number; valores: Record<string, string> }[],
): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Você não tem permissão para editar as métricas." };
  if (!meses.length) return { ok: "Nada para salvar." };

  const linhas = [];
  for (const { mes, valores } of meses) {
    if (mes < 1 || mes > 12) return { erro: "Mês inválido." };
    const linha: Record<string, number | string | null> = { workspace_id: ctx.workspace.id, ano, mes };
    for (const c of CAMPOS) {
      const n = lerNumero(valores[c.chave]);
      if (n !== null && n < 0) return { erro: `${c.rotulo} não pode ser negativo.` };
      if (n !== null && !c.dinheiro && !Number.isInteger(n)) return { erro: `${c.rotulo} precisa ser um número inteiro.` };
      linha[c.chave] = n;
    }
    linhas.push(linha);
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("metricas_mensais").upsert(linhas, { onConflict: "workspace_id,ano,mes" });
  if (error) return { erro: "Não foi possível salvar. Tente novamente." };
  atualizar();
  return { ok: "Métricas salvas." };
}

export async function salvarLeadsOrigem(
  ano: number,
  itens: { origem_id: string; mes: number; quantidade: string }[],
): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Você não tem permissão para editar as métricas." };
  if (!itens.length) return { ok: "Nada para salvar." };

  const linhas = [];
  for (const i of itens) {
    const n = lerNumero(i.quantidade) ?? 0;
    if (n < 0 || !Number.isInteger(n)) return { erro: "Use apenas números inteiros." };
    linhas.push({ workspace_id: ctx.workspace.id, origem_id: i.origem_id, ano, mes: i.mes, quantidade: n });
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("metricas_leads_origem").upsert(linhas, { onConflict: "origem_id,ano,mes" });
  if (error) return { erro: "Não foi possível salvar os leads por origem." };
  atualizar();
  return { ok: "Leads por origem salvos." };
}

export async function salvarFaturamentoProcedimento(
  ano: number,
  itens: { servico_id: string; mes: number; valor: string }[],
): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Você não tem permissão para editar as métricas." };
  const linhas = [];
  for (const i of itens) {
    const n = lerNumero(i.valor) ?? 0;
    if (n < 0) return { erro: "Use valores positivos." };
    if (i.mes < 1 || i.mes > 12) return { erro: "Mês inválido." };
    linhas.push({ workspace_id: ctx.workspace.id, servico_id: i.servico_id, ano, mes: i.mes, valor: n });
  }
  if (!linhas.length) return { ok: "Nada para salvar." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("metricas_procedimento").upsert(linhas, { onConflict: "servico_id,ano,mes" });
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/metricas");
  return { ok: "Faturamento por procedimento salvo." };
}
