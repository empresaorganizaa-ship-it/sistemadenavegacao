import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Autoria, BarraProgresso } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { BotaoExcluir, BotaoFormulario } from "@/components/formulario-entidade";
import { Comentarios } from "@/components/comentarios";
import { Anexos } from "@/components/anexos";
import { data as fData, hojeBrasil } from "@/lib/formatos";
import { marcarLido } from "@/lib/leituras";
import { ListaCombinados, type Combinado } from "../combinados";

export default async function Encontro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const [{ data: e }, { data: cs }] = await Promise.all([
    supabase.from("encontros").select("*").eq("id", id).eq("workspace_id", ctx.workspace.id).maybeSingle(),
    supabase.from("encontro_combinados").select("id, encontro_id, texto, responsavel, prazo, feito, ordem").eq("encontro_id", id).order("ordem").order("created_at"),
  ]);
  if (!e) notFound();
  if (e.created_by !== ctx.usuario.id) await marcarLido(supabase, ctx.workspace.id, "encontros", id);

  const combinados = (cs ?? []) as (Combinado & { ordem: number })[];
  const feitos = combinados.filter((c) => c.feito).length;
  const hoje = hojeBrasil().iso;
  const adm = ctx.podeAdministrar;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/encontros" className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ArrowLeft className="size-4" /> Encontros
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="rotulo">Encontro de {fData(e.data)}</p>
            <h1 className="text-3xl leading-tight lg:text-4xl">{e.titulo}</h1>
            <Autoria registro={e} nomes={ctx.nomes} className="mt-1" />
          </div>
          {adm && (
            <div className="flex gap-2">
              <BotaoFormulario entidade="encontros" registro={e} classe="botao-secundario" />
              <BotaoExcluir entidade="encontros" id={id} voltarPara="/encontros" rotulo="" />
            </div>
          )}
        </div>
      </div>

      <section className="cartao">
        <h2 className="mb-3 text-xl">Resumo e orientações</h2>
        {e.resumo.trim() ? <Markdown texto={e.resumo} /> : <p className="text-sm text-suave">Sem resumo.</p>}
        {e.proximo_encontro && (
          <p className="mt-4 rounded-lg bg-superficie-2 px-3 py-2 text-sm">
            Próximo encontro: <strong>{fData(e.proximo_encontro)}</strong>
          </p>
        )}
      </section>

      <section className="cartao">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl">Combinados</h2>
          {adm && (
            <BotaoFormulario
              entidade="encontro_combinados"
              padroes={{ encontro_id: id }}
              ocultar={["encontro_id"]}
              rotulo="Novo combinado"
              classe="botao-secundario"
            />
          )}
        </div>
        {combinados.length > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <div className="flex-1"><BarraProgresso fracao={feitos / combinados.length} /></div>
            <span className="text-xs text-suave">{feitos} de {combinados.length} feitos</span>
          </div>
        )}
        {combinados.length ? (
          <ListaCombinados
            itens={combinados}
            podeMarcar={ctx.podeEditarOperacional}
            hoje={hoje}
            acoes={adm ? Object.fromEntries(combinados.map((c) => [c.id, (
              <span key={c.id} className="flex shrink-0 gap-1">
                <BotaoFormulario entidade="encontro_combinados" registro={c} ocultar={["encontro_id"]} classe="botao-secundario px-2 py-1 text-xs" rotulo="Editar" icone="nenhum" />
                <BotaoExcluir entidade="encontro_combinados" id={c.id} classe="botao-perigo px-2 py-1 text-xs" rotulo="" />
              </span>
            )])) : undefined}
          />
        ) : (
          <p className="text-sm text-suave">{adm ? "Adicione o que ficou combinado neste encontro, quem faz e o prazo." : "Nenhum combinado neste encontro."}</p>
        )}
      </section>

      <Anexos entidade="encontros" registroId={id} />
      <Comentarios entidade="encontros" registroId={id} />
    </div>
  );
}
