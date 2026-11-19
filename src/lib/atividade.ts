import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MESES, primeiroNome } from "./formatos";

// "Atividade recente": o que as outras pessoas do espaço criaram ou alteraram
// nos últimos dias, agrupado por pessoa, tipo de ação e dia.
// Usa as colunas de auditoria (created_by/created_at/updated_by/updated_at)
// que todas as tabelas já têm. Exclusões não aparecem.

type Linha = {
  id: string;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  [k: string]: unknown;
};

type Fonte = {
  tabela: string;
  colunas: string;
  link: (r: Linha) => string;
  /** frase para 1 item e para vários; "acao" é criou/alterou */
  frase: (acao: "criou" | "alterou", itens: Linha[]) => string;
};

const mes = (m: unknown) => MESES[Number(m) - 1]?.toLowerCase() ?? "";
/** "março" / "março e abril" / "11 meses (janeiro a novembro)" */
const listaMeses = (nums: unknown[]) => {
  const ms = Array.from(new Set(nums.map(Number).filter((n) => n >= 1 && n <= 12))).sort((a, b) => a - b);
  if (ms.length > 3) return `${ms.length} meses (${mes(ms[0])} a ${mes(ms[ms.length - 1])})`;
  return ms.map(mes).join(ms.length === 2 ? " e " : ", ");
};
const plural = (n: number, um: string, varios: string) => (n === 1 ? um : `${n} ${varios}`);
const nomes = (itens: Linha[], campo: string) => {
  const ns = Array.from(new Set(itens.map((i) => String(i[campo] ?? "")).filter(Boolean)));
  return ns.length <= 2 ? ns.join(" e ") : `${ns.slice(0, 2).join(", ")} e mais ${ns.length - 2}`;
};

const FONTES: Fonte[] = [
  {
    tabela: "leads",
    colunas: "nome",
    link: (r) => `/item/leads/${r.id}`,
    frase: (a, it) =>
      a === "criou"
        ? `cadastrou ${plural(it.length, "a lead", "leads")} no CRM: ${nomes(it, "nome")}`
        : `atualizou ${plural(it.length, "a paciente", "pacientes")} no CRM: ${nomes(it, "nome")}`,
  },
  {
    tabela: "metricas_mensais",
    colunas: "mes, ano",
    link: () => "/metricas",
    frase: (_, it) => `preencheu as métricas comerciais de ${listaMeses(it.map((i) => i.mes))}`,
  },
  {
    tabela: "metricas_leads_origem",
    colunas: "mes",
    link: () => "/metricas",
    frase: (_, it) => `atualizou os leads por origem de ${listaMeses(it.map((i) => i.mes))}`,
  },
  {
    tabela: "metricas_procedimento",
    colunas: "mes",
    link: () => "/metricas",
    frase: (_, it) => `atualizou o faturamento por procedimento de ${listaMeses(it.map((i) => i.mes))}`,
  },
  {
    tabela: "metricas_marketing",
    colunas: "mes",
    link: () => "/marketing/metricas",
    frase: (_, it) => `preencheu as métricas de marketing de ${listaMeses(it.map((i) => i.mes))}`,
  },
  {
    tabela: "metas_ciclo",
    colunas: "nome",
    link: () => "/metas",
    frase: (a, it) => `${a === "criou" ? "criou" : "alterou"} a meta "${nomes(it, "nome")}"`,
  },
  { tabela: "metas_mes", colunas: "mes", link: () => "/metas", frase: () => "ajustou as metas dos meses" },
  {
    tabela: "rotina_registros",
    colunas: "periodo",
    link: () => "/comercial/rotina",
    frase: (_, it) => `marcou ${plural(it.length, "1 tarefa", "tarefas")} da rotina como feita${it.length === 1 ? "" : "s"}`,
  },
  {
    tabela: "rotina_tarefas",
    colunas: "titulo",
    link: () => "/comercial/rotina",
    frase: (a, it) => `${a === "criou" ? "criou" : "editou"} ${plural(it.length, "uma tarefa", "tarefas")} da rotina: ${nomes(it, "titulo")}`,
  },
  {
    tabela: "conteudos",
    colunas: "tema",
    link: (r) => `/item/conteudos/${r.id}`,
    frase: (a, it) => `${a === "criou" ? "programou" : "atualizou"} ${plural(it.length, "um conteúdo", "conteúdos")} no cronograma: ${nomes(it, "tema")}`,
  },
  {
    tabela: "referencias",
    colunas: "titulo",
    link: (r) => `/item/referencias/${r.id}`,
    frase: (a, it) => `${a === "criou" ? "adicionou" : "atualizou"} ${plural(it.length, "uma referência", "referências")}: ${nomes(it, "titulo")}`,
  },
  {
    tabela: "campanhas",
    colunas: "nome",
    link: (r) => `/item/campanhas/${r.id}`,
    frase: (a, it) => `${a === "criou" ? "criou" : "atualizou"} ${it.length === 1 ? "a campanha" : "as campanhas"} ${nomes(it, "nome")}`,
  },
  {
    tabela: "indicacoes",
    colunas: "status",
    link: () => "/pos-venda/indicacao",
    frase: (a, it) => (a === "criou" ? `registrou ${plural(it.length, "uma indicação", "indicações")}` : `atualizou ${plural(it.length, "uma indicação", "indicações")}`),
  },
  {
    tabela: "aniversario_envios",
    colunas: "ano",
    link: () => "/pos-venda/aniversariantes",
    frase: (_, it) => `enviou ${plural(it.length, "uma mensagem", "mensagens")} de aniversário`,
  },
  {
    tabela: "servicos",
    colunas: "nome",
    link: () => "/pos-venda/servicos",
    frase: (a, it) => `${a === "criou" ? "cadastrou" : "atualizou"} ${it.length === 1 ? "o serviço" : "os serviços"} ${nomes(it, "nome")}`,
  },
  {
    tabela: "mensagens_modelos",
    colunas: "titulo",
    link: () => "/pos-venda/mensagens",
    frase: (a, it) => `${a === "criou" ? "criou" : "editou"} ${plural(it.length, "um modelo", "modelos")} de mensagem: ${nomes(it, "titulo")}`,
  },
  {
    tabela: "playbook_secoes",
    colunas: "titulo",
    link: (r) => `/comercial/playbook?s=${r.id}`,
    frase: (a, it) => `${a === "criou" ? "criou" : "atualizou"} no playbook: ${nomes(it, "titulo")}`,
  },
  {
    tabela: "analises_conteudo",
    colunas: "titulo, mes_ref",
    link: (r) => `/item/analises_conteudo/${r.id}`,
    frase: (a, it) => `${a === "criou" ? "publicou" : "atualizou"} a análise de conteúdo de ${listaMeses(it.map((i) => String(i.mes_ref).slice(5, 7)))}`,
  },
  {
    tabela: "funis",
    colunas: "nome",
    link: (r) => `/item/funis/${r.id}`,
    frase: (a, it) => `${a === "criou" ? "criou" : "atualizou"} ${it.length === 1 ? "o funil" : "os funis"} ${nomes(it, "nome")}`,
  },
  {
    tabela: "processos",
    colunas: "nome",
    link: (r) => `/item/processos/${r.id}`,
    frase: (a, it) => `${a === "criou" ? "criou" : "atualizou"} ${it.length === 1 ? "o processo" : "os processos"} ${nomes(it, "nome")}`,
  },
  {
    tabela: "etapas_acompanhamento",
    colunas: "titulo",
    link: () => "/acompanhamento",
    frase: (a, it) => `${a === "criou" ? "adicionou" : "atualizou"} no cronograma do acompanhamento: ${nomes(it, "titulo")}`,
  },
  {
    tabela: "anexos",
    colunas: "nome, entidade, registro_id",
    link: (r) => (r.entidade === "playbook_secoes" ? `/comercial/playbook?s=${r.registro_id}` : `/item/${r.entidade}/${r.registro_id}`),
    frase: (_, it) => `anexou ${plural(it.length, "um arquivo", "arquivos")}: ${nomes(it, "nome")}`,
  },
  {
    tabela: "comentarios",
    colunas: "texto, entidade, registro_id",
    link: (r) => (r.entidade === "playbook_secoes" ? `/comercial/playbook?s=${r.registro_id}` : `/item/${r.entidade}/${r.registro_id}`),
    frase: (_, it) => {
      const t = String(it[0].texto ?? "");
      return it.length === 1 ? `comentou: “${t.length > 70 ? t.slice(0, 70) + "…" : t}”` : `fez ${it.length} comentários`;
    },
  },
];

// página da lista, quando o grupo tem vários itens
const LISTA: Record<string, string> = {
  leads: "/comercial/crm",
  conteudos: "/marketing/cronograma",
  referencias: "/marketing/referencias",
  campanhas: "/comercial/campanhas",
  playbook_secoes: "/comercial/playbook",
  analises_conteudo: "/marketing/analise",
  funis: "/comercial/processos",
  processos: "/comercial/processos",
};

export type Atividade = {
  chave: string;
  pessoa: string;
  frase: string;
  link: string;
  quando: string; // ISO do evento mais recente do grupo
};

function diaBr(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export async function carregarAtividade(
  supabase: SupabaseClient,
  ws: string,
  euId: string,
  nomesPessoas: Record<string, string>,
  dias = 7,
  limite = 12,
): Promise<Atividade[]> {
  const desde = new Date(Date.now() - dias * 86400000).toISOString();
  const resultados = await Promise.all(
    FONTES.map((f) =>
      supabase
        .from(f.tabela)
        .select(`id, created_by, created_at, updated_by, updated_at, ${f.colunas}`)
        .eq("workspace_id", ws)
        .gte("updated_at", desde)
        .order("updated_at", { ascending: false })
        .limit(60),
    ),
  );

  const grupos = new Map<string, { fonte: Fonte; acao: "criou" | "alterou"; pessoa: string; itens: Linha[]; quando: string }>();
  resultados.forEach((res, i) => {
    const fonte = FONTES[i];
    for (const r of (res.data ?? []) as unknown as Linha[]) {
      // criado agora (até 1 min entre criar e a última alteração) conta como "criou"
      const criou = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() < 60_000;
      const acao = criou ? "criou" : "alterou";
      const autora = criou ? r.created_by : r.updated_by;
      if (!autora || autora === euId) continue;
      const chave = `${fonte.tabela}|${acao}|${autora}|${diaBr(r.updated_at)}`;
      const g = grupos.get(chave);
      if (g) {
        g.itens.push(r);
        if (r.updated_at > g.quando) g.quando = r.updated_at;
      } else {
        grupos.set(chave, { fonte, acao, pessoa: autora, itens: [r], quando: r.updated_at });
      }
    }
  });

  return Array.from(grupos.entries())
    .sort((a, b) => b[1].quando.localeCompare(a[1].quando))
    .slice(0, limite)
    .map(([chave, g]) => ({
      chave,
      pessoa: primeiroNome(nomesPessoas[g.pessoa]),
      frase: g.fonte.frase(g.acao, g.itens),
      link: g.itens.length === 1 ? g.fonte.link(g.itens[0]) : (LISTA[g.fonte.tabela] ?? g.fonte.link(g.itens[0])),
      quando: g.quando,
    }));
}
