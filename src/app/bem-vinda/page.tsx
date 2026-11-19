import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { sair } from "@/app/(app)/acoes-gerais";
import { CriarEspaco } from "./criar-espaco";

export const metadata = { title: "Bem-vinda" };

export default async function BemVinda() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("aceitar_meus_convites");
  const { count } = await supabase
    .from("workspace_membros")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (count) redirect("/inicio");

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/logo-vermelho.png" alt="" className="mx-auto mb-4 h-14 w-auto" />
        <h1 className="text-center text-4xl">Bem-vinda!</h1>
        <div className="cartao mt-6">
          <p className="text-sm">
            Você entrou como <strong>{user.email}</strong>, mas ainda não faz parte de nenhum espaço.
          </p>
          <p className="mt-3 text-sm text-suave">
            <strong className="text-texto">É cliente?</strong> Peça para a sua consultora te convidar usando exatamente
            este e-mail. Depois disso, é só entrar de novo.
          </p>
        </div>

        <details className="cartao mt-4">
          <summary className="cursor-pointer text-sm font-medium">Sou consultora: quero criar um espaço</summary>
          <CriarEspaco />
        </details>

        <form action={sair} className="mt-6 text-center">
          <button className="text-sm text-suave underline underline-offset-4 hover:text-texto">Sair</button>
        </form>
      </div>
    </main>
  );
}
