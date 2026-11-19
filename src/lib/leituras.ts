import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type Reg = { id: string; created_by: string | null; updated_at: string };

/** Itens que a pessoa ainda não abriu (ou que mudaram depois que ela abriu). */
export async function naoLidos(supabase: SupabaseClient, euId: string, entidade: string, regs: Reg[]): Promise<Set<string>> {
  const alheios = regs.filter((r) => r.created_by !== euId);
  if (!alheios.length) return new Set();
  const { data } = await supabase
    .from("leituras")
    .select("registro_id, lido_em")
    .eq("entidade", entidade)
    .in("registro_id", alheios.map((r) => r.id));
  const lido = new Map((data ?? []).map((l) => [l.registro_id, l.lido_em as string]));
  return new Set(alheios.filter((r) => !lido.has(r.id) || lido.get(r.id)! < r.updated_at).map((r) => r.id));
}

export async function marcarLido(supabase: SupabaseClient, ws: string, entidade: string, id: string) {
  await supabase
    .from("leituras")
    .upsert({ workspace_id: ws, entidade, registro_id: id, lido_em: new Date().toISOString() }, { onConflict: "user_id,entidade,registro_id" });
}
