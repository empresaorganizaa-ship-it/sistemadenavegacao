"use server";

import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { lerNumero } from "@/lib/formatos";
import { CAMPOS_MKT } from "./campos";

export async function salvarMetricasMarketing(ano: number, meses: { mes: number; valores: Record<string, string> }[]) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Você não tem permissão para editar." };
  const linhas = [];
  for (const { mes, valores } of meses) {
    if (mes < 1 || mes > 12) return { erro: "Mês inválido." };
    const l: Record<string, unknown> = { workspace_id: ctx.workspace.id, ano, mes };
    for (const c of CAMPOS_MKT) {
      const n = lerNumero(valores[c.chave]);
      if (n !== null && !Number.isInteger(n)) return { erro: `${c.rotulo}: use números inteiros.` };
      if (n !== null && n < 0 && c.chave !== "seguidores_ganhos") return { erro: `${c.rotulo} não pode ser negativo.` };
      l[c.chave] = n;
    }
    if ("comentario" in valores) l.comentario = valores.comentario?.trim() || null;
    linhas.push(l);
  }
  if (!linhas.length) return { ok: "Nada para salvar." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("metricas_marketing").upsert(linhas, { onConflict: "workspace_id,ano,mes" });
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/marketing/metricas");
  return { ok: "Métricas salvas." };
}
