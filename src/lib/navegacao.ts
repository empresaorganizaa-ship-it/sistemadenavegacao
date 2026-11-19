// Estrutura do menu.
export type ItemMenu = { titulo: string; href: string };
export type GrupoMenu = { titulo: string; icone: string; href?: string; itens?: ItemMenu[] };

export const MENU: GrupoMenu[] = [
  { titulo: "Início", icone: "inicio", href: "/inicio" },
  { titulo: "Metas", icone: "metas", href: "/metas" },
  { titulo: "Métricas comerciais", icone: "metricas", href: "/metricas" },
  {
    titulo: "Marketing",
    icone: "marketing",
    itens: [
      { titulo: "Análise de conteúdo", href: "/marketing/analise" },
      { titulo: "Banco de referências", href: "/marketing/referencias" },
      { titulo: "Cronograma", href: "/marketing/cronograma" },
      { titulo: "Métricas de marketing", href: "/marketing/metricas" },
    ],
  },
  {
    titulo: "Comercial",
    icone: "comercial",
    itens: [
      { titulo: "Playbook", href: "/comercial/playbook" },
      { titulo: "Rotina", href: "/comercial/rotina" },
      { titulo: "CRM", href: "/comercial/crm" },
      { titulo: "Campanhas do ano", href: "/comercial/campanhas" },
      { titulo: "Processos e funis", href: "/comercial/processos" },
    ],
  },
  {
    titulo: "Pós-venda",
    icone: "posvenda",
    itens: [
      { titulo: "Serviços", href: "/pos-venda/servicos" },
      { titulo: "Aniversariantes", href: "/pos-venda/aniversariantes" },
      { titulo: "Programa de indicação", href: "/pos-venda/indicacao" },
      { titulo: "Modelos de mensagem", href: "/pos-venda/mensagens" },
    ],
  },
  { titulo: "Configurações", icone: "configuracoes", href: "/configuracoes" },
];
