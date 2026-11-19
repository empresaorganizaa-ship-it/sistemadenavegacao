import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Autoria, TituloPagina } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { BotaoExcluir, BotaoFormulario } from "@/components/formulario-entidade";
import { Comentarios } from "@/components/comentarios";
import { Anexos } from "@/components/anexos";
import { marcarLido, naoLidos } from "@/lib/leituras";

export const metadata = { title: "Playbook" };

type Secao = { id: string; titulo: string; ordem: number; conteudo: string; created_by: string | null; created_at: string; updated_by: string | null; updated_at: string };

export default async function Playbook({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("playbook_secoes").select("*").eq("workspace_id", ctx.workspace.id).order("ordem").order("created_at");
  const secoes = (data ?? []) as Secao[];
  const atual = secoes.find((x) => x.id === s) ?? secoes[0];
  if (atual && atual.created_by !== ctx.usuario.id && atual.conteudo.trim()) await marcarLido(supabase, ctx.workspace.id, "playbook_secoes", atual.id);
  const novas = await naoLidos(supabase, ctx.usuario.id, "playbook_secoes", secoes.filter((x) => x.conteudo.trim() && x.id !== atual?.id));

  return (
    <div className="mx-auto max-w-6xl">
      <TituloPagina
        titulo="Playbook comercial"
        subtitulo="O manual de como o consultório atende e vende."
        acoes={ctx.podeAdministrar && <BotaoFormulario entidade="playbook_secoes" rotulo="Nova seção" padroes={{ ordem: String(secoes.length + 1) }} />}
      />
      {!secoes.length && <p className="text-sm text-suave">Nenhuma seção ainda.</p>}
      {atual && (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav aria-label="Seções do playbook" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {secoes.map((x, i) => (
              <Link
                key={x.id}
                href={`/comercial/playbook?s=${x.id}`}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition lg:shrink ${
                  x.id === atual.id ? "bg-destaque-suave font-medium text-destaque-escuro" : "text-texto hover:bg-superficie-2"
                }`}
              >
                <span className="text-xs text-suave tabular-nums">{i + 1}.</span>
                <span className={x.conteudo.trim() ? "" : "text-suave"}>{x.titulo}</span>
                {novas.has(x.id) && <span className="size-2 shrink-0 rounded-full bg-destaque" aria-label="novidade" />}
              </Link>
            ))}
          </nav>
          <div className="flex min-w-0 flex-col gap-6">
            <article className="cartao">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-3xl">{atual.titulo}</h2>
                  <Autoria registro={atual} nomes={ctx.nomes} />
                </div>
                {ctx.podeAdministrar && (
                  <div className="flex gap-2">
                    <BotaoFormulario entidade="playbook_secoes" registro={atual} classe="botao-secundario" />
                    <BotaoExcluir entidade="playbook_secoes" id={atual.id} voltarPara="/comercial/playbook" rotulo="" />
                  </div>
                )}
              </div>
              {atual.conteudo.trim() ? (
                <Markdown texto={atual.conteudo} />
              ) : (
                <p className="text-sm text-suave">
                  {ctx.podeAdministrar ? "Esta seção ainda está vazia. Clique em Editar para escrever." : "A consultora ainda vai preencher esta seção."}
                </p>
              )}
            </article>
            <Anexos entidade="playbook_secoes" registroId={atual.id} />
            <Comentarios entidade="playbook_secoes" registroId={atual.id} />
          </div>
        </div>
      )}
    </div>
  );
}
