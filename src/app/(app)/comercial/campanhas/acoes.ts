"use server";

import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";

// Datas sazonais sugeridas (editáveis depois)
function sugestoes(ano: number) {
  return [
    { nome: "Dia da Mulher", data_inicio: `${ano}-03-01`, data_fim: `${ano}-03-08` },
    { nome: "Dia das Mães", data_inicio: `${ano}-04-20`, data_fim: `${ano}-05-10` },
    { nome: "Dia dos Namorados", data_inicio: `${ano}-06-01`, data_fim: `${ano}-06-12` },
    { nome: "Aniversário do consultório", data_inicio: `${ano}-08-01`, data_fim: `${ano}-08-31` },
    { nome: "Black Friday", data_inicio: `${ano}-11-20`, data_fim: `${ano}-11-30` },
    { nome: "Fim de ano / verão", data_inicio: `${ano}-12-01`, data_fim: `${ano}-12-20` },
  ];
}

export async function adicionarSazonais(ano: number) {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Sem permissão." };
  const supabase = await criarClienteServidor();
  const { data: existentes } = await supabase
    .from("campanhas")
    .select("nome")
    .eq("workspace_id", ctx.workspace.id)
    .gte("data_inicio", `${ano}-01-01`)
    .lte("data_inicio", `${ano}-12-31`);
  const tem = new Set((existentes ?? []).map((c) => c.nome.toLowerCase()));
  const novas = sugestoes(ano).filter((s) => !tem.has(s.nome.toLowerCase()));
  if (novas.length) {
    const { error } = await supabase
      .from("campanhas")
      .insert(novas.map((n) => ({ ...n, workspace_id: ctx.workspace.id, status: "planejada" })));
    if (error) return { erro: "Não foi possível adicionar." };
  }
  revalidatePath("/comercial/campanhas");
  return { ok: novas.length ? `${novas.length} datas adicionadas.` : "As datas sazonais já estavam no planejamento." };
}
