import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Opcao } from "./entidades";

/** Carrega as listas usadas nos campos "relacao" dos formulários. */
export async function carregarOpcoes(
  supabase: SupabaseClient,
  ws: string,
  quais: ("crm_colunas" | "origens_lead" | "servicos" | "leads" | "pilares_conteudo" | "referencias" | "encontros")[],
): Promise<Record<string, Opcao[]>> {
  const consultas = {
    crm_colunas: () => supabase.from("crm_colunas").select("id, nome").eq("workspace_id", ws).order("ordem"),
    origens_lead: () => supabase.from("origens_lead").select("id, nome").eq("workspace_id", ws).eq("ativo", true).order("ordem"),
    servicos: () => supabase.from("servicos").select("id, nome").eq("workspace_id", ws).eq("ativo", true).order("ordem").order("nome"),
    leads: () => supabase.from("leads").select("id, nome").eq("workspace_id", ws).order("nome").limit(2000),
    pilares_conteudo: () => supabase.from("pilares_conteudo").select("id, nome").eq("workspace_id", ws).eq("ativo", true).order("ordem"),
    referencias: () => supabase.from("referencias").select("id, titulo").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(500),
    encontros: () => supabase.from("encontros").select("id, titulo").eq("workspace_id", ws).order("data", { ascending: false }).limit(500),
  };
  const res = await Promise.all(quais.map((q) => consultas[q]()));
  return Object.fromEntries(
    quais.map((q, i) => [
      q,
      ((res[i].data ?? []) as { id: string; nome?: string; titulo?: string }[]).map((r) => ({
        valor: r.id,
        rotulo: r.nome ?? r.titulo ?? "",
      })),
    ]),
  );
}

export function relacoesDe(campos: { tipo: string; relacao?: string }[]) {
  return Array.from(new Set(campos.filter((c) => c.tipo === "relacao").map((c) => c.relacao!))) as Parameters<typeof carregarOpcoes>[2];
}
