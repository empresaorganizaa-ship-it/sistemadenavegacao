import { NextResponse } from "next/server";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dataBr, gerarCsv } from "@/lib/csv";
import { calcular } from "@/lib/calculos";
import { MESES } from "@/lib/formatos";

function arquivo(nome: string, conteudo: string) {
  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}

function slug(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export async function GET(request: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const ws = ctx.workspace.id;

  if (tipo === "crm") {
    const [{ data: leads }, { data: colunas }, { data: origens }, { data: servicos }] = await Promise.all([
      supabase.from("leads").select("*").eq("workspace_id", ws).order("data_entrada", { ascending: false }).limit(20000),
      supabase.from("crm_colunas").select("id, nome").eq("workspace_id", ws),
      supabase.from("origens_lead").select("id, nome").eq("workspace_id", ws),
      supabase.from("servicos").select("id, nome").eq("workspace_id", ws),
    ]);
    const n = (lista: { id: string; nome: string }[] | null) => Object.fromEntries((lista ?? []).map((x) => [x.id, x.nome]));
    const col = n(colunas), ori = n(origens), ser = n(servicos);
    const nomeLead = Object.fromEntries((leads ?? []).map((l) => [l.id, l.nome]));
    const csv = gerarCsv(
      ["Nome", "WhatsApp", "Instagram", "Etapa", "Origem", "Procedimento", "Valor do orçamento", "Valor fechado", "Data de entrada", "Agendou em", "Avaliou em", "Fechou em", "Data do procedimento", "Aniversário", "Próxima ação", "Data da próxima ação", "Motivo da perda", "Indicada por", "Observações"],
      (leads ?? []).map((l) => [
        l.nome, l.whatsapp, l.instagram, col[l.coluna_id] ?? "", ori[l.origem_id] ?? "", ser[l.servico_id] ?? l.procedimento_texto,
        l.valor_orcamento === null ? null : Number(l.valor_orcamento), l.valor_fechado === null ? null : Number(l.valor_fechado),
        dataBr(l.data_entrada), dataBr(l.agendado_em), dataBr(l.avaliado_em), dataBr(l.fechado_em), dataBr(l.data_procedimento), dataBr(l.aniversario),
        l.proxima_acao, dataBr(l.proxima_acao_data), l.motivo_perda, l.indicada_por ? nomeLead[l.indicada_por] : "", l.observacoes,
      ]),
    );
    return arquivo(`crm-${slug(ctx.workspace.nome)}.csv`, csv);
  }

  if (tipo === "metricas") {
    const ano = Number(new URL(request.url).searchParams.get("ano")) || ctx.ano;
    const { data } = await supabase.from("metricas_mensais").select("*").eq("workspace_id", ws).eq("ano", ano).order("mes");
    const csv = gerarCsv(
      ["Mês", "Faturamento", "Investimento em anúncios", "Leads novos", "Avaliações agendadas", "Avaliações realizadas", "Vendas fechadas", "Retornos/recompras", "Indicações recebidas", "Ticket médio", "Taxa de agendamento (%)", "Taxa de comparecimento (%)", "Taxa de conversão (%)", "Custo por lead"],
      (data ?? []).map((m) => {
        const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
        const c = calcular({ ...m, faturamento: num(m.faturamento), investimento_anuncios: num(m.investimento_anuncios) });
        const pct = (v: number | null) => (v === null ? null : Math.round(v * 1000) / 10);
        const dinheiro = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);
        return [
          `${MESES[m.mes - 1]}/${ano}`, num(m.faturamento), num(m.investimento_anuncios), m.leads_novos, m.avaliacoes_agendadas, m.avaliacoes_realizadas,
          m.vendas_fechadas, m.pacientes_retorno, m.indicacoes_recebidas, dinheiro(c.ticketMedio), pct(c.taxaAgendamento), pct(c.taxaComparecimento),
          pct(c.taxaConversao), dinheiro(c.custoPorLead),
        ];
      }),
    );
    return arquivo(`metricas-${ano}-${slug(ctx.workspace.nome)}.csv`, csv);
  }

  return NextResponse.json({ erro: "Tipo de planilha desconhecido." }, { status: 404 });
}
