"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeBrasil } from "@/lib/formatos";

/** Cria um item no cronograma de conteúdo a partir de uma referência. */
export async function transformarEmPauta(referenciaId: string) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão." };
  const supabase = await criarClienteServidor();
  const { data: ref } = await supabase
    .from("referencias")
    .select("id, titulo, formato, pilar_id, observacao")
    .eq("id", referenciaId)
    .eq("workspace_id", ctx.workspace.id)
    .single();
  if (!ref) return { erro: "Referência não encontrada." };
  const { data, error } = await supabase
    .from("conteudos")
    .insert({
      workspace_id: ctx.workspace.id,
      data: hojeBrasil().iso,
      tema: ref.titulo,
      formato: ref.formato,
      pilar_id: ref.pilar_id,
      referencia_id: ref.id,
      roteiro: ref.observacao,
      status: "ideia",
    })
    .select("id")
    .single();
  if (error || !data) return { erro: "Não foi possível criar a pauta." };
  await supabase.from("referencias").update({ status: "usada" }).eq("id", ref.id);
  revalidatePath("/marketing/referencias");
  revalidatePath("/marketing/cronograma");
  redirect(`/item/conteudos/${data.id}`);
}
