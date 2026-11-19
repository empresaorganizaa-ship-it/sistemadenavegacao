// Estrutura do menu. "fase" indica em qual fase o módulo será construído.
export type ItemMenu = { titulo: string; href: string; fase: number };
export type GrupoMenu = { titulo: string; icone: string; href?: string; fase?: number; itens?: ItemMenu[] };

export const MENU: GrupoMenu[] = [
  { titulo: "Início", icone: "inicio", href: "/inicio", fase: 1 },
  { titulo: "Metas", icone: "metas", href: "/metas", fase: 1 },
  { titulo: "Métricas comerciais", icone: "metricas", href: "/metricas", fase: 1 },
  {
    titulo: "Marketing",
    icone: "marketing",
    itens: [
      { titulo: "Análise de conteúdo", href: "/marketing/analise", fase: 3 },
      { titulo: "Banco de referências", href: "/marketing/referencias", fase: 3 },
      { titulo: "Cronograma", href: "/marketing/cronograma", fase: 3 },
      { titulo: "Métricas de marketing", href: "/marketing/metricas", fase: 3 },
    ],
  },
  {
    titulo: "Comercial",
    icone: "comercial",
    itens: [
      { titulo: "Playbook", href: "/comercial/playbook", fase: 2 },
      { titulo: "Rotina", href: "/comercial/rotina", fase: 2 },
      { titulo: "CRM", href: "/comercial/crm", fase: 2 },
      { titulo: "Campanhas do ano", href: "/comercial/campanhas", fase: 2 },
      { titulo: "Processos e funis", href: "/comercial/processos", fase: 2 },
    ],
  },
  {
    titulo: "Pós-venda",
    icone: "posvenda",
    itens: [
      { titulo: "Serviços", href: "/pos-venda/servicos", fase: 4 },
      { titulo: "Aniversariantes", href: "/pos-venda/aniversariantes", fase: 4 },
      { titulo: "Programa de indicação", href: "/pos-venda/indicacao", fase: 4 },
      { titulo: "Modelos de mensagem", href: "/pos-venda/mensagens", fase: 4 },
    ],
  },
  { titulo: "Configurações", icone: "configuracoes", href: "/configuracoes", fase: 1 },
];

export function encontrarItem(href: string): (ItemMenu & { grupo: string }) | null {
  for (const g of MENU) {
    for (const i of g.itens ?? []) if (i.href === href) return { ...i, grupo: g.titulo };
  }
  return null;
}
