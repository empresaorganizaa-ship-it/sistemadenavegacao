import { Download } from "lucide-react";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { GraficoFaturamento, GraficoSimples } from "@/components/graficos";
import { calcular, type MetricaMes } from "@/lib/calculos";
import { hojeBrasil } from "@/lib/formatos";
import type { Auditoria, OrigemLead } from "@/lib/tipos";
import { EditorMetricas } from "./editor";
import { EditorOrigens } from "./origens";
import { EditorProcedimentos } from "./procedimentos";
import { metasDoAno } from "@/lib/metas";
import { CAMPOS } from "./campos";

export const metadata = { title: "Métricas comerciais" };

export default async function Metricas() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const ano = ctx.ano;

  const [{ data: metricasRaw }, { data: origensRaw }, { data: porOrigemRaw }, metas, { data: leadsAno }, { data: servicosRaw }, { data: porProcRaw }] = await Promise.all([
    supabase.from("metricas_mensais").select("*").eq("workspace_id", ctx.workspace.id).eq("ano", ano),
    supabase.from("origens_lead").select("id, nome, ordem, ativo").eq("workspace_id", ctx.workspace.id).order("ordem"),
    supabase.from("metricas_leads_origem").select("origem_id, mes, quantidade").eq("workspace_id", ctx.workspace.id).eq("ano", ano),
    metasDoAno(supabase, ctx.workspace.id, ano),
    supabase
      .from("leads")
      .select("data_entrada, agendado_em, avaliado_em, fechado_em, valor_fechado")
      .eq("workspace_id", ctx.workspace.id)
      .or(`and(data_entrada.gte.${ano}-01-01,data_entrada.lte.${ano}-12-31),and(agendado_em.gte.${ano}-01-01,agendado_em.lte.${ano}-12-31),and(avaliado_em.gte.${ano}-01-01,avaliado_em.lte.${ano}-12-31),and(fechado_em.gte.${ano}-01-01,fechado_em.lte.${ano}-12-31)`)
      .limit(10000),
    supabase.from("servicos").select("id, nome, ativo").eq("workspace_id", ctx.workspace.id).order("ordem").order("nome"),
    supabase.from("metricas_procedimento").select("servico_id, mes, valor").eq("workspace_id", ctx.workspace.id).eq("ano", ano),
  ]);

  // Números do mês contados a partir do CRM (para preencher com um clique)
  const doCrm: Record<number, Record<string, number>> = {};
  const mesDe = (d: string | null) => (d && Number(d.slice(0, 4)) === ano ? Number(d.slice(5, 7)) : null);
  for (const l of leadsAno ?? []) {
    const add = (m: number | null, k: string, v = 1) => {
      if (!m) return;
      doCrm[m] ??= { leads_novos: 0, avaliacoes_agendadas: 0, avaliacoes_realizadas: 0, vendas_fechadas: 0, faturamento: 0 };
      doCrm[m][k] += v;
    };
    add(mesDe(l.data_entrada), "leads_novos");
    add(mesDe(l.agendado_em), "avaliacoes_agendadas");
    add(mesDe(l.avaliado_em), "avaliacoes_realizadas");
    add(mesDe(l.fechado_em), "vendas_fechadas");
    add(mesDe(l.fechado_em), "faturamento", Number(l.valor_fechado ?? 0));
  }

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
      <TituloPagina
        titulo="Métricas comerciais"
        subtitulo={`Números de janeiro a dezembro de ${ano}.`}
        acoes={<a href={`/exportar/metricas?ano=${ano}`} className="botao-secundario"><Download className="size-4" /> Planilha</a>}
      />

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
        doCrm={doCrm}
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

      <EditorProcedimentos
        ano={ano}
        servicos={(servicosRaw ?? []).filter((s) => s.ativo || (porProcRaw ?? []).some((p) => p.servico_id === s.id))}
        valores={(porProcRaw ?? []).map((r) => ({ servico_id: r.servico_id, mes: r.mes, valor: Number(r.valor) }))}
        faturamentoPorMes={Object.fromEntries(mesesDoAno.map((m) => [m, porMes[m]?.faturamento ?? null]))}
        podeEditar={ctx.podeEditarOperacional}
      />
    </div>
  );
}
