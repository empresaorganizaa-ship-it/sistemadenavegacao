import Link from "next/link";
import { Download } from "lucide-react";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarOpcoes } from "@/lib/opcoes";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { BotaoFormulario } from "@/components/formulario-entidade";
import { MESES, hojeBrasil, inteiro, reais } from "@/lib/formatos";
import { Kanban, type LeadCartao } from "./kanban";
import { ImportarPlanilha } from "./importar";

export const metadata = { title: "CRM" };

type Filtros = { mes?: string; origem?: string; servico?: string; q?: string };

export default async function Crm({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const hoje = hojeBrasil();
  const mesResumo = /^\d{4}-\d{2}$/.test(f.mes ?? "") ? f.mes! : hoje.iso.slice(0, 7);
  const [ar, mr] = mesResumo.split("-").map(Number);
  const iniMes = `${mesResumo}-01`;
  const fimMes = new Date(Date.UTC(ar, mr, 0)).toISOString().slice(0, 10);

  let consulta = supabase
    .from("leads")
    .select("id, nome, whatsapp, coluna_id, origem_id, servico_id, procedimento_texto, valor_orcamento, valor_fechado, proxima_acao, proxima_acao_data, data_entrada, updated_at")
    .eq("workspace_id", ctx.workspace.id)
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (f.mes) consulta = consulta.gte("data_entrada", iniMes).lte("data_entrada", fimMes);
  if (f.origem) consulta = consulta.eq("origem_id", f.origem);
  if (f.servico) consulta = consulta.eq("servico_id", f.servico);
  if (f.q?.trim()) consulta = consulta.ilike("nome", `%${f.q.trim().replace(/[%_]/g, "")}%`);

  const [{ data: colunas }, { data: leads }, opcoes, { data: doMes }] = await Promise.all([
    supabase.from("crm_colunas").select("id, nome, tipo").eq("workspace_id", ctx.workspace.id).order("ordem"),
    consulta,
    carregarOpcoes(supabase, ctx.workspace.id, ["crm_colunas", "origens_lead", "servicos", "leads"]),
    supabase
      .from("leads")
      .select("data_entrada, agendado_em, fechado_em, valor_fechado")
      .eq("workspace_id", ctx.workspace.id)
      .or(`and(data_entrada.gte.${iniMes},data_entrada.lte.${fimMes}),and(agendado_em.gte.${iniMes},agendado_em.lte.${fimMes}),and(fechado_em.gte.${iniMes},fechado_em.lte.${fimMes})`),
  ]);

  const dentro = (d: string | null) => !!d && d >= iniMes && d <= fimMes;
  const resumo = {
    leads: (doMes ?? []).filter((l) => dentro(l.data_entrada)).length,
    agendamentos: (doMes ?? []).filter((l) => dentro(l.agendado_em)).length,
    vendas: (doMes ?? []).filter((l) => dentro(l.fechado_em)).length,
    valor: (doMes ?? []).filter((l) => dentro(l.fechado_em)).reduce((s, l) => s + Number(l.valor_fechado ?? 0), 0),
  };

  const nomeServico = Object.fromEntries((opcoes.servicos ?? []).map((o) => [o.valor, o.rotulo]));
  const cartoes: LeadCartao[] = (leads ?? []).map((l) => ({
    id: l.id,
    nome: l.nome,
    whatsapp: l.whatsapp,
    coluna_id: l.coluna_id,
    procedimento: (l.servico_id && nomeServico[l.servico_id]) || l.procedimento_texto || null,
    valor: l.valor_fechado ?? l.valor_orcamento,
    proxima_acao: l.proxima_acao,
    proxima_acao_data: l.proxima_acao_data,
  }));

  const filtrando = Boolean(f.mes || f.origem || f.servico || f.q);
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(hoje.ano, hoje.mes - 1 - i, 1));
    return { valor: d.toISOString().slice(0, 7), rotulo: `${MESES[d.getUTCMonth()]}/${d.getUTCFullYear()}` };
  });

  return (
    <div className="mx-auto max-w-[1600px]">
      <TituloPagina
        titulo="CRM"
        subtitulo="Acompanhe cada paciente do primeiro contato ao fechamento."
        acoes={
          <>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- download de arquivo */}
            <a href="/exportar/crm" className="botao-secundario"><Download className="size-4" /> Planilha</a>
            {ctx.podeEditarOperacional && <ImportarPlanilha colunas={(colunas ?? []).map((c) => ({ id: c.id, nome: c.nome }))} espaco={ctx.workspace.nome} />}
            {ctx.podeEditarOperacional && (
              <BotaoFormulario
                entidade="leads"
                opcoes={opcoes}
                padroes={{ coluna_id: colunas?.[0]?.id ?? "", data_entrada: hoje.iso }}
                rotulo="Novo lead"
              />
            )}
          </>
        }
      />
      {!ctx.podeEditarOperacional && <div className="mb-4"><SomenteLeitura /></div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Leads no mês", inteiro(resumo.leads)],
          ["Agendamentos", inteiro(resumo.agendamentos)],
          ["Vendas", inteiro(resumo.vendas)],
          ["Valor fechado", reais(resumo.valor, true)],
        ].map(([r, v]) => (
          <div key={r} className="cartao py-4">
            <p className="rotulo">{r}</p>
            <p className="font-titulo text-2xl tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <p className="-mt-2 mb-4 text-xs text-suave">Resumo de {MESES[mr - 1].toLowerCase()} de {ar}.</p>

      <form className="mb-4 flex flex-wrap items-end gap-2" action="/comercial/crm">
        <div className="min-w-40 flex-1">
          <label className="rotulo" htmlFor="q">Buscar por nome</label>
          <input id="q" name="q" defaultValue={f.q} className="campo" placeholder="Nome da paciente" />
        </div>
        <div>
          <label className="rotulo" htmlFor="mes">Mês de entrada</label>
          <select id="mes" name="mes" defaultValue={f.mes ?? ""} className="campo">
            <option value="">Todos</option>
            {meses.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="origem">Origem</label>
          <select id="origem" name="origem" defaultValue={f.origem ?? ""} className="campo">
            <option value="">Todas</option>
            {opcoes.origens_lead.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="servico">Procedimento</label>
          <select id="servico" name="servico" defaultValue={f.servico ?? ""} className="campo">
            <option value="">Todos</option>
            {opcoes.servicos.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </div>
        <button className="botao-secundario">Filtrar</button>
        {filtrando && <Link href="/comercial/crm" className="px-2 py-2 text-sm text-suave underline underline-offset-4">Limpar</Link>}
      </form>

      <Kanban colunas={colunas ?? []} leads={cartoes} podeEditar={ctx.podeEditarOperacional} hoje={hoje.iso} />
    </div>
  );
}
