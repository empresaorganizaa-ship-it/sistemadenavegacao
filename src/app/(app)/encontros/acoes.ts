"use server";

import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function marcarCombinado(id: string, feito: boolean) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("marcar_combinado", { p_id: id, p_feito: feito });
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/encontros", "layout");
  revalidatePath("/inicio");
}
