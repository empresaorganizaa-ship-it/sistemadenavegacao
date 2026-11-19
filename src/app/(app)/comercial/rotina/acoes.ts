"use server";

import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function marcarTarefa(tarefaId: string, periodo: string, feito: boolean) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodo)) return { erro: "Data inválida." };
  const supabase = await criarClienteServidor();
  const { error } = feito
    ? await supabase
        .from("rotina_registros")
        .upsert({ workspace_id: ctx.workspace.id, tarefa_id: tarefaId, periodo, feito: true }, { onConflict: "tarefa_id,periodo" })
    : await supabase.from("rotina_registros").delete().eq("tarefa_id", tarefaId).eq("periodo", periodo).eq("workspace_id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/comercial/rotina");
  revalidatePath("/inicio");
}
