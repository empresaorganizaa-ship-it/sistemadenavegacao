# Sistema de Acompanhamento Comercial — Especificação para o Claude Code

> Cole este arquivo na pasta do projeto e diga ao Claude Code:
> "Leia o SPEC-sistema-acompanhamento.md e construa a Fase 1. Me explique cada passo em linguagem simples, porque eu não sou programadora."

---

## 1. Contexto

Sou consultora comercial (Monalisa). Este sistema é para o acompanhamento de uma cliente, **dentista especialista em harmonização orofacial (HOF)**. Durante o acompanhamento, eu insiro entregáveis e orientações, a cliente insere os dados do dia a dia, e as duas veem tudo.

**Requisito importante:** depois que o acompanhamento terminar, o sistema precisa **continuar útil para a cliente** como ferramenta de gestão comercial do consultório. Ela segue usando sozinha as métricas, o CRM, o cronograma, os modelos de mensagem etc.

Quero também poder **reutilizar o sistema com outras clientes** no futuro, cada uma com o próprio espaço isolado.

---

## 2. Stack técnica

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase**: autenticação (login por e-mail com link mágico ou senha), banco Postgres, **Row Level Security (RLS)** e Storage para imagens e arquivos
- **Deploy na Vercel**, com o código no GitHub
- Biblioteca de gráficos simples (ex.: Recharts)
- Interface **100% em português do Brasil**, **mobile-first** (a cliente vai usar muito pelo celular), valores em **R$**, datas no formato **dd/mm/aaaa**

---

## 3. Usuários e permissões

### Estrutura
- **Workspace** = o espaço de uma cliente. Todos os dados pertencem a um workspace.
- Papéis dentro do workspace:
  - **consultora**: eu. Edito tudo e crio entregáveis.
  - **cliente**: a dentista e, opcionalmente, a secretária ou atendente dela.

### Regras
- Ninguém vê dados de outro workspace (garantir com RLS no Supabase, não só no front-end).
- Durante o acompanhamento:
  - A **consultora** edita tudo.
  - A **cliente** edita os dados operacionais (métricas, CRM, rotina, status do cronograma, banco de referências, indicações, aniversariantes) e **vê e comenta** os entregáveis da consultora (análises, playbook, processos, funis).
- Campo de status do workspace: `em_acompanhamento` | `acompanhamento_encerrado`.
  - Quando encerrado, a cliente passa a **editar tudo** e a consultora fica **somente leitura** (ou é removida, se a cliente quiser).
- Cada registro guarda **quem criou** e **quando**, e a interface mostra isso (ex.: "Inserido por Bruna em 12/03").

### Privacidade (LGPD)
- O sistema guarda **apenas dados comerciais** das pacientes (nome, contato, origem, procedimento de interesse, valores, aniversário). **Não** é prontuário: nada de dados clínicos, fotos de pacientes ou anamnese.
- Sem nenhuma página pública. Tudo exige login.

---

## 4. Navegação

Menu lateral (no celular, menu inferior ou hambúrguer):

1. **Início** (painel geral)
2. **Metas**
3. **Métricas comerciais**
4. **Marketing**: Análise de conteúdo · Banco de referências · Cronograma · Métricas de marketing
5. **Comercial**: Playbook · Rotina · CRM · Campanhas do ano · Processos e funis
6. **Pós-venda**: Serviços · Aniversariantes · Programa de indicação · Modelos de mensagem
7. **Configurações** (usuários, status do acompanhamento, ano ativo)

Um **seletor de ano** no topo filtra metas, métricas, campanhas e cronograma.

---

## 5. Módulos

### 5.1 Início (painel geral)
- Cards: **meta do ciclo × realizado** (% atingido e barra de progresso), **meta do mês × realizado no mês**, nº de vendas no mês, ticket médio, taxa de conversão.
- Gráfico de linha ou barras: faturamento realizado × meta, mês a mês.
- **"Novidades da consultora"**: feed com os últimos entregáveis publicados (ex.: "Nova análise de conteúdo — Março").
- **"Ações de hoje"**: próximas ações do CRM vencendo, itens da rotina do dia, pacientes para retorno e aniversariantes da semana.

### 5.2 Metas
- **Meta do ciclo**: nome do ciclo, data de início, data de fim e valor de faturamento.
- **Meta por mês**: tabela com os meses do ciclo e a meta de cada um.
  - Botão "distribuir igualmente" divide a meta do ciclo pelos meses.
  - Cada mês pode ser editado manualmente (ex.: meses de campanha com meta maior).
  - Mostrar a soma dos meses × meta do ciclo, com alerta se estiverem diferentes.
- Permitir vários ciclos (histórico), com um marcado como ativo.

### 5.3 Métricas comerciais (jan a dez, por ano)
Tabela com uma coluna por mês (no celular, um card por mês) e estes campos:

**Inseridos manualmente:**
- Faturamento (R$)
- Investimento em anúncios (R$)
- Leads novos
- Avaliações agendadas
- Avaliações realizadas (comparecimentos)
- Vendas fechadas (nº)
- Pacientes que retornaram ou recompraram
- Indicações recebidas

**Calculados automaticamente:**
- Ticket médio = faturamento ÷ vendas
- Taxa de agendamento = agendadas ÷ leads
- Taxa de comparecimento = realizadas ÷ agendadas
- Taxa de conversão = vendas ÷ avaliações realizadas
- Custo por lead = investimento ÷ leads
- % da meta do mês atingido

**Extras:**
- **Faturamento por procedimento** (opcional por mês), usando a lista de serviços do módulo Pós-venda.
- **Leads por origem** (Instagram, indicação, Google, tráfego pago, retorno, outros; lista editável).
- Gráficos de evolução mensal para faturamento, conversão e leads.
- Opção de **puxar automaticamente do CRM** os números de leads, agendamentos e vendas do mês, com possibilidade de corrigir manualmente.

### 5.4 Marketing

**a) Análise de conteúdo** (entregável da consultora)
- Uma análise por mês: título, mês de referência, texto formatado (negrito, listas, títulos), pontos fortes, pontos de melhoria, recomendações e anexos (PDF, imagens).
- A cliente pode comentar e marcar como "lido".

**b) Banco de referências**
- Cards com: título, tipo (**ideia de conteúdo** ou **referência**), formato (reels, carrossel, stories, post estático, live), pilar de conteúdo, link, imagem ou print, observação, tags e status (nova, aprovada, usada).
- Filtros por tipo, formato, pilar e status.
- Botão "transformar em pauta", que cria um item no cronograma a partir da referência.

**c) Cronograma de conteúdo**
- Visualização em **calendário mensal** e em **lista**.
- Campos: data, formato, pilar, tema, objetivo (atrair, nutrir, converter), roteiro ou legenda, CTA, referência vinculada, responsável e status (ideia → roteiro pronto → gravado → publicado).
- Pilares editáveis (sugestão inicial: autoridade técnica, bastidores, resultados e depoimentos, educação sobre procedimentos, conexão e pessoal, oferta).

**d) Métricas de marketing**
- Por mês: seguidores (total e ganhos), alcance, visualizações, engajamento, visitas ao perfil, cliques no link, DMs recebidas e leads vindos do Instagram.
- Gráficos de evolução e campo de comentário da consultora por mês.

### 5.5 Comercial

**a) Playbook** (entregável da consultora)
- Documento organizado em seções editáveis, como um mini-wiki. Seções iniciais sugeridas:
  - Paciente ideal (perfil)
  - Oferta e procedimentos
  - Jornada da paciente (do primeiro contato ao pós)
  - Scripts de atendimento no WhatsApp
  - Roteiro da avaliação presencial
  - Apresentação de valores e formas de pagamento
  - Quebra de objeções
  - Follow-up
- Cada seção tem texto formatado e anexos. A cliente comenta.

**b) Rotina comercial**
- Tarefas recorrentes **diárias, semanais e mensais** (ex.: "responder leads até 1h", "follow-up de orçamentos", "postar stories").
- Checklist do dia com marcação de feito.
- Histórico de cumprimento (% da rotina cumprida na semana ou no mês).

**c) CRM**
- **Kanban** com colunas: Novo lead → Em contato → Avaliação agendada → Avaliação realizada → Orçamento enviado → Fechado (ganho) → Perdido. Colunas editáveis.
- Campos da paciente/lead: nome, WhatsApp, Instagram, origem, procedimento de interesse, valor do orçamento, valor fechado, **data de aniversário**, data do procedimento, **próxima ação + data**, motivo de perda (quando perdido), indicada por (vínculo com o programa de indicação) e observações comerciais.
- Botão para abrir conversa no WhatsApp (`https://wa.me/55...`).
- Resumo do mês no topo: leads, agendamentos, vendas e valor fechado.
- Filtro por mês, origem e procedimento.
- Busca por nome.

**d) Planejamento de campanhas do ano**
- Visão dos **12 meses do ano**, com 1 ou mais campanhas por mês.
- Campos: nome, objetivo, oferta ou condição, procedimento foco, público, data de início e fim, canais, ações (lista), meta de faturamento da campanha, resultado alcançado e aprendizados.
- Sugerir como ponto de partida datas sazonais relevantes (editáveis): Dia da Mulher, Dia das Mães, Dia dos Namorados, aniversário do consultório, Black Friday, fim de ano/verão.
- Status: planejada → em andamento → concluída.

**e) Processos e funis** (entregável da consultora)
- **Funis**: nome, objetivo, etapas em ordem (cada etapa com descrição, responsável e mensagem ou ação), mostrados visualmente como uma sequência.
- **Processos**: nome, passo a passo numerado, responsável, frequência e anexos ou links.

### 5.6 Pós-venda

**a) Serviços**
- Catálogo: nome do procedimento, descrição curta, faixa de preço e **intervalo de retorno recomendado (em dias)**, preenchido pela cliente.
- A partir do CRM (pacientes fechadas + data do procedimento + intervalo), gerar a lista **"Pacientes para retorno"**: quem está perto da data de retorno, com botão de mensagem.

**b) Aniversariantes**
- Lista automática das aniversariantes do mês e da semana, puxada do CRM.
- Campo para a **campanha de aniversário** vigente (benefício, validade, regras).
- Botão "enviar mensagem" (modelo + WhatsApp) e marcação de "enviado".

**c) Programa de indicação**
- Regras do programa: benefício para quem indica, benefício para a indicada e validade.
- Registro de indicações: quem indicou (paciente do CRM), indicada (cria lead no CRM), data, status (indicada → agendou → fechou) e **recompensa entregue (sim/não)**.
- Ranking das pacientes que mais indicam.

**d) Modelos de mensagem**
- Biblioteca por categoria: boas-vindas, confirmação de avaliação, pós-procedimento, lembrete de retorno, aniversário, reativação de paciente sumida, pedido de indicação, pedido de depoimento, datas comemorativas e campanhas.
- Variáveis automáticas: `{nome}`, `{procedimento}`, `{data}`, `{beneficio}`.
- Botões **copiar** e **abrir no WhatsApp** já com o texto preenchido para a paciente escolhida.

---

## 6. Recursos gerais

- **Entregáveis da consultora**: todo item criado pela consultora nos módulos de análise, playbook, processos e funis aparece no feed "Novidades" e fica marcado como "não lido" até a cliente abrir.
- **Comentários** em análises, seções do playbook, processos, funis e campanhas.
- **Anexos** via Supabase Storage (imagens, PDF), com limite de tamanho razoável.
- **Exportar** métricas e CRM para planilha (CSV).
- Visual limpo, elegante e profissional, adequado à estética de uma clínica de harmonização: tons neutros, bastante espaço em branco e uma cor de destaque configurável por workspace. Logo da cliente nas configurações.

---

## 7. Fases de construção

Construir **uma fase por vez**, testar e publicar antes de seguir:

1. **Fase 1 — Base:** projeto Next.js + Supabase, login, workspaces, papéis, RLS, layout com menu, Configurações, **Metas** e **Métricas comerciais** + painel Início com os cards de meta.
2. **Fase 2 — Comercial:** CRM, Rotina, Playbook, Campanhas do ano, Processos e funis.
3. **Fase 3 — Marketing:** Análise de conteúdo, Banco de referências, Cronograma, Métricas de marketing.
4. **Fase 4 — Pós-venda:** Serviços e retornos, Aniversariantes, Indicação, Modelos de mensagem.
5. **Fase 5 — Acabamento:** feed de novidades, comentários, exportação CSV, ajustes de mobile, encerramento do acompanhamento.

---

## 8. Instruções para o Claude Code

- Eu **não sou programadora**: explique cada passo em linguagem simples, especialmente criar as contas no Supabase, na Vercel e no GitHub e onde colar as chaves.
- **Nunca** coloque chaves secretas no código; use variáveis de ambiente (`.env.local` e configurações da Vercel).
- Crie as tabelas com **migrations SQL** e políticas de **RLS** para cada tabela, e teste que a cliente de um workspace não enxerga outro.
- Crie um **seed** de exemplo (workspace de teste com alguns leads, métricas e mensagens) para eu visualizar antes de colocar os dados reais.
- Ao final de cada fase, me diga **o que testar** e **como publicar** a atualização.
