"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { carregarContexto, COOKIE_ANO, COOKIE_WORKSPACE } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Resultado = { erro?: string; ok?: string } | undefined;
const SEM_PERMISSAO = { erro: "Você não tem permissão para alterar isso." };

function atualizarTudo() {
  revalidatePath("/", "layout");
}

export async function salvarEspaco(_: Resultado, form: FormData): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeAdministrar) return SEM_PERMISSAO;
  const nome = String(form.get("nome") ?? "").trim();
  const cor = String(form.get("cor_destaque") ?? "").trim();
  const ano = Number(form.get("ano_ativo"));
  if (!nome) return { erro: "O nome não pode ficar vazio." };
  if (!/^#[0-9a-fA-F]{6}$/.test(cor)) return { erro: "Cor inválida." };
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return { erro: "Ano inválido." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("workspaces")
    .update({ nome, cor_destaque: cor, ano_ativo: ano })
    .eq("id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível salvar." };
  (await cookies()).delete(COOKIE_ANO);
  atualizarTudo();
  return { ok: "Alterações salvas." };
}

/** Chamado depois que o navegador enviou o arquivo para o Storage. */
export async function definirLogo(caminho: string | null): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeAdministrar) return SEM_PERMISSAO;
  if (caminho && !caminho.startsWith(`${ctx.workspace.id}/`)) return { erro: "Arquivo inválido." };
  const supabase = await criarClienteServidor();
  const antigo = ctx.workspace.logo_path;
  const { error } = await supabase.from("workspaces").update({ logo_path: caminho }).eq("id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível salvar o logo." };
  if (antigo && antigo !== caminho) await supabase.storage.from("logos").remove([antigo]);
  atualizarTudo();
  return { ok: caminho ? "Logo atualizado." : "Logo removido." };
}

export async function mudarStatus(status: "em_acompanhamento" | "acompanhamento_encerrado"): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeAdministrar) return SEM_PERMISSAO;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("workspaces").update({ status }).eq("id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível alterar o status." };
  atualizarTudo();
  return { ok: status === "acompanhamento_encerrado" ? "Acompanhamento encerrado." : "Acompanhamento reaberto." };
}

export async function convidar(_: Resultado, form: FormData): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeAdministrar) return SEM_PERMISSAO;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const papel = String(form.get("papel") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Digite um e-mail válido." };
  if (papel !== "consultora" && papel !== "cliente") return { erro: "Escolha o papel." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("convites").insert({ workspace_id: ctx.workspace.id, email, papel });
  if (error) {
    if (error.code === "23505") return { erro: "Este e-mail já foi convidado." };
    return { erro: "Não foi possível enviar o convite." };
  }
  revalidatePath("/configuracoes");
  return { ok: email };
}

export async function cancelarConvite(id: string): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeAdministrar) return SEM_PERMISSAO;
  const supabase = await criarClienteServidor();
  await supabase.from("convites").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  revalidatePath("/configuracoes");
}

export async function removerMembro(userId: string): Promise<Resultado> {
  const ctx = await carregarContexto();
  const propria = userId === ctx.usuario.id;
  if (!ctx.podeAdministrar && !propria) return SEM_PERMISSAO;
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("workspace_membros")
    .delete()
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", userId);
  if (error) return { erro: "Não foi possível remover." };
  if (propria) {
    (await cookies()).delete(COOKIE_WORKSPACE);
    redirect("/inicio");
  }
  revalidatePath("/configuracoes");
}

export async function salvarOrigem(_: Resultado, form: FormData): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeAdministrar) return SEM_PERMISSAO;
  const id = String(form.get("id") ?? "");
  const nome = String(form.get("nome") ?? "").trim();
  if (!nome) return { erro: "Digite o nome da origem." };
  const supabase = await criarClienteServidor();
  if (id) {
    const { error } = await supabase.from("origens_lead").update({ nome }).eq("id", id).eq("workspace_id", ctx.workspace.id);
    if (error) return { erro: error.code === "23505" ? "Já existe uma origem com esse nome." : "Não foi possível salvar." };
  } else {
    const { data: ult } = await supabase
      .from("origens_lead")
      .select("ordem")
      .eq("workspace_id", ctx.workspace.id)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase
      .from("origens_lead")
      .insert({ workspace_id: ctx.workspace.id, nome, ordem: (ult?.ordem ?? 0) + 1 });
    if (error) return { erro: error.code === "23505" ? "Já existe uma origem com esse nome." : "Não foi possível adicionar." };
  }
  revalidatePath("/configuracoes");
  revalidatePath("/metricas");
  return { ok: "Salvo." };
}

export async function alternarOrigem(id: string, ativo: boolean): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeAdministrar) return SEM_PERMISSAO;
  const supabase = await criarClienteServidor();
  await supabase.from("origens_lead").update({ ativo }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  revalidatePath("/configuracoes");
  revalidatePath("/metricas");
}

export async function salvarPerfil(_: Resultado, form: FormData): Promise<Resultado> {
  const ctx = await carregarContexto();
  const nome = String(form.get("nome") ?? "").trim();
  if (!nome) return { erro: "Digite seu nome." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("profiles").update({ nome }).eq("id", ctx.usuario.id);
  if (error) return { erro: "Não foi possível salvar." };
  atualizarTudo();
  return { ok: "Nome atualizado." };
}

export async function definirSenha(_: Resultado, form: FormData): Promise<Resultado> {
  const senha = String(form.get("senha") ?? "");
  const confirmar = String(form.get("confirmar") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== confirmar) return { erro: "As senhas não são iguais." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    if (error.message.toLowerCase().includes("different from the old"))
      return { erro: "A nova senha precisa ser diferente da atual." };
    return { erro: "Não foi possível definir a senha. Saia, entre de novo pelo link e tente outra vez." };
  }
  return { ok: "Senha definida. Agora você também pode entrar com e-mail e senha." };
}

export async function excluirEspaco(confirmacao: string): Promise<Resultado> {
  const ctx = await carregarContexto();
  if (!ctx.podeAdministrar) return SEM_PERMISSAO;
  if (confirmacao.trim() !== ctx.workspace.nome) return { erro: "O nome digitado não confere." };
  const supabase = await criarClienteServidor();
  if (ctx.workspace.logo_path) await supabase.storage.from("logos").remove([ctx.workspace.logo_path]);
  const { error } = await supabase.from("workspaces").delete().eq("id", ctx.workspace.id);
  if (error) return { erro: "Não foi possível excluir." };
  (await cookies()).delete(COOKIE_WORKSPACE);
  redirect("/inicio");
}
