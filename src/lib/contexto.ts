import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "./supabase/server";
import type { Papel, Perfil, Workspace } from "./tipos";
import { hojeBrasil } from "./formatos";

export const COOKIE_WORKSPACE = "ws";
export const COOKIE_ANO = "ano";

export type Contexto = {
  usuario: { id: string; email: string };
  perfil: Perfil;
  workspaces: (Workspace & { papel: Papel })[];
  workspace: Workspace;
  papel: Papel;
  /** Pode editar métricas, metas e demais dados operacionais */
  podeEditarOperacional: boolean;
  /** Pode editar configurações, membros e entregáveis */
  podeAdministrar: boolean;
  ano: number;
  logoUrl: string | null;
  nomes: Record<string, string>;
};

/**
 * Carrega quem está logada, os workspaces dela e o workspace escolhido.
 * Se não houver workspace, manda para a tela de boas-vindas.
 */
export const carregarContexto = cache(async (): Promise<Contexto> => {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: perfil }, { data: membros }] = await Promise.all([
    supabase.from("profiles").select("id, nome, email").eq("id", user.id).single(),
    supabase
      .from("workspace_membros")
      .select("papel, workspaces (id, nome, status, cor_destaque, logo_path, ano_ativo)")
      .eq("user_id", user.id),
  ]);

  const workspaces = (membros ?? [])
    .filter((m) => m.workspaces)
    .map((m) => ({ ...(m.workspaces as unknown as Workspace), papel: m.papel as Papel }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  if (workspaces.length === 0) redirect("/bem-vinda");

  const jar = await cookies();
  const escolhido = workspaces.find((w) => w.id === jar.get(COOKIE_WORKSPACE)?.value) ?? workspaces[0];
  const { papel, ...workspace } = escolhido;

  const anoCookie = Number(jar.get(COOKIE_ANO)?.value);
  const ano = anoCookie >= 2000 && anoCookie <= 2100 ? anoCookie : workspace.ano_ativo || hojeBrasil().ano;

  const emAcomp = workspace.status === "em_acompanhamento";

  const [{ data: perfis }, logo] = await Promise.all([
    supabase.from("profiles").select("id, nome"),
    workspace.logo_path
      ? supabase.storage.from("logos").createSignedUrl(workspace.logo_path, 60 * 60)
      : Promise.resolve(null),
  ]);

  const nomes: Record<string, string> = {};
  // RLS só devolve perfis de quem divide algum workspace comigo
  for (const p of perfis ?? []) nomes[p.id] = p.nome;

  return {
    usuario: { id: user.id, email: user.email ?? "" },
    perfil: (perfil as Perfil) ?? { id: user.id, nome: user.email ?? "", email: user.email ?? "" },
    workspaces,
    workspace,
    papel,
    podeEditarOperacional: papel === "cliente" || emAcomp,
    podeAdministrar: (papel === "consultora" && emAcomp) || (papel === "cliente" && !emAcomp),
    ano,
    logoUrl: logo?.data?.signedUrl ?? null,
    nomes,
  };
});
