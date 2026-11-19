import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Meta de cada mês (1-12) de um ano, a partir do ciclo ativo.
 * Se o ciclo ativo não cobrir o ano, usa qualquer ciclo que cubra aquele mês.
 */
export async function metasDoAno(supabase: SupabaseClient, workspaceId: string, ano: number) {
  const { data } = await supabase
    .from("metas_mes")
    .select("mes, valor, metas_ciclo!inner (ativo)")
    .eq("workspace_id", workspaceId)
    .gte("mes", `${ano}-01-01`)
    .lte("mes", `${ano}-12-01`);

  const metas: Record<number, number> = {};
  const doAtivo: Record<number, boolean> = {};
  for (const r of data ?? []) {
    const mes = Number(String(r.mes).slice(5, 7));
    const ativo = (r.metas_ciclo as unknown as { ativo: boolean }).ativo;
    if (metas[mes] === undefined || (ativo && !doAtivo[mes])) {
      metas[mes] = Number(r.valor);
      doAtivo[mes] = ativo;
    }
  }
  return metas;
}
