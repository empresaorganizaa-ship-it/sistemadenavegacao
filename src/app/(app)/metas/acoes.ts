"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { lerNumero, mesesEntre } from "@/lib/formatos";
import { distribuirIgualmente } from "@/lib/calculos";

export type Resultado = { erro?: string; ok?: string } | undefined;

const SEM_PERMISSAO = { erro: "Você não tem permissão para editar as metas." };

function atualizar() {
  revalidatePath("/metas");
  revalidatePath("/inicio");
  revalidatePath("/metricas");
}

export async function salvarCiclo(_: Resultado, form: FormData): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return SEM_PERMISSAO;

  const id = String(form.get("id") ?? "") || null;
  const nome = String(form.get("nome") ?? "").trim();
  const inicio = String(form.get("data_inicio") ?? "");
  const fim = String(form.get("data_fim") ?? "");
  const valor = lerNumero(String(form.get("valor") ?? ""));

  if (!nome) return { erro: "Dê um nome ao ciclo (ex.: Ciclo 2026)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim))
    return { erro: "Preencha as datas de início e de fim." };
  if (fim < inicio) return { erro: "A data de fim precisa ser depois da data de início." };
  if (valor === null || valor < 0) return { erro: "Informe o valor da meta de faturamento." };

  const meses = mesesEntre(inicio, fim);
  if (meses.length > 36) return { erro: "O ciclo pode ter no máximo 36 meses." };

  const supabase = await criarClienteServidor();
  let cicloId = id;

  if (!id) {
    const { count } = await supabase
      .from("metas_ciclo")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspace.id);
    const { data, error } = await supabase
      .from("metas_ciclo")
      .insert({ workspace_id: ctx.workspace.id, nome, data_inicio: inicio, data_fim: fim, valor, ativo: !count })
      .select("id")
      .single();
    if (error || !data) return { erro: "Não foi possível criar o ciclo." };
    cicloId = data.id;
    const partes = distribuirIgualmente(valor, meses.length);
    const { error: e2 } = await supabase
      .from("metas_mes")
      .insert(meses.map((mes, i) => ({ ciclo_id: cicloId, workspace_id: ctx.workspace.id, mes, valor: partes[i] })));
    if (e2) return { erro: "O ciclo foi criado, mas houve um erro ao criar os meses." };
  } else {
    const { error } = await supabase
      .from("metas_ciclo")
      .update({ nome, data_inicio: inicio, data_fim: fim, valor })
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id);
    if (error) return { erro: "Não foi possível salvar o ciclo." };

    // Ajusta os meses ao novo período: remove os que saíram e cria os que entraram (com meta zero)
    const { data: existentes } = await supabase.from("metas_mes").select("mes").eq("ciclo_id", id);
    const tem = new Set((existentes ?? []).map((m) => m.mes));
    await supabase
      .from("metas_mes")
      .delete()
      .eq("ciclo_id", id)
      .or(`mes.lt.${meses[0]},mes.gt.${meses[meses.length - 1]}`);
    const novos = meses.filter((m) => !tem.has(m));
    if (novos.length)
      await supabase
        .from("metas_mes")
        .insert(novos.map((mes) => ({ ciclo_id: id, workspace_id: ctx.workspace.id, mes, valor: 0 })));
  }

  atualizar();
  if (!id) redirect(`/metas?ciclo=${cicloId}`);
  return { ok: "Ciclo salvo." };
}

export async function ativarCiclo(id: string): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return SEM_PERMISSAO;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("ativar_ciclo", { p_ciclo: id });
  if (error) return { erro: "Não foi possível ativar o ciclo." };
  atualizar();
}

export async function excluirCiclo(id: string): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return SEM_PERMISSAO;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("metas_ciclo").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível excluir o ciclo." };
  atualizar();
  redirect("/metas");
}

export async function salvarMeses(cicloId: string, valores: { mes: string; valor: string }[]): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return SEM_PERMISSAO;
  const linhas = [];
  for (const v of valores) {
    const n = lerNumero(v.valor) ?? 0;
    if (n < 0) return { erro: "As metas não podem ser negativas." };
    linhas.push({ ciclo_id: cicloId, workspace_id: ctx.workspace.id, mes: v.mes, valor: n });
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("metas_mes").upsert(linhas, { onConflict: "ciclo_id,mes" });
  if (error) return { erro: "Não foi possível salvar as metas dos meses." };
  atualizar();
  return { ok: "Metas dos meses salvas." };
}

export async function distribuirMeses(cicloId: string): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return SEM_PERMISSAO;
  const supabase = await criarClienteServidor();
  const { data: ciclo } = await supabase
    .from("metas_ciclo")
    .select("data_inicio, data_fim, valor")
    .eq("id", cicloId)
    .eq("workspace_id", ctx.workspace.id)
    .single();
  if (!ciclo) return { erro: "Ciclo não encontrado." };
  const meses = mesesEntre(ciclo.data_inicio, ciclo.data_fim);
  const partes = distribuirIgualmente(Number(ciclo.valor), meses.length);
  const { error } = await supabase
    .from("metas_mes")
    .upsert(
      meses.map((mes, i) => ({ ciclo_id: cicloId, workspace_id: ctx.workspace.id, mes, valor: partes[i] })),
      { onConflict: "ciclo_id,mes" },
    );
  if (error) return { erro: "Não foi possível distribuir a meta." };
  atualizar();
  return { ok: "Meta distribuída igualmente entre os meses." };
}
