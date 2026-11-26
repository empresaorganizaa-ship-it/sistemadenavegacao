import Link from "next/link";
import { Download } from "lucide-react";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarOpcoes } from "@/lib/opcoes";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { BotaoFormulario } from "@/components/formulario-entidade";
import { MESES, hojeBrasil, inteiro, reais } from "@/lib/formatos";
import { dataValida, dentroDoPeriodo, normalizarTexto, periodoContato, proximoContato, temProcedimento, type FiltrosCrm } from "@/lib/filtros-crm";
import { Kanban, type LeadCartao } from "./kanban";
import { ImportarPlanilha } from "./importar";
import { cadencia } from "@/lib/followup";

export const metadata = { title: "CRM" };

export default async function Crm({ searchParams }: { searchParams: Promise<FiltrosCrm> }) {
  const f = await searchParams;
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const hoje = hojeBrasil();
  const mesResumo = hoje.iso.slice(0, 7);
  const [ar, mr] = mesResumo.split("-").map(Number);
  const iniMes = `${mesResumo}-01`;
  const fimMes = new Date(Date.UTC(ar, mr, 0)).toISOString().slice(0, 10);

  let consulta = supabase
    .from("leads")
    .select("id, nome, whatsapp, coluna_id, origem_id, servico_id, procedimento_texto, valor_orcamento, valor_fechado, proxima_acao, proxima_acao_data, data_entrada, followup_inicio, updated_at")
    .eq("workspace_id", ctx.workspace.id)
    .order("updated_at", { ascending: false })
    .limit(1000);
  const entDe = dataValida(f.ent_de);
  const entAte = dataValida(f.ent_ate);
  if (entDe) consulta = consulta.gte("data_entrada", entDe);
  if (entAte) consulta = consulta.lte("data_entrada", entAte);
  if (f.origem && /^[0-9a-f-]{36}$/i.test(f.origem)) consulta = consulta.eq("origem_id", f.origem);
  if (f.q?.trim()) consulta = consulta.ilike("nome", `%${f.q.trim().replace(/[%_]/g, "")}%`);

  const [{ data: colunas }, { data: leadsBrutos }, opcoes, { data: doMes }, { data: textosProc }] = await Promise.all([
    supabase.from("crm_colunas").select("id, nome, tipo").eq("workspace_id", ctx.workspace.id).order("ordem"),
    consulta,
    carregarOpcoes(supabase, ctx.workspace.id, ["crm_colunas", "origens_lead", "servicos", "leads"]),
    supabase
      .from("leads")
      .select("data_entrada, agendado_em, fechado_em, valor_fechado")
      .eq("workspace_id", ctx.workspace.id)
      .or(`and(data_entrada.gte.${iniMes},data_entrada.lte.${fimMes}),and(agendado_em.gte.${iniMes},agendado_em.lte.${fimMes}),and(fechado_em.gte.${iniMes},fechado_em.lte.${fimMes})`),
    supabase.from("leads").select("procedimento_texto").eq("workspace_id", ctx.workspace.id).not("procedimento_texto", "is", null).limit(5000),
  ]);

  const dentro = (d: string | null) => !!d && d >= iniMes && d <= fimMes;
  const resumo = {
    leads: (doMes ?? []).filter((l) => dentro(l.data_entrada)).length,
    agendamentos: (doMes ?? []).filter((l) => dentro(l.agendado_em)).length,
    vendas: (doMes ?? []).filter((l) => dentro(l.fechado_em)).length,
    valor: (doMes ?? []).filter((l) => dentro(l.fechado_em)).reduce((s, l) => s + Number(l.valor_fechado ?? 0), 0),
  };

  const nomeServico = Object.fromEntries((opcoes.servicos ?? []).map((o) => [o.valor, o.rotulo]));

  // procedimento: do catálogo ou digitado (ex.: vindo de planilha)
  const leads = f.proc ? (leadsBrutos ?? []).filter((l) => temProcedimento(l, f.proc!, nomeServico)) : (leadsBrutos ?? []);
  const nomesCatalogo = new Set(Object.values(nomeServico).map(normalizarTexto));
  const outrosProcedimentos = Array.from(
    new Map(
      (textosProc ?? [])
        .map((t) => String(t.procedimento_texto).trim())
        .filter((t) => t && !nomesCatalogo.has(normalizarTexto(t)))
        .map((t) => [normalizarTexto(t), t] as const),
    ).values(),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  // cadência de follow-up de quem está com ela iniciada
  const comCadencia = leads.filter((l) => l.followup_inicio).map((l) => l.id);
  const feitosPorLead: Record<string, number[]> = {};
  for (let i = 0; i < comCadencia.length; i += 300) {
    const { data: fs } = await supabase.from("lead_followups").select("lead_id, etapa").in("lead_id", comCadencia.slice(i, i + 300));
    for (const f of fs ?? []) (feitosPorLead[f.lead_id] ??= []).push(f.etapa);
  }
  const periodo = periodoContato(f, hoje.iso);
  const todos = leads.map((l) => {
    const c = l.followup_inicio ? cadencia(l.followup_inicio, feitosPorLead[l.id] ?? [], hoje.iso) : null;
    return { l, c, contato: proximoContato(l.proxima_acao_data, c?.proximo?.data ?? null) };
  });
  const visiveis = periodo
    ? todos.filter((x) => dentroDoPeriodo(x.contato, periodo)).sort((a, b) => (a.contato ?? "").localeCompare(b.contato ?? ""))
    : todos;
  const cartoes: LeadCartao[] = visiveis.map(({ l, c }) => ({
    id: l.id,
    nome: l.nome,
    whatsapp: l.whatsapp,
    coluna_id: l.coluna_id,
    procedimento: (l.servico_id && nomeServico[l.servico_id]) || l.procedimento_texto || null,
    valor: l.valor_fechado ?? l.valor_orcamento,
    proxima_acao: l.proxima_acao,
    proxima_acao_data: l.proxima_acao_data,
    followup: c ? { feitos: c.feitos, proximo: c.proximo?.etapa ?? null, data: c.proximo?.data ?? null, situacao: c.proximo?.situacao ?? "feito" } : null,
  }));

  const ativos = [f.q?.trim(), f.origem, f.proc, entDe || entAte, periodo].filter(Boolean).length;
  const ATALHOS = [
    { valor: "atrasados", rotulo: "Atrasados" },
    { valor: "hoje", rotulo: "Hoje" },
    { valor: "7dias", rotulo: "Próximos 7 dias" },
  ];

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

      <details className="cartao group mb-4 p-0" open={ativos > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span>
            Filtros {ativos > 0 && <span className="etiqueta ml-1">{ativos} ativo(s)</span>}
          </span>
          <span className="text-xs font-normal text-suave group-open:hidden">mostrar</span>
          <span className="hidden text-xs font-normal text-suave group-open:inline">esconder</span>
        </summary>
      <form className="flex flex-col gap-3 border-t border-borda p-4" action="/comercial/crm">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <label className="rotulo" htmlFor="q">Buscar por nome</label>
            <input id="q" name="q" defaultValue={f.q} className="campo" placeholder="Nome da paciente" />
          </div>
          <div className="min-w-40">
            <label className="rotulo" htmlFor="proc">Procedimento</label>
            <select id="proc" name="proc" defaultValue={f.proc ?? ""} className="campo">
              <option value="">Todos</option>
              {opcoes.servicos.length > 0 && (
                <optgroup label="Catálogo de serviços">
                  {opcoes.servicos.map((o) => <option key={o.valor} value={`s:${o.valor}`}>{o.rotulo}</option>)}
                </optgroup>
              )}
              {outrosProcedimentos.length > 0 && (
                <optgroup label="Outros (digitados ou importados)">
                  {outrosProcedimentos.map((t) => <option key={t} value={`t:${t}`}>{t}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div className="min-w-36">
            <label className="rotulo" htmlFor="origem">Origem</label>
            <select id="origem" name="origem" defaultValue={f.origem ?? ""} className="campo">
              <option value="">Todas</option>
              {opcoes.origens_lead.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="rotulo">Inserido no CRM</p>
            <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="ent_de">Inserido a partir de</label>
            <input id="ent_de" name="ent_de" type="date" defaultValue={entDe} className="campo w-auto" />
            <span className="text-xs text-suave">até</span>
            <label className="sr-only" htmlFor="ent_ate">Inserido até</label>
            <input id="ent_ate" name="ent_ate" type="date" defaultValue={entAte} className="campo w-auto" />
            </div>
          </div>
          <div>
            <p className="rotulo">Próximo contato <span className="normal-case">(próxima ação ou follow-up)</span></p>
            <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="cont_de">Próximo contato a partir de</label>
            <input id="cont_de" name="cont_de" type="date" defaultValue={f.cont ? undefined : dataValida(f.cont_de)} className="campo w-auto" />
            <span className="text-xs text-suave">até</span>
            <label className="sr-only" htmlFor="cont_ate">Próximo contato até</label>
            <input id="cont_ate" name="cont_ate" type="date" defaultValue={f.cont ? undefined : dataValida(f.cont_ate)} className="campo w-auto" />
            <span className="flex flex-wrap gap-1">
              {ATALHOS.map((a) => (
                <button
                  key={a.valor}
                  name="cont"
                  value={a.valor}
                  className={`rounded-full border px-2.5 py-1 text-xs ${f.cont === a.valor ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda bg-superficie text-suave hover:text-texto"}`}
                >
                  {a.rotulo}
                </button>
              ))}
            </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="botao-secundario">Filtrar</button>
          {ativos > 0 && (
            <>
              <span className="text-xs text-suave">
                {cartoes.length} paciente(s) com {ativos} filtro(s){periodo ? " · ordenadas pelo próximo contato" : ""}
              </span>
              <Link href="/comercial/crm" className="text-sm text-suave underline underline-offset-4">Limpar filtros</Link>
            </>
          )}
        </div>
      </form>
      </details>

      <Kanban colunas={colunas ?? []} leads={cartoes} podeEditar={ctx.podeEditarOperacional} hoje={hoje.iso} />
    </div>
  );
}
