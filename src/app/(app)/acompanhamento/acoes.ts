"use server";

import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function moverEtapa(id: string, status: "proxima" | "andamento" | "concluida") {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão para mover." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("mover_etapa", { p_id: id, p_status: status });
  if (error) return { erro: "Não foi possível mover a ação." };
  revalidatePath("/acompanhamento");
  revalidatePath("/inicio");
}
