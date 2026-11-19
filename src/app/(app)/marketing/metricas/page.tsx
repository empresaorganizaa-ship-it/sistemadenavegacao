import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { GraficoSimples } from "@/components/graficos";
import { hojeBrasil } from "@/lib/formatos";
import { EditorMarketing } from "./editor";

export const metadata = { title: "Métricas de marketing" };

export default async function MetricasMarketing() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("metricas_marketing").select("*").eq("workspace_id", ctx.workspace.id).eq("ano", ctx.ano);
  const porMes = Object.fromEntries((data ?? []).map((d) => [d.mes, d]));
  const hoje = hojeBrasil();
  const meses = Array.from({ length: 12 }, (_, i) => i + 1);
  const serie = (k: string) => meses.map((mes) => ({ mes, valor: porMes[mes]?.[k] ?? null }));

  return (
    <div className="mx-auto max-w-[1400px]">
      <TituloPagina titulo="Métricas de marketing" subtitulo={`Números do Instagram em ${ctx.ano}.`} />
      {!ctx.podeEditarOperacional && <div className="mb-4"><SomenteLeitura /></div>}
      <EditorMarketing ano={ctx.ano} dados={porMes} mesInicial={ctx.ano === hoje.ano ? hoje.mes : 1} podeEditar={ctx.podeEditarOperacional} />
      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="cartao"><h2 className="mb-3 text-xl">Seguidores</h2><GraficoSimples tipo="linha" nome="Seguidores" formato="inteiro" dados={serie("seguidores_total")} /></div>
        <div className="cartao"><h2 className="mb-3 text-xl">Alcance</h2><GraficoSimples tipo="barras" nome="Alcance" formato="inteiro" dados={serie("alcance")} /></div>
        <div className="cartao"><h2 className="mb-3 text-xl">Leads do Instagram</h2><GraficoSimples tipo="barras" nome="Leads" formato="inteiro" dados={serie("leads_instagram")} /></div>
      </section>
    </div>
  );
}
