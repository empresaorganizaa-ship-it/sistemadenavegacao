"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COOKIE_ANO, COOKIE_WORKSPACE } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";

const UM_ANO = 60 * 60 * 24 * 365;

export async function escolherAno(ano: number) {
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return;
  (await cookies()).set(COOKIE_ANO, String(ano), { maxAge: UM_ANO, path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function escolherWorkspace(id: string) {
  const jar = await cookies();
  jar.set(COOKIE_WORKSPACE, id, { maxAge: UM_ANO, path: "/", sameSite: "lax" });
  jar.delete(COOKIE_ANO);
  revalidatePath("/", "layout");
  redirect("/inicio");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
