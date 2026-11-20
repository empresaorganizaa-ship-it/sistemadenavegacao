import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BarraProgresso, TituloPagina } from "@/components/ui";
import { BotaoFormulario } from "@/components/formulario-entidade";
import { QuadroCronograma, type Acao } from "@/components/quadro-cronograma";
import { hojeBrasil } from "@/lib/formatos";
import { MARCA } from "@/lib/marca";

export const metadata = { title: "Cronograma do acompanhamento" };

export default async function Acompanhamento() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("etapas_acompanhamento")
    .select("id, titulo, descricao, data_inicio, data_fim, status, ordem")
    .eq("workspace_id", ctx.workspace.id)
    .order("ordem")
    .order("data_fim", { nullsFirst: false });
  const acoes = (data ?? []) as Acao[];
  const feitas = acoes.filter((e) => e.status === "concluida").length;

  return (
    <div className="mx-auto max-w-6xl">
      <TituloPagina
        titulo="Cronograma do acompanhamento"
        subtitulo={`As ações do ${MARCA.nome} para ${ctx.workspace.nome}. ${ctx.podeEditarOperacional ? "Arraste os cartões ou use os botões para mudar de coluna." : ""}`}
        acoes={ctx.podeAdministrar && (
          <BotaoFormulario entidade="etapas_acompanhamento" rotulo="Nova ação" padroes={{ status: "proxima", ordem: String(acoes.length + 1) }} />
        )}
      />
      {acoes.length > 0 && (
        <div className="cartao mb-6 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="rotulo">Progresso</p>
            <p className="text-sm text-suave">{feitas} de {acoes.length} concluídas</p>
          </div>
          <BarraProgresso fracao={feitas / acoes.length} />
        </div>
      )}
      {acoes.length ? (
        <QuadroCronograma acoes={acoes} hoje={hojeBrasil().iso} podeMover={ctx.podeEditarOperacional} />
      ) : (
        <p className="cartao text-sm text-suave">
          {ctx.podeAdministrar ? "Cadastre as ações que a cliente precisa fazer. Elas começam em \"A fazer\"." : "A consultora ainda vai montar o cronograma."}
        </p>
      )}
      {ctx.podeAdministrar && acoes.length > 0 && (
        <p className="mt-4 text-xs text-suave">Para editar o texto, o prazo ou excluir, clique no nome da ação.</p>
      )}
    </div>
  );
}
