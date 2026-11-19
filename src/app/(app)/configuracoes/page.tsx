import { headers } from "next/headers";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TituloPagina } from "@/components/ui";
import { CriarEspaco } from "@/app/bem-vinda/criar-espaco";
import type { OrigemLead } from "@/lib/tipos";
import {
  FormEspaco, FormLogo, BlocoStatus, Pessoas, Origens, FormPerfil, FormSenha, ZonaPerigo,
} from "./formularios";

export const metadata = { title: "Configurações" };

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="cartao">
      <h2 className="text-2xl">{titulo}</h2>
      {descricao && <p className="mt-1 mb-4 text-sm text-suave">{descricao}</p>}
      <div className={descricao ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

export default async function Configuracoes() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const h = await headers();
  const site = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const [{ data: membros }, { data: convites }, { data: origens }] = await Promise.all([
    supabase.from("workspace_membros").select("user_id, papel, created_at").eq("workspace_id", ctx.workspace.id),
    supabase.from("convites").select("id, email, papel, created_at").eq("workspace_id", ctx.workspace.id).order("created_at"),
    supabase.from("origens_lead").select("id, nome, ordem, ativo").eq("workspace_id", ctx.workspace.id).order("ordem"),
  ]);
  const { data: perfis } = await supabase
    .from("profiles")
    .select("id, nome, email")
    .in("id", (membros ?? []).map((m) => m.user_id));

  const pessoas = (membros ?? []).map((m) => {
    const p = perfis?.find((x) => x.id === m.user_id);
    return { id: m.user_id, papel: m.papel as "consultora" | "cliente", nome: p?.nome ?? "", email: p?.email ?? "" };
  });

  const adm = ctx.podeAdministrar;
  const encerrado = ctx.workspace.status === "acompanhamento_encerrado";

  return (
    <div className="mx-auto max-w-3xl">
      <TituloPagina titulo="Configurações" subtitulo={ctx.workspace.nome} />
      <div className="flex flex-col gap-6">
        <Secao
          titulo="Espaço"
          descricao={adm ? "Nome, cor de destaque e ano que aparece primeiro." : "Somente quem administra o espaço pode alterar estes dados."}
        >
          <FormEspaco workspace={ctx.workspace} podeEditar={adm} />
          <div className="mt-6 border-t border-borda pt-5">
            <FormLogo workspaceId={ctx.workspace.id} logoUrl={ctx.logoUrl} podeEditar={adm} />
          </div>
        </Secao>

        <Secao titulo="Acompanhamento">
          <BlocoStatus encerrado={encerrado} papel={ctx.papel} podeAdministrar={adm} />
        </Secao>

        <Secao titulo="Pessoas" descricao="Quem tem acesso a este espaço.">
          <Pessoas
            pessoas={pessoas}
            convites={(convites ?? []) as { id: string; email: string; papel: "consultora" | "cliente" }[]}
            euId={ctx.usuario.id}
            podeAdministrar={adm}
            site={site}
          />
        </Secao>

        <Secao titulo="Origens de lead" descricao="Lista usada em Métricas comerciais (e, depois, no CRM).">
          <Origens origens={(origens ?? []) as OrigemLead[]} podeEditar={adm} />
        </Secao>

        <Secao titulo="Minha conta" descricao={ctx.usuario.email}>
          <FormPerfil nome={ctx.perfil.nome} />
          <div className="mt-6 border-t border-borda pt-5">
            <FormSenha />
          </div>
        </Secao>

        {ctx.papel === "consultora" && (
          <Secao titulo="Novo espaço" descricao="Crie um espaço separado para outra cliente. Cada espaço é totalmente isolado.">
            <div className="max-w-md">
              <CriarEspaco compacto />
            </div>
          </Secao>
        )}

        {adm && (
          <Secao titulo="Excluir espaço" descricao="Apaga definitivamente este espaço e todos os dados dele.">
            <ZonaPerigo nome={ctx.workspace.nome} />
          </Secao>
        )}
      </div>
    </div>
  );
}
