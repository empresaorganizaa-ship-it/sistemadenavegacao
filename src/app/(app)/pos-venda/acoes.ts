"use server";

import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeBrasil } from "@/lib/formatos";

const CAMPOS_CONFIG = ["aniv_beneficio", "aniv_validade", "aniv_regras", "ind_beneficio_indicadora", "ind_beneficio_indicada", "ind_validade"];

export async function salvarConfigPosvenda(_: unknown, form: FormData) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão." };
  const linha: Record<string, unknown> = { workspace_id: ctx.workspace.id };
  for (const c of CAMPOS_CONFIG) if (form.has(c)) linha[c] = String(form.get(c) ?? "").trim().slice(0, 2000) || null;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("posvenda_config").upsert(linha, { onConflict: "workspace_id" });
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/pos-venda", "layout");
  return { ok: "Salvo." };
}

export async function marcarAniversario(leadId: string, ano: number, enviado: boolean) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão." };
  const supabase = await criarClienteServidor();
  const { error } = enviado
    ? await supabase.from("aniversario_envios").upsert({ workspace_id: ctx.workspace.id, lead_id: leadId, ano }, { onConflict: "lead_id,ano" })
    : await supabase.from("aniversario_envios").delete().eq("lead_id", leadId).eq("ano", ano).eq("workspace_id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/pos-venda/aniversariantes");
  revalidatePath("/inicio");
}

/** Registra uma indicação: cria a indicada no CRM (se for nova) e a indicação. */
export async function registrarIndicacao(_: unknown, form: FormData) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão." };
  const indicadora = String(form.get("indicadora_id") ?? "");
  const existente = String(form.get("indicada_id") ?? "");
  const nome = String(form.get("nome") ?? "").trim();
  const whatsapp = String(form.get("whatsapp") ?? "").trim();
  if (!indicadora) return { erro: "Escolha quem indicou." };
  if (!existente && !nome) return { erro: "Informe o nome da indicada (ou escolha uma paciente já cadastrada)." };

  const supabase = await criarClienteServidor();
  let indicadaId = existente || null;
  if (!indicadaId) {
    const [{ data: coluna }, { data: origem }] = await Promise.all([
      supabase.from("crm_colunas").select("id").eq("workspace_id", ctx.workspace.id).order("ordem").limit(1).maybeSingle(),
      supabase.from("origens_lead").select("id").eq("workspace_id", ctx.workspace.id).ilike("nome", "indica%").limit(1).maybeSingle(),
    ]);
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        workspace_id: ctx.workspace.id,
        nome,
        whatsapp: whatsapp || null,
        coluna_id: coluna?.id ?? null,
        origem_id: origem?.id ?? null,
        indicada_por: indicadora,
        proxima_acao: "Primeiro contato (indicação)",
        proxima_acao_data: hojeBrasil().iso,
      })
      .select("id")
      .single();
    if (error || !lead) return { erro: "Não foi possível criar a indicada no CRM." };
    indicadaId = lead.id;
  } else {
    await supabase.from("leads").update({ indicada_por: indicadora }).eq("id", indicadaId).eq("workspace_id", ctx.workspace.id).is("indicada_por", null);
  }
  const { error } = await supabase
    .from("indicacoes")
    .insert({ workspace_id: ctx.workspace.id, indicadora_id: indicadora, indicada_id: indicadaId, data: hojeBrasil().iso, status: "indicada" });
  if (error) return { erro: "Não foi possível registrar a indicação." };
  revalidatePath("/pos-venda/indicacao");
  revalidatePath("/comercial/crm");
  return { ok: existente ? "Indicação registrada." : "Indicação registrada e indicada adicionada ao CRM." };
}
