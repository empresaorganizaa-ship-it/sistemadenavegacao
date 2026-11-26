"use server";

import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeBrasil } from "@/lib/formatos";

function atualizar() {
  revalidatePath("/comercial/crm");
  revalidatePath("/item/leads", "layout");
  revalidatePath("/inicio");
}

export async function marcarFollowup(leadId: string, etapa: number, feito: boolean) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão." };
  if (!Number.isInteger(etapa) || etapa < 1 || etapa > 6) return { erro: "Follow-up inválido." };
  const supabase = await criarClienteServidor();
  const { error } = feito
    ? await supabase.from("lead_followups").upsert({ workspace_id: ctx.workspace.id, lead_id: leadId, etapa }, { onConflict: "lead_id,etapa", ignoreDuplicates: true })
    : await supabase.from("lead_followups").delete().eq("lead_id", leadId).eq("etapa", etapa).eq("workspace_id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível salvar." };
  atualizar();
}

/** Começa (ou recomeça) a cadência a partir de uma data; recomeçar apaga os follow-ups marcados. */
export async function iniciarCadencia(leadId: string, data: string | null, recomecar = false) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão." };
  const dia = data ?? hojeBrasil().iso;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return { erro: "Data inválida." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("leads").update({ followup_inicio: dia }).eq("id", leadId).eq("workspace_id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível iniciar a cadência." };
  if (recomecar) await supabase.from("lead_followups").delete().eq("lead_id", leadId).eq("workspace_id", ctx.workspace.id);
  atualizar();
}

export async function pararCadencia(leadId: string) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão." };
  const supabase = await criarClienteServidor();
  await supabase.from("lead_followups").delete().eq("lead_id", leadId).eq("workspace_id", ctx.workspace.id);
  const { error } = await supabase.from("leads").update({ followup_inicio: null }).eq("id", leadId).eq("workspace_id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível parar a cadência." };
  atualizar();
}
