import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { GraficoFaturamento, GraficoSimples } from "@/components/graficos";
import { calcular, type MetricaMes } from "@/lib/calculos";
import { hojeBrasil } from "@/lib/formatos";
import type { Auditoria, OrigemLead } from "@/lib/tipos";
import { EditorMetricas } from "./editor";
import { EditorOrigens } from "./origens";
import { metasDoAno } from "@/lib/metas";
import { CAMPOS } from "./campos";

export const metadata = { title: "Métricas comerciais" };

export default async function Metricas() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const ano = ctx.ano;

  const [{ data: metricasRaw }, { data: origensRaw }, { data: porOrigemRaw }, metas] = await Promise.all([
    supabase.from("metricas_mensais").select("*").eq("workspace_id", ctx.workspace.id).eq("ano", ano),
    supabase.from("origens_lead").select("id, nome, ordem, ativo").eq("workspace_id", ctx.workspace.id).order("ordem"),
    supabase.from("metricas_leads_origem").select("origem_id, mes, quantidade").eq("workspace_id", ctx.workspace.id).eq("ano", ano),
    metasDoAno(supabase, ctx.workspace.id, ano),
  ]);

  const metricas = (metricasRaw ?? []) as (MetricaMes & Auditoria)[];
  const porMes: Record<number, MetricaMes & Auditoria> = {};
  for (const m of metricas) {
    porMes[m.mes] = m;
    for (const c of CAMPOS) {
      const v = m[c.chave] as unknown;
      if (typeof v === "string") m[c.chave] = Number(v); // por segurança: numeric pode vir como texto
    }
  }

  const mesesDoAno = Array.from({ length: 12 }, (_, i) => i + 1);
  const hoje = hojeBrasil();
  const origens = (origensRaw ?? []) as OrigemLead[];
  const usadas = new Set((porOrigemRaw ?? []).map((r) => r.origem_id));

  return (
    <div className="mx-auto max-w-[1400px]">
      <TituloPagina titulo="Métricas comerciais" subtitulo={`Números de janeiro a dezembro de ${ano}.`} />

      {!ctx.podeEditarOperacional && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}

      <EditorMetricas
        ano={ano}
        mesInicial={ano === hoje.ano ? hoje.mes : 1}
        dados={porMes}
        metas={metas}
        nomes={ctx.nomes}
        podeEditar={ctx.podeEditarOperacional}
      />

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="cartao lg:col-span-3">
          <h2 className="mb-3 text-xl">Faturamento × meta</h2>
          <GraficoFaturamento
            dados={mesesDoAno.map((mes) => ({ mes, realizado: porMes[mes]?.faturamento ?? null, meta: metas[mes] ?? null }))}
          />
        </div>
        <div className="cartao">
          <h2 className="mb-3 text-xl">Leads novos</h2>
          <GraficoSimples tipo="barras" nome="Leads" formato="inteiro" dados={mesesDoAno.map((mes) => ({ mes, valor: porMes[mes]?.leads_novos ?? null }))} />
        </div>
        <div className="cartao">
          <h2 className="mb-3 text-xl">Taxa de conversão</h2>
          <GraficoSimples tipo="linha" nome="Conversão" formato="porcentagem" dados={mesesDoAno.map((mes) => ({ mes, valor: calcular(porMes[mes]).taxaConversao }))} />
        </div>
        <div className="cartao">
          <h2 className="mb-3 text-xl">Taxa de comparecimento</h2>
          <GraficoSimples tipo="linha" nome="Comparecimento" formato="porcentagem" dados={mesesDoAno.map((mes) => ({ mes, valor: calcular(porMes[mes]).taxaComparecimento }))} />
        </div>
      </section>

      <EditorOrigens
        ano={ano}
        origens={origens.filter((o) => o.ativo || usadas.has(o.id))}
        valores={(porOrigemRaw ?? []).map((r) => ({ origem_id: r.origem_id, mes: r.mes, quantidade: r.quantidade }))}
        leadsPorMes={Object.fromEntries(mesesDoAno.map((m) => [m, porMes[m]?.leads_novos ?? null]))}
        podeEditar={ctx.podeEditarOperacional}
      />

      <p className="mt-6 text-xs text-suave">
        Em breve: faturamento por procedimento (Fase 4, com o catálogo de serviços) e preencher leads, agendamentos e
        vendas automaticamente a partir do CRM (Fase 2).
      </p>
    </div>
  );
}
