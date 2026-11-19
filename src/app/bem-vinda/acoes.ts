"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { COOKIE_WORKSPACE } from "@/lib/contexto";

export type Resultado = { erro?: string } | undefined;

async function abrir(id: string) {
  (await cookies()).set(COOKIE_WORKSPACE, id, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
  redirect("/inicio");
}

export async function criarEspaco(_: Resultado, form: FormData): Promise<Resultado> {
  const nome = String(form.get("nome") ?? "").trim();
  if (!nome) return { erro: "Dê um nome para o espaço (ex.: o nome do consultório)." };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("criar_workspace", { p_nome: nome });
  if (error) return { erro: "Não foi possível criar o espaço. Tente novamente." };
  await abrir(data as string);
}

export async function criarExemplo(): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("criar_espaco_exemplo");
  if (error) return { erro: "Não foi possível criar o espaço de exemplo." };
  await abrir(data as string);
}
