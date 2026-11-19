import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Modelo, Paciente } from "@/components/enviar-mensagem";

export async function carregarModelos(supabase: SupabaseClient, ws: string): Promise<Modelo[]> {
  const { data } = await supabase.from("mensagens_modelos").select("id, titulo, categoria, texto").eq("workspace_id", ws).order("ordem").order("titulo");
  return data ?? [];
}

export async function carregarConfig(supabase: SupabaseClient, ws: string) {
  const { data } = await supabase.from("posvenda_config").select("*").eq("workspace_id", ws).maybeSingle();
  return (data ?? {}) as Record<string, string | null>;
}

/** Pacientes do CRM com o nome do procedimento (do catálogo ou digitado). */
export type PacienteCompleto = Paciente & {
  aniversario: string | null;
  data_procedimento: string | null;
  fechado_em: string | null;
  intervalo: number | null;
};

export async function carregarPacientes(supabase: SupabaseClient, ws: string): Promise<PacienteCompleto[]> {
  const { data } = await supabase
    .from("leads")
    .select("id, nome, whatsapp, aniversario, data_procedimento, fechado_em, servico_id, procedimento_texto, servicos (nome, intervalo_retorno_dias)")
    .eq("workspace_id", ws)
    .order("nome")
    .limit(3000);
  return (data ?? []).map((l) => {
    const s = l.servicos as unknown as { nome: string; intervalo_retorno_dias: number | null } | null;
    return {
      id: l.id,
      nome: l.nome,
      whatsapp: l.whatsapp,
      aniversario: l.aniversario,
      data_procedimento: l.data_procedimento,
      fechado_em: l.fechado_em,
      procedimento: s?.nome ?? l.procedimento_texto ?? null,
      intervalo: s?.intervalo_retorno_dias ?? null,
    };
  });
}
