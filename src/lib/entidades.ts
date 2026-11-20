// Descrição de cada tipo de registro do sistema: campos, permissões e se
// tem comentários/anexos. Usada pelos formulários, pela página de detalhe e
// pelas ações do servidor (que validam os dados por aqui).

export type TipoCampo =
  | "texto"
  | "textoLongo"
  | "markdown"
  | "numero"
  | "dinheiro"
  | "data"
  | "mes"
  | "selecao"
  | "relacao"
  | "lista"
  | "etapas"
  | "url"
  | "telefone"
  | "booleano";

export type Opcao = { valor: string; rotulo: string };

export type Campo = {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio?: boolean;
  opcoes?: Opcao[];
  /** para "relacao": de onde vêm as opções (carregadas na página) */
  relacao?: string;
  ajuda?: string;
  placeholder?: string;
  /** ocupa só meia largura no formulário (no computador) */
  meia?: boolean;
  /** valor padrão ao criar */
  padrao?: unknown;
  /** coluna NOT NULL de texto: grava "" em vez de null */
  textoVazio?: boolean;
  /** esconder na página de detalhe */
  ocultoNoDetalhe?: boolean;
};

export type Entidade = {
  chave: string;
  tabela: string;
  nome: string;
  artigo: "o" | "a";
  /** "operacional": cliente sempre edita; "administrar": consultora durante o acompanhamento */
  permissao: "operacional" | "administrar";
  entregavel?: boolean;
  comentarios?: boolean;
  anexos?: boolean;
  campos: Campo[];
  campoTitulo: string;
  /** página da lista, para voltar */
  lista: string;
};

export const FORMATOS: Opcao[] = [
  { valor: "reels", rotulo: "Reels" },
  { valor: "carrossel", rotulo: "Carrossel" },
  { valor: "stories", rotulo: "Stories" },
  { valor: "post", rotulo: "Post estático" },
  { valor: "live", rotulo: "Live" },
];

export const STATUS_CONTEUDO: Opcao[] = [
  { valor: "ideia", rotulo: "Ideia" },
  { valor: "roteiro", rotulo: "Roteiro pronto" },
  { valor: "gravado", rotulo: "Gravado" },
  { valor: "publicado", rotulo: "Publicado" },
];

export const OBJETIVOS_CONTEUDO: Opcao[] = [
  { valor: "atrair", rotulo: "Atrair" },
  { valor: "nutrir", rotulo: "Nutrir" },
  { valor: "converter", rotulo: "Converter" },
];

export const STATUS_CAMPANHA: Opcao[] = [
  { valor: "planejada", rotulo: "Planejada" },
  { valor: "andamento", rotulo: "Em andamento" },
  { valor: "concluida", rotulo: "Concluída" },
];

export const STATUS_ETAPA: Opcao[] = [
  { valor: "proxima", rotulo: "A fazer" },
  { valor: "andamento", rotulo: "Em andamento" },
  { valor: "concluida", rotulo: "Concluído" },
];

export const STATUS_INDICACAO: Opcao[] = [
  { valor: "indicada", rotulo: "Indicada" },
  { valor: "agendou", rotulo: "Agendou" },
  { valor: "fechou", rotulo: "Fechou" },
];

export const CATEGORIAS_MENSAGEM: Opcao[] = [
  { valor: "boas_vindas", rotulo: "Boas-vindas" },
  { valor: "confirmacao", rotulo: "Confirmação de avaliação" },
  { valor: "pos_procedimento", rotulo: "Pós-procedimento" },
  { valor: "retorno", rotulo: "Lembrete de retorno" },
  { valor: "aniversario", rotulo: "Aniversário" },
  { valor: "reativacao", rotulo: "Reativação de paciente sumida" },
  { valor: "pedido_indicacao", rotulo: "Pedido de indicação" },
  { valor: "pedido_depoimento", rotulo: "Pedido de depoimento" },
  { valor: "datas_campanhas", rotulo: "Datas comemorativas e campanhas" },
];

export const FREQUENCIAS: Opcao[] = [
  { valor: "diaria", rotulo: "Diária" },
  { valor: "semanal", rotulo: "Semanal" },
  { valor: "mensal", rotulo: "Mensal" },
];

export const TIPOS_COLUNA: Opcao[] = [
  { valor: "novo", rotulo: "Novo lead" },
  { valor: "contato", rotulo: "Em contato" },
  { valor: "agendada", rotulo: "Avaliação agendada" },
  { valor: "realizada", rotulo: "Avaliação realizada" },
  { valor: "orcamento", rotulo: "Orçamento enviado" },
  { valor: "ganho", rotulo: "Fechado (ganho)" },
  { valor: "perdido", rotulo: "Perdido" },
  { valor: "outro", rotulo: "Outra etapa" },
];

export const RESPONSAVEIS: Opcao[] = [
  { valor: "cliente", rotulo: "Cliente" },
  { valor: "consultora", rotulo: "Consultora" },
  { valor: "ambas", rotulo: "As duas" },
];

const E: Entidade[] = [
  {
    chave: "encontros",
    tabela: "encontros",
    nome: "encontro",
    artigo: "o",
    permissao: "administrar",
    entregavel: true,
    comentarios: true,
    anexos: true,
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true, placeholder: "Ex.: Encontro 3 · Quebra de objeções" },
      { chave: "data", rotulo: "Data do encontro", tipo: "data", obrigatorio: true, meia: true },
      { chave: "proximo_encontro", rotulo: "Próximo encontro", tipo: "data", meia: true },
      { chave: "resumo", rotulo: "Resumo e orientações", tipo: "markdown", textoVazio: true },
    ],
    campoTitulo: "titulo",
    lista: "/encontros",
  },
  {
    chave: "encontro_combinados",
    tabela: "encontro_combinados",
    nome: "combinado",
    artigo: "o",
    permissao: "administrar",
    campos: [
      { chave: "encontro_id", rotulo: "Encontro", tipo: "relacao", relacao: "encontros", obrigatorio: true, ocultoNoDetalhe: true },
      { chave: "texto", rotulo: "O que foi combinado", tipo: "texto", obrigatorio: true, placeholder: "Ex.: responder os leads em até 1 hora" },
      { chave: "responsavel", rotulo: "Quem faz", tipo: "selecao", opcoes: RESPONSAVEIS, padrao: "cliente", meia: true },
      { chave: "prazo", rotulo: "Prazo", tipo: "data", meia: true },
    ],
    campoTitulo: "texto",
    lista: "/encontros",
  },
  {
    chave: "leads",
    tabela: "leads",
    nome: "paciente",
    artigo: "a",
    permissao: "operacional",
    comentarios: false,
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true },
      { chave: "coluna_id", rotulo: "Etapa no CRM", tipo: "relacao", relacao: "crm_colunas", meia: true },
      { chave: "origem_id", rotulo: "Origem", tipo: "relacao", relacao: "origens_lead", meia: true },
      { chave: "whatsapp", rotulo: "WhatsApp", tipo: "telefone", meia: true, placeholder: "(11) 98765-4321" },
      { chave: "instagram", rotulo: "Instagram", tipo: "texto", meia: true, placeholder: "@perfil" },
      { chave: "servico_id", rotulo: "Procedimento de interesse", tipo: "relacao", relacao: "servicos", meia: true },
      { chave: "procedimento_texto", rotulo: "Outro procedimento", tipo: "texto", meia: true, ajuda: "Se não estiver na lista de serviços" },
      { chave: "valor_orcamento", rotulo: "Valor do orçamento (R$)", tipo: "dinheiro", meia: true },
      { chave: "valor_fechado", rotulo: "Valor fechado (R$)", tipo: "dinheiro", meia: true },
      { chave: "proxima_acao", rotulo: "Próxima ação", tipo: "texto", meia: true, placeholder: "Ex.: enviar orçamento" },
      { chave: "proxima_acao_data", rotulo: "Data da próxima ação", tipo: "data", meia: true },
      { chave: "data_procedimento", rotulo: "Data do procedimento", tipo: "data", meia: true },
      { chave: "aniversario", rotulo: "Aniversário", tipo: "data", meia: true },
      { chave: "data_entrada", rotulo: "Data de entrada", tipo: "data", meia: true, ajuda: "Quando o contato chegou" },
      { chave: "indicada_por", rotulo: "Indicada por", tipo: "relacao", relacao: "leads", meia: true },
      { chave: "motivo_perda", rotulo: "Motivo da perda", tipo: "textoLongo", ajuda: "Preencha quando a paciente não fechar" },
      { chave: "observacoes", rotulo: "Observações comerciais", tipo: "textoLongo", ajuda: "Apenas dados comerciais. Nada de informações clínicas." },
    ],
    campoTitulo: "nome",
    lista: "/comercial/crm",
  },
  {
    chave: "servicos",
    tabela: "servicos",
    nome: "serviço",
    artigo: "o",
    permissao: "operacional",
    campos: [
      { chave: "nome", rotulo: "Nome do procedimento", tipo: "texto", obrigatorio: true },
      { chave: "descricao", rotulo: "Descrição curta", tipo: "textoLongo" },
      { chave: "preco_min", rotulo: "Preço a partir de (R$)", tipo: "dinheiro", meia: true },
      { chave: "preco_max", rotulo: "Preço até (R$)", tipo: "dinheiro", meia: true },
      { chave: "intervalo_retorno_dias", rotulo: "Retorno recomendado (dias)", tipo: "numero", meia: true, ajuda: "Ex.: 120 para toxina" },
    ],
    campoTitulo: "nome",
    lista: "/pos-venda/servicos",
  },
  {
    chave: "rotina_tarefas",
    tabela: "rotina_tarefas",
    nome: "tarefa",
    artigo: "a",
    permissao: "operacional",
    campos: [
      { chave: "titulo", rotulo: "Tarefa", tipo: "texto", obrigatorio: true, placeholder: "Ex.: responder leads até 1h" },
      { chave: "frequencia", rotulo: "Frequência", tipo: "selecao", opcoes: FREQUENCIAS, obrigatorio: true, padrao: "diaria", meia: true },
      { chave: "descricao", rotulo: "Detalhes", tipo: "textoLongo" },
    ],
    campoTitulo: "titulo",
    lista: "/comercial/rotina",
  },
  {
    chave: "playbook_secoes",
    tabela: "playbook_secoes",
    nome: "seção do playbook",
    artigo: "a",
    permissao: "administrar",
    entregavel: true,
    comentarios: true,
    anexos: true,
    campos: [
      { chave: "titulo", rotulo: "Título da seção", tipo: "texto", obrigatorio: true },
      { chave: "ordem", rotulo: "Ordem", tipo: "numero", meia: true },
      { chave: "conteudo", rotulo: "Conteúdo", tipo: "markdown", textoVazio: true },
    ],
    campoTitulo: "titulo",
    lista: "/comercial/playbook",
  },
  {
    chave: "funis",
    tabela: "funis",
    nome: "funil",
    artigo: "o",
    permissao: "administrar",
    entregavel: true,
    comentarios: true,
    anexos: true,
    campos: [
      { chave: "nome", rotulo: "Nome do funil", tipo: "texto", obrigatorio: true },
      { chave: "objetivo", rotulo: "Objetivo", tipo: "textoLongo" },
      { chave: "etapas", rotulo: "Etapas (em ordem)", tipo: "etapas" },
    ],
    campoTitulo: "nome",
    lista: "/comercial/processos",
  },
  {
    chave: "processos",
    tabela: "processos",
    nome: "processo",
    artigo: "o",
    permissao: "administrar",
    entregavel: true,
    comentarios: true,
    anexos: true,
    campos: [
      { chave: "nome", rotulo: "Nome do processo", tipo: "texto", obrigatorio: true },
      { chave: "responsavel", rotulo: "Responsável", tipo: "texto", meia: true },
      { chave: "frequencia", rotulo: "Frequência", tipo: "texto", meia: true, placeholder: "Ex.: diária, toda segunda" },
      { chave: "passos", rotulo: "Passo a passo", tipo: "lista", ajuda: "Um passo por linha, na ordem" },
      { chave: "links", rotulo: "Links úteis", tipo: "lista", ajuda: "Um link por linha" },
    ],
    campoTitulo: "nome",
    lista: "/comercial/processos",
  },
  {
    chave: "analises_conteudo",
    tabela: "analises_conteudo",
    nome: "análise de conteúdo",
    artigo: "a",
    permissao: "administrar",
    entregavel: true,
    comentarios: true,
    anexos: true,
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true, padrao: "Análise de conteúdo" },
      { chave: "mes_ref", rotulo: "Mês de referência", tipo: "mes", obrigatorio: true, meia: true },
      { chave: "texto", rotulo: "Análise", tipo: "markdown", textoVazio: true },
      { chave: "pontos_fortes", rotulo: "Pontos fortes", tipo: "markdown", textoVazio: true },
      { chave: "pontos_melhoria", rotulo: "Pontos de melhoria", tipo: "markdown", textoVazio: true },
      { chave: "recomendacoes", rotulo: "Recomendações", tipo: "markdown", textoVazio: true },
    ],
    campoTitulo: "titulo",
    lista: "/marketing/analise",
  },
  {
    chave: "campanhas",
    tabela: "campanhas",
    nome: "campanha",
    artigo: "a",
    permissao: "operacional",
    comentarios: true,
    anexos: true,
    campos: [
      { chave: "nome", rotulo: "Nome da campanha", tipo: "texto", obrigatorio: true },
      { chave: "status", rotulo: "Status", tipo: "selecao", opcoes: STATUS_CAMPANHA, padrao: "planejada", meia: true },
      { chave: "procedimento_foco", rotulo: "Procedimento foco", tipo: "texto", meia: true },
      { chave: "data_inicio", rotulo: "Início", tipo: "data", obrigatorio: true, meia: true },
      { chave: "data_fim", rotulo: "Fim", tipo: "data", obrigatorio: true, meia: true },
      { chave: "objetivo", rotulo: "Objetivo", tipo: "textoLongo" },
      { chave: "oferta", rotulo: "Oferta ou condição", tipo: "textoLongo" },
      { chave: "publico", rotulo: "Público", tipo: "texto" },
      { chave: "canais", rotulo: "Canais", tipo: "lista", ajuda: "Um por linha (Instagram, WhatsApp...)" },
      { chave: "acoes", rotulo: "Ações", tipo: "lista", ajuda: "Uma ação por linha" },
      { chave: "meta_faturamento", rotulo: "Meta de faturamento (R$)", tipo: "dinheiro", meia: true },
      { chave: "resultado_alcancado", rotulo: "Resultado alcançado (R$)", tipo: "dinheiro", meia: true },
      { chave: "aprendizados", rotulo: "Aprendizados", tipo: "textoLongo" },
    ],
    campoTitulo: "nome",
    lista: "/comercial/campanhas",
  },
  {
    chave: "referencias",
    tabela: "referencias",
    nome: "referência",
    artigo: "a",
    permissao: "operacional",
    comentarios: true,
    anexos: true,
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true },
      { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: [{ valor: "ideia", rotulo: "Ideia de conteúdo" }, { valor: "referencia", rotulo: "Referência" }], padrao: "ideia", meia: true },
      { chave: "status", rotulo: "Status", tipo: "selecao", opcoes: [{ valor: "nova", rotulo: "Nova" }, { valor: "aprovada", rotulo: "Aprovada" }, { valor: "usada", rotulo: "Usada" }], padrao: "nova", meia: true },
      { chave: "formato", rotulo: "Formato", tipo: "selecao", opcoes: FORMATOS, meia: true },
      { chave: "pilar_id", rotulo: "Pilar de conteúdo", tipo: "relacao", relacao: "pilares_conteudo", meia: true },
      { chave: "link", rotulo: "Link", tipo: "url", placeholder: "https://" },
      { chave: "observacao", rotulo: "Observação", tipo: "textoLongo" },
      { chave: "tags", rotulo: "Tags", tipo: "lista", ajuda: "Uma por linha" },
    ],
    campoTitulo: "titulo",
    lista: "/marketing/referencias",
  },
  {
    chave: "conteudos",
    tabela: "conteudos",
    nome: "conteúdo",
    artigo: "o",
    permissao: "operacional",
    comentarios: true,
    anexos: true,
    campos: [
      { chave: "tema", rotulo: "Tema", tipo: "texto", obrigatorio: true },
      { chave: "data", rotulo: "Data", tipo: "data", obrigatorio: true, meia: true },
      { chave: "status", rotulo: "Status", tipo: "selecao", opcoes: STATUS_CONTEUDO, padrao: "ideia", meia: true },
      { chave: "formato", rotulo: "Formato", tipo: "selecao", opcoes: FORMATOS, meia: true },
      { chave: "pilar_id", rotulo: "Pilar", tipo: "relacao", relacao: "pilares_conteudo", meia: true },
      { chave: "objetivo", rotulo: "Objetivo", tipo: "selecao", opcoes: OBJETIVOS_CONTEUDO, meia: true },
      { chave: "responsavel", rotulo: "Responsável", tipo: "texto", meia: true },
      { chave: "roteiro", rotulo: "Roteiro ou legenda", tipo: "markdown" },
      { chave: "cta", rotulo: "CTA (chamada para ação)", tipo: "texto" },
      { chave: "referencia_id", rotulo: "Referência vinculada", tipo: "relacao", relacao: "referencias" },
    ],
    campoTitulo: "tema",
    lista: "/marketing/cronograma",
  },
  {
    chave: "indicacoes",
    tabela: "indicacoes",
    nome: "indicação",
    artigo: "a",
    permissao: "operacional",
    campos: [
      { chave: "indicadora_id", rotulo: "Quem indicou", tipo: "relacao", relacao: "leads", obrigatorio: true },
      { chave: "indicada_id", rotulo: "Indicada", tipo: "relacao", relacao: "leads" },
      { chave: "data", rotulo: "Data", tipo: "data", meia: true },
      { chave: "status", rotulo: "Status", tipo: "selecao", opcoes: STATUS_INDICACAO, padrao: "indicada", meia: true },
      { chave: "recompensa_entregue", rotulo: "Recompensa entregue", tipo: "booleano" },
    ],
    campoTitulo: "data",
    lista: "/pos-venda/indicacao",
  },
  {
    chave: "mensagens_modelos",
    tabela: "mensagens_modelos",
    nome: "modelo de mensagem",
    artigo: "o",
    permissao: "operacional",
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true },
      { chave: "categoria", rotulo: "Categoria", tipo: "selecao", opcoes: CATEGORIAS_MENSAGEM, obrigatorio: true, padrao: "boas_vindas" },
      {
        chave: "texto",
        rotulo: "Texto",
        tipo: "textoLongo",
        textoVazio: true,
        ajuda: "Variáveis automáticas: {nome}, {procedimento}, {data}, {beneficio}",
      },
    ],
    campoTitulo: "titulo",
    lista: "/pos-venda/mensagens",
  },
  {
    chave: "etapas_acompanhamento",
    tabela: "etapas_acompanhamento",
    nome: "ação do cronograma",
    artigo: "a",
    permissao: "administrar",
    comentarios: true,
    campos: [
      { chave: "titulo", rotulo: "Ação", tipo: "texto", obrigatorio: true, placeholder: "Ex.: Revisar os scripts de WhatsApp" },
      { chave: "status", rotulo: "Coluna", tipo: "selecao", opcoes: STATUS_ETAPA, padrao: "proxima", meia: true },
      { chave: "data_fim", rotulo: "Prazo", tipo: "data", meia: true },
      { chave: "data_inicio", rotulo: "Começa em", tipo: "data", meia: true, ajuda: "Opcional" },
      { chave: "ordem", rotulo: "Posição na coluna", tipo: "numero", meia: true, ajuda: "1 aparece primeiro" },
      { chave: "descricao", rotulo: "Detalhes e orientações", tipo: "textoLongo" },
    ],
    campoTitulo: "titulo",
    lista: "/acompanhamento",
  },
  {
    chave: "crm_colunas",
    tabela: "crm_colunas",
    nome: "coluna do CRM",
    artigo: "a",
    permissao: "administrar",
    campos: [
      { chave: "nome", rotulo: "Nome da coluna", tipo: "texto", obrigatorio: true },
      { chave: "tipo", rotulo: "Significado", tipo: "selecao", opcoes: TIPOS_COLUNA, padrao: "outro", meia: true, ajuda: "Usado para contar agendamentos e vendas automaticamente" },
      { chave: "ordem", rotulo: "Posição", tipo: "numero", meia: true },
    ],
    campoTitulo: "nome",
    lista: "/configuracoes",
  },
  {
    chave: "pilares_conteudo",
    tabela: "pilares_conteudo",
    nome: "pilar de conteúdo",
    artigo: "o",
    permissao: "administrar",
    campos: [
      { chave: "nome", rotulo: "Nome do pilar", tipo: "texto", obrigatorio: true },
      { chave: "ordem", rotulo: "Posição", tipo: "numero", meia: true },
    ],
    campoTitulo: "nome",
    lista: "/configuracoes",
  },
];

export const ENTIDADES: Record<string, Entidade> = Object.fromEntries(E.map((e) => [e.chave, e]));

export function rotuloOpcao(opcoes: Opcao[] | undefined, valor: unknown): string {
  return opcoes?.find((o) => o.valor === valor)?.rotulo ?? (valor ? String(valor) : "—");
}
