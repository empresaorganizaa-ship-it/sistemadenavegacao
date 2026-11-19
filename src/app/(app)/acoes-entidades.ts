"use server";

import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ENTIDADES, type Campo, type Entidade } from "@/lib/entidades";
import { lerNumero } from "@/lib/formatos";

export type Resultado = { erro?: string; ok?: string; id?: string } | undefined;

const SEM_PERMISSAO = { erro: "Você não tem permissão para fazer isso." };

async function podeEditar(ent: Entidade) {
  const ctx = await carregarContexto();
  return { ctx, pode: ent.permissao === "administrar" ? ctx.podeAdministrar : ctx.podeEditarOperacional };
}

function atualizar() {
  revalidatePath("/", "layout");
}

/** Converte o que veio do formulário para o formato da coluna, validando. */
function converter(c: Campo, bruto: unknown): { valor?: unknown; erro?: string } {
  const vazio = bruto === undefined || bruto === null || (typeof bruto === "string" && bruto.trim() === "");
  if (c.obrigatorio && vazio && c.tipo !== "booleano") return { erro: `Preencha o campo "${c.rotulo}".` };

  switch (c.tipo) {
    case "booleano":
      return { valor: bruto === true || bruto === "true" || bruto === "on" };
    case "lista": {
      const arr = Array.isArray(bruto) ? bruto : String(bruto ?? "").split("\n");
      return { valor: arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 100) };
    }
    case "etapas": {
      if (!Array.isArray(bruto)) return { valor: [] };
      const etapas = bruto
        .map((e) => ({
          titulo: String(e?.titulo ?? "").trim().slice(0, 200),
          descricao: String(e?.descricao ?? "").trim().slice(0, 2000),
          responsavel: String(e?.responsavel ?? "").trim().slice(0, 200),
          acao: String(e?.acao ?? "").trim().slice(0, 2000),
        }))
        .filter((e) => e.titulo || e.descricao || e.acao);
      return { valor: etapas.slice(0, 50) };
    }
  }

  if (vazio) return { valor: c.textoVazio ? "" : null };
  const s = String(bruto).trim();

  switch (c.tipo) {
    case "numero": {
      const n = lerNumero(s);
      if (n === null || !Number.isInteger(n)) return { erro: `"${c.rotulo}" precisa ser um número inteiro.` };
      return { valor: n };
    }
    case "dinheiro": {
      const n = lerNumero(s);
      if (n === null || n < 0) return { erro: `"${c.rotulo}" precisa ser um valor em reais.` };
      return { valor: n };
    }
    case "data":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { erro: `Data inválida em "${c.rotulo}".` };
      return { valor: s };
    case "mes":
      if (!/^\d{4}-\d{2}(-01)?$/.test(s)) return { erro: `Mês inválido em "${c.rotulo}".` };
      return { valor: s.slice(0, 7) + "-01" };
    case "selecao":
      if (c.opcoes && !c.opcoes.some((o) => o.valor === s)) return { erro: `Opção inválida em "${c.rotulo}".` };
      return { valor: s };
    case "relacao":
      if (!/^[0-9a-f-]{36}$/i.test(s)) return { erro: `Seleção inválida em "${c.rotulo}".` };
      return { valor: s };
    case "url":
      if (!/^https?:\/\//i.test(s)) return { valor: `https://${s}` };
      return { valor: s.slice(0, 2000) };
    default:
      return { valor: s.slice(0, c.tipo === "markdown" || c.tipo === "textoLongo" ? 50000 : 500) };
  }
}

export async function salvarEntidade(
  chave: string,
  id: string | null,
  valores: Record<string, unknown>,
): Promise<Resultado> {
  const ent = ENTIDADES[chave];
  if (!ent) return { erro: "Tipo de registro desconhecido." };
  const { ctx, pode } = await podeEditar(ent);
  if (!pode) return SEM_PERMISSAO;

  const linha: Record<string, unknown> = {};
  for (const c of ent.campos) {
    if (!(c.chave in valores) && id) continue; // em edição, campos ausentes ficam como estão
    const r = converter(c, valores[c.chave] ?? (id ? undefined : c.padrao));
    if (r.erro) return { erro: r.erro };
    if (r.valor !== undefined) linha[c.chave] = r.valor;
  }
  if (chave === "campanhas" && linha.data_inicio && linha.data_fim && String(linha.data_fim) < String(linha.data_inicio))
    return { erro: "A data de fim precisa ser depois do início." };
  if (chave === "etapas_acompanhamento" && linha.data_inicio && linha.data_fim && String(linha.data_fim) < String(linha.data_inicio))
    return { erro: "A data de fim precisa ser depois do início." };

  const supabase = await criarClienteServidor();
  if (id) {
    const { error } = await supabase.from(ent.tabela).update(linha).eq("id", id).eq("workspace_id", ctx.workspace.id);
    if (error) return { erro: traduzir(error.message) };
    atualizar();
    return { ok: "Salvo.", id };
  }
  const { data, error } = await supabase
    .from(ent.tabela)
    .insert({ ...linha, workspace_id: ctx.workspace.id })
    .select("id")
    .single();
  if (error || !data) return { erro: traduzir(error?.message) };
  atualizar();
  return { ok: "Salvo.", id: data.id };
}

function traduzir(msg?: string): string {
  if (!msg) return "Não foi possível salvar. Tente novamente.";
  if (msg.includes("row-level security")) return "Você não tem permissão para fazer isso.";
  if (msg.includes("duplicate key")) return "Já existe um registro igual.";
  if (msg.includes("Coluna do CRM inválida")) return "Etapa do CRM inválida.";
  return "Não foi possível salvar. Confira os campos e tente novamente.";
}

export async function excluirEntidade(chave: string, id: string): Promise<Resultado> {
  const ent = ENTIDADES[chave];
  if (!ent) return { erro: "Tipo de registro desconhecido." };
  const { ctx, pode } = await podeEditar(ent);
  if (!pode) return SEM_PERMISSAO;
  const supabase = await criarClienteServidor();

  // apaga anexos do armazenamento e comentários ligados ao item
  const { data: anexos } = await supabase
    .from("anexos")
    .select("caminho")
    .eq("workspace_id", ctx.workspace.id)
    .eq("entidade", chave)
    .eq("registro_id", id);
  if (anexos?.length) await supabase.storage.from("anexos").remove(anexos.map((a) => a.caminho));
  await supabase.from("anexos").delete().eq("workspace_id", ctx.workspace.id).eq("entidade", chave).eq("registro_id", id);
  await supabase.from("comentarios").delete().eq("workspace_id", ctx.workspace.id).eq("entidade", chave).eq("registro_id", id);

  const { error } = await supabase.from(ent.tabela).delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível excluir." };
  atualizar();
  return { ok: "Excluído." };
}

/** Altera um único campo (ex.: mover lead de coluna, mudar status). */
export async function alterarCampo(chave: string, id: string, campo: string, valor: unknown): Promise<Resultado> {
  const ent = ENTIDADES[chave];
  const c = ent?.campos.find((x) => x.chave === campo);
  if (!ent || !c) return { erro: "Campo desconhecido." };
  return salvarEntidade(chave, id, { [campo]: valor });
}

// ---------------------------------------------------------------------
// Comentários
// ---------------------------------------------------------------------
export async function comentar(entidade: string, registroId: string, texto: string): Promise<Resultado> {
  const ctx = await carregarContexto();
  const t = texto.trim();
  if (!t) return { erro: "Escreva um comentário." };
  if (!ENTIDADES[entidade]) return { erro: "Item inválido." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("comentarios")
    .insert({ workspace_id: ctx.workspace.id, entidade, registro_id: registroId, texto: t.slice(0, 5000) });
  if (error) return { erro: "Não foi possível comentar." };
  revalidatePath("/", "layout");
  return { ok: "Comentário enviado." };
}

export async function excluirComentario(id: string): Promise<Resultado> {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("comentarios").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível apagar." };
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------
// Anexos (o navegador envia o arquivo; aqui só registramos)
// ---------------------------------------------------------------------
export async function registrarAnexo(
  entidade: string,
  registroId: string,
  arquivo: { nome: string; caminho: string; tipo: string; tamanho: number },
): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return SEM_PERMISSAO;
  if (!arquivo.caminho.startsWith(`${ctx.workspace.id}/`)) return { erro: "Arquivo inválido." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("anexos").insert({
    workspace_id: ctx.workspace.id,
    entidade,
    registro_id: registroId,
    nome: arquivo.nome.slice(0, 200),
    caminho: arquivo.caminho,
    tipo: arquivo.tipo,
    tamanho: arquivo.tamanho,
  });
  if (error) {
    await supabase.storage.from("anexos").remove([arquivo.caminho]);
    return { erro: "Não foi possível anexar." };
  }
  revalidatePath("/", "layout");
  return { ok: "Arquivo anexado." };
}

export async function excluirAnexo(id: string): Promise<Resultado> {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("anexos").select("caminho").eq("id", id).eq("workspace_id", ctx.workspace.id).single();
  if (!data) return { erro: "Anexo não encontrado." };
  const { error } = await supabase.from("anexos").delete().eq("id", id);
  if (error) return SEM_PERMISSAO;
  await supabase.storage.from("anexos").remove([data.caminho]);
  revalidatePath("/", "layout");
}
