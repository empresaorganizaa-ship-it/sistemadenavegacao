import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BarraProgresso, TituloPagina } from "@/components/ui";
import { BotaoExcluir, BotaoFormulario } from "@/components/formulario-entidade";
import { LinhaTempo, type Etapa } from "@/components/linha-tempo";
import { MARCA } from "@/lib/marca";

export const metadata = { title: "Cronograma do acompanhamento" };

export default async function Acompanhamento() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("etapas_acompanhamento")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("ordem")
    .order("data_inicio", { nullsFirst: false });
  const etapas = (data ?? []) as (Etapa & { ordem: number })[];
  const feitas = etapas.filter((e) => e.status === "concluida").length;

  return (
    <div className="mx-auto max-w-3xl">
      <TituloPagina
        titulo="Cronograma do acompanhamento"
        subtitulo={`As etapas do ${MARCA.nome} com ${ctx.workspace.nome}.`}
        acoes={ctx.podeAdministrar && <BotaoFormulario entidade="etapas_acompanhamento" rotulo="Nova etapa" padroes={{ ordem: String(etapas.length + 1) }} />}
      />
      {etapas.length > 0 && (
        <div className="cartao mb-6 flex flex-col gap-2">
          <p className="rotulo">Progresso</p>
          <p className="font-titulo text-3xl">{feitas} de {etapas.length} etapas concluídas</p>
          <BarraProgresso fracao={feitas / etapas.length} />
        </div>
      )}
      <section className="cartao">
        {etapas.length ? (
          <LinhaTempo
            etapas={etapas}
            acoes={ctx.podeAdministrar ? (e) => (
              <div className="flex gap-1">
                <BotaoFormulario entidade="etapas_acompanhamento" registro={e} classe="botao-secundario px-2 py-1 text-xs" rotulo="Editar" icone="nenhum" />
                <BotaoExcluir entidade="etapas_acompanhamento" id={e.id} classe="botao-perigo px-2 py-1 text-xs" rotulo="" />
              </div>
            ) : undefined}
          />
        ) : (
          <p className="text-sm text-suave">
            {ctx.podeAdministrar ? "Cadastre as etapas do acompanhamento (diagnóstico, metas, playbook...) com as datas previstas." : "A consultora ainda vai montar o cronograma."}
          </p>
        )}
      </section>
    </div>
  );
}
