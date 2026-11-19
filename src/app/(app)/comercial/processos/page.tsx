import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TituloPagina } from "@/components/ui";
import { BotaoFormulario } from "@/components/formulario-entidade";
import { SequenciaEtapas } from "@/components/valor-campo";
import { naoLidos } from "@/lib/leituras";

export const metadata = { title: "Processos e funis" };

function Novo() {
  return <span className="etiqueta">Novo</span>;
}

export default async function Processos() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const [{ data: funis }, { data: processos }] = await Promise.all([
    supabase.from("funis").select("*").eq("workspace_id", ctx.workspace.id).order("created_at"),
    supabase.from("processos").select("*").eq("workspace_id", ctx.workspace.id).order("created_at"),
  ]);
  const [nf, np] = await Promise.all([
    naoLidos(supabase, ctx.usuario.id, "funis", funis ?? []),
    naoLidos(supabase, ctx.usuario.id, "processos", processos ?? []),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <TituloPagina titulo="Processos e funis" subtitulo="Como cada etapa do atendimento acontece, e quem faz o quê." />

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-2xl">Funis</h2>
          {ctx.podeAdministrar && <BotaoFormulario entidade="funis" rotulo="Novo funil" classe="botao-secundario" irParaDetalhe />}
        </div>
        <div className="flex flex-col gap-4">
          {(funis ?? []).map((f) => (
            <article key={f.id} className="cartao">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <Link href={`/item/funis/${f.id}`} className="font-titulo text-2xl hover:text-destaque-escuro">{f.nome}</Link>
                  {f.objetivo && <p className="text-sm text-suave">{f.objetivo}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {nf.has(f.id) && <Novo />}
                  <Link href={`/item/funis/${f.id}`} className="text-sm text-destaque-escuro underline underline-offset-4">Abrir</Link>
                </div>
              </div>
              <SequenciaEtapas etapas={f.etapas} />
            </article>
          ))}
          {!funis?.length && <p className="text-sm text-suave">Nenhum funil cadastrado ainda.</p>}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-2xl">Processos</h2>
          {ctx.podeAdministrar && <BotaoFormulario entidade="processos" rotulo="Novo processo" classe="botao-secundario" irParaDetalhe />}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(processos ?? []).map((p) => (
            <Link key={p.id} href={`/item/processos/${p.id}`} className="cartao block transition hover:border-destaque">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl">{p.nome}</h3>
                {np.has(p.id) && <Novo />}
              </div>
              <p className="mt-1 text-xs text-suave">
                {[p.responsavel && `Responsável: ${p.responsavel}`, p.frequencia, `${p.passos.length} passo(s)`].filter(Boolean).join(" · ")}
              </p>
              <ol className="mt-3 ml-5 list-decimal space-y-1 text-sm">
                {p.passos.slice(0, 3).map((x: string, i: number) => <li key={i}>{x}</li>)}
              </ol>
              {p.passos.length > 3 && <p className="mt-1 text-xs text-suave">e mais {p.passos.length - 3}…</p>}
            </Link>
          ))}
          {!processos?.length && <p className="text-sm text-suave">Nenhum processo cadastrado ainda.</p>}
        </div>
      </section>
    </div>
  );
}
