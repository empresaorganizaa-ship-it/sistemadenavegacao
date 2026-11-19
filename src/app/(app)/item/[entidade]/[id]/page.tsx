import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ENTIDADES } from "@/lib/entidades";
import { carregarOpcoes, relacoesDe } from "@/lib/opcoes";
import { Autoria } from "@/components/ui";
import { ValorCampo } from "@/components/valor-campo";
import { BotaoExcluir, BotaoFormulario } from "@/components/formulario-entidade";
import { Comentarios } from "@/components/comentarios";
import { Anexos } from "@/components/anexos";
import { linkWhatsapp } from "@/lib/whatsapp";
import { marcarLido } from "@/lib/leituras";

export default async function Detalhe({ params }: { params: Promise<{ entidade: string; id: string }> }) {
  const { entidade, id } = await params;
  const ent = ENTIDADES[entidade];
  if (!ent || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  if (entidade === "encontros") redirect(`/encontros/${id}`);

  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const { data: registro } = await supabase
    .from(ent.tabela)
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!registro) notFound();

  const opcoes = await carregarOpcoes(supabase, ctx.workspace.id, relacoesDe(ent.campos));
  const pode = ent.permissao === "administrar" ? ctx.podeAdministrar : ctx.podeEditarOperacional;

  // entregável aberto por quem não criou: marca como lido
  if (ent.entregavel && registro.created_by !== ctx.usuario.id) {
    await marcarLido(supabase, ctx.workspace.id, entidade, id);
  }

  const titulo = String(registro[ent.campoTitulo] ?? ent.nome);
  const camposVisiveis = ent.campos.filter((c) => c.chave !== ent.campoTitulo && !c.ocultoNoDetalhe && c.chave !== "ordem");
  const curtos = camposVisiveis.filter((c) => !["markdown", "textoLongo", "lista", "etapas"].includes(c.tipo));
  const longos = camposVisiveis.filter((c) => ["markdown", "textoLongo", "lista", "etapas"].includes(c.tipo));
  const zap = entidade === "leads" ? linkWhatsapp(registro.whatsapp) : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href={ent.lista} className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="rotulo">{ent.nome}</p>
            <h1 className="text-3xl leading-tight lg:text-4xl">{titulo}</h1>
            <Autoria registro={registro} nomes={ctx.nomes} className="mt-1" />
          </div>
          <div className="flex flex-wrap gap-2">
            {zap && (
              <a href={zap} target="_blank" rel="noopener noreferrer" className="botao">
                Abrir WhatsApp
              </a>
            )}
            {pode && <BotaoFormulario entidade={entidade} registro={registro} opcoes={opcoes} classe="botao-secundario" />}
            {pode && <BotaoExcluir entidade={entidade} id={id} voltarPara={ent.lista} />}
          </div>
        </div>
      </div>

      {curtos.length > 0 && (
        <dl className="cartao grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {curtos.map((c) => (
            <div key={c.chave}>
              <dt className="rotulo">{c.rotulo}</dt>
              <dd className="text-sm">
                <ValorCampo campo={c} valor={registro[c.chave]} opcoes={opcoes} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {longos.map((c) => (
        <section key={c.chave} className="cartao">
          <h2 className="mb-3 text-xl">{c.rotulo}</h2>
          <ValorCampo campo={c} valor={registro[c.chave]} opcoes={opcoes} />
        </section>
      ))}

      {ent.anexos && <Anexos entidade={entidade} registroId={id} />}
      {ent.comentarios && <Comentarios entidade={entidade} registroId={id} />}
    </div>
  );
}
