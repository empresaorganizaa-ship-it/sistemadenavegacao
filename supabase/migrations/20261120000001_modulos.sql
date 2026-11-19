-- =====================================================================
-- Fases 2 a 5: Comercial, Marketing, Pós-venda, cronograma do
-- acompanhamento, comentários, anexos e leituras (novidades).
-- Mesmo padrão da Fase 1: workspace_id, auditoria, RLS e permissões
-- explícitas.
-- =====================================================================

create or replace function public.hoje_br()
returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- ---------------------------------------------------------------------
-- Pós-venda: serviços (catálogo de procedimentos)
-- ---------------------------------------------------------------------
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  descricao text,
  preco_min numeric(14, 2) check (preco_min >= 0),
  preco_max numeric(14, 2) check (preco_max >= 0),
  intervalo_retorno_dias int check (intervalo_retorno_dias > 0),
  ativo boolean not null default true,
  ordem int not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.servicos (workspace_id);

-- ---------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------
create table public.crm_colunas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  ordem int not null default 0,
  -- o "tipo" diz o que a coluna significa, para os números automáticos
  tipo text not null default 'outro'
    check (tipo in ('novo', 'contato', 'agendada', 'realizada', 'orcamento', 'ganho', 'perdido', 'outro')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.crm_colunas (workspace_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  coluna_id uuid references public.crm_colunas (id) on delete set null,
  nome text not null check (length(trim(nome)) > 0),
  whatsapp text,
  instagram text,
  origem_id uuid references public.origens_lead (id) on delete set null,
  servico_id uuid references public.servicos (id) on delete set null,
  procedimento_texto text,
  valor_orcamento numeric(14, 2) check (valor_orcamento >= 0),
  valor_fechado numeric(14, 2) check (valor_fechado >= 0),
  aniversario date,
  data_procedimento date,
  proxima_acao text,
  proxima_acao_data date,
  motivo_perda text,
  indicada_por uuid references public.leads (id) on delete set null,
  observacoes text,
  data_entrada date not null default public.hoje_br(),
  agendado_em date,
  avaliado_em date,
  fechado_em date,
  perdido_em date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.leads (workspace_id, coluna_id);
create index on public.leads (workspace_id, data_entrada);
create index on public.leads (workspace_id, proxima_acao_data);

-- Ao mudar de coluna, registra as datas das etapas (para os números do mês)
create or replace function public.tg_leads_etapa()
returns trigger
language plpgsql
as $$
declare
  t text;
begin
  if new.coluna_id is not null then
    select tipo into t from public.crm_colunas where id = new.coluna_id and workspace_id = new.workspace_id;
    if not found then
      raise exception 'Coluna do CRM inválida.';
    end if;
  end if;
  if new.indicada_por is not null and not exists (
    select 1 from public.leads where id = new.indicada_por and workspace_id = new.workspace_id
  ) then
    raise exception 'Indicação inválida.';
  end if;

  if tg_op = 'INSERT' or new.coluna_id is distinct from old.coluna_id then
    if t in ('agendada', 'realizada', 'orcamento', 'ganho') then
      new.agendado_em := coalesce(new.agendado_em, public.hoje_br());
    end if;
    if t in ('realizada', 'orcamento', 'ganho') then
      new.avaliado_em := coalesce(new.avaliado_em, public.hoje_br());
    end if;
    if t = 'ganho' then
      new.fechado_em := coalesce(new.fechado_em, public.hoje_br());
    end if;
    if t = 'perdido' then
      new.perdido_em := coalesce(new.perdido_em, public.hoje_br());
    end if;
  end if;
  return new;
end;
$$;
create trigger leads_etapa before insert or update on public.leads
  for each row execute function public.tg_leads_etapa();

-- ---------------------------------------------------------------------
-- Rotina comercial
-- ---------------------------------------------------------------------
create table public.rotina_tarefas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  descricao text,
  frequencia text not null check (frequencia in ('diaria', 'semanal', 'mensal')),
  ordem int not null default 0,
  ativo boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.rotina_tarefas (workspace_id);

-- periodo: o dia (diária), a segunda-feira da semana (semanal) ou o dia 1 (mensal)
create table public.rotina_registros (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  tarefa_id uuid not null references public.rotina_tarefas (id) on delete cascade,
  periodo date not null,
  feito boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (tarefa_id, periodo)
);
create index on public.rotina_registros (workspace_id, periodo);

-- ---------------------------------------------------------------------
-- Entregáveis da consultora: playbook, funis, processos, análises
-- ---------------------------------------------------------------------
create table public.playbook_secoes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  ordem int not null default 0,
  conteudo text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.playbook_secoes (workspace_id);

create table public.funis (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  objetivo text,
  -- lista de etapas: [{titulo, descricao, responsavel, acao}]
  etapas jsonb not null default '[]'::jsonb check (jsonb_typeof(etapas) = 'array'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.funis (workspace_id);

create table public.processos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  passos text[] not null default '{}',
  responsavel text,
  frequencia text,
  links text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.processos (workspace_id);

create table public.analises_conteudo (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  mes_ref date not null check (extract(day from mes_ref) = 1),
  texto text not null default '',
  pontos_fortes text not null default '',
  pontos_melhoria text not null default '',
  recomendacoes text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.analises_conteudo (workspace_id, mes_ref);

-- ---------------------------------------------------------------------
-- Campanhas do ano
-- ---------------------------------------------------------------------
create table public.campanhas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  objetivo text,
  oferta text,
  procedimento_foco text,
  publico text,
  data_inicio date not null,
  data_fim date not null,
  canais text[] not null default '{}',
  acoes text[] not null default '{}',
  meta_faturamento numeric(14, 2) check (meta_faturamento >= 0),
  resultado_alcancado numeric(14, 2) check (resultado_alcancado >= 0),
  aprendizados text,
  status text not null default 'planejada' check (status in ('planejada', 'andamento', 'concluida')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (data_fim >= data_inicio)
);
create index on public.campanhas (workspace_id, data_inicio);

-- ---------------------------------------------------------------------
-- Marketing: pilares, referências, cronograma, métricas
-- ---------------------------------------------------------------------
create table public.pilares_conteudo (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  ordem int not null default 0,
  ativo boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (workspace_id, nome)
);

create table public.referencias (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  tipo text not null default 'ideia' check (tipo in ('ideia', 'referencia')),
  formato text check (formato in ('reels', 'carrossel', 'stories', 'post', 'live')),
  pilar_id uuid references public.pilares_conteudo (id) on delete set null,
  link text,
  imagem_path text,
  observacao text,
  tags text[] not null default '{}',
  status text not null default 'nova' check (status in ('nova', 'aprovada', 'usada')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.referencias (workspace_id);

create table public.conteudos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  data date not null,
  formato text check (formato in ('reels', 'carrossel', 'stories', 'post', 'live')),
  pilar_id uuid references public.pilares_conteudo (id) on delete set null,
  tema text not null check (length(trim(tema)) > 0),
  objetivo text check (objetivo in ('atrair', 'nutrir', 'converter')),
  roteiro text,
  cta text,
  referencia_id uuid references public.referencias (id) on delete set null,
  responsavel text,
  status text not null default 'ideia' check (status in ('ideia', 'roteiro', 'gravado', 'publicado')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.conteudos (workspace_id, data);

create table public.metricas_marketing (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  ano int not null check (ano between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  seguidores_total int check (seguidores_total >= 0),
  seguidores_ganhos int,
  alcance int check (alcance >= 0),
  visualizacoes int check (visualizacoes >= 0),
  engajamento int check (engajamento >= 0),
  visitas_perfil int check (visitas_perfil >= 0),
  cliques_link int check (cliques_link >= 0),
  dms int check (dms >= 0),
  leads_instagram int check (leads_instagram >= 0),
  comentario text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (workspace_id, ano, mes)
);

create table public.metricas_procedimento (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  servico_id uuid not null references public.servicos (id) on delete cascade,
  ano int not null check (ano between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  valor numeric(14, 2) not null default 0 check (valor >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (servico_id, ano, mes)
);
create index on public.metricas_procedimento (workspace_id, ano);

-- ---------------------------------------------------------------------
-- Pós-venda: configuração, aniversários, indicações, mensagens
-- ---------------------------------------------------------------------
create table public.posvenda_config (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  aniv_beneficio text,
  aniv_validade text,
  aniv_regras text,
  ind_beneficio_indicadora text,
  ind_beneficio_indicada text,
  ind_validade text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.aniversario_envios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  ano int not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (lead_id, ano)
);

create table public.indicacoes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  indicadora_id uuid not null references public.leads (id) on delete cascade,
  indicada_id uuid references public.leads (id) on delete set null,
  data date not null default public.hoje_br(),
  status text not null default 'indicada' check (status in ('indicada', 'agendou', 'fechou')),
  recompensa_entregue boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.indicacoes (workspace_id);

create table public.mensagens_modelos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  categoria text not null check (categoria in (
    'boas_vindas', 'confirmacao', 'pos_procedimento', 'retorno', 'aniversario',
    'reativacao', 'pedido_indicacao', 'pedido_depoimento', 'datas_campanhas')),
  titulo text not null check (length(trim(titulo)) > 0),
  texto text not null default '',
  ordem int not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.mensagens_modelos (workspace_id);

-- ---------------------------------------------------------------------
-- Cronograma do acompanhamento (aparece no Início)
-- ---------------------------------------------------------------------
create table public.etapas_acompanhamento (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  descricao text,
  data_inicio date,
  data_fim date,
  status text not null default 'proxima' check (status in ('proxima', 'andamento', 'concluida')),
  ordem int not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.etapas_acompanhamento (workspace_id);

-- ---------------------------------------------------------------------
-- Comentários, anexos e leituras (genéricos: valem para qualquer item)
-- ---------------------------------------------------------------------
create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entidade text not null,
  registro_id uuid not null,
  texto text not null check (length(trim(texto)) > 0),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.comentarios (workspace_id, entidade, registro_id);

create table public.anexos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entidade text not null,
  registro_id uuid not null,
  nome text not null,
  caminho text not null,
  tipo text,
  tamanho bigint,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.anexos (workspace_id, entidade, registro_id);

create table public.leituras (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entidade text not null,
  registro_id uuid not null,
  lido_em timestamptz not null default now(),
  primary key (user_id, entidade, registro_id)
);

-- ---------------------------------------------------------------------
-- Auditoria em todas as tabelas novas
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'servicos', 'crm_colunas', 'leads', 'rotina_tarefas', 'rotina_registros', 'playbook_secoes',
    'funis', 'processos', 'analises_conteudo', 'campanhas', 'pilares_conteudo', 'referencias',
    'conteudos', 'metricas_marketing', 'metricas_procedimento', 'posvenda_config',
    'aniversario_envios', 'indicacoes', 'mensagens_modelos', 'etapas_acompanhamento',
    'comentarios', 'anexos'
  ] loop
    execute format('create trigger auditoria before insert or update on public.%I for each row execute function public.tg_auditoria()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- RLS e permissões
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  -- Dados do dia a dia: cliente sempre edita; consultora durante o acompanhamento
  foreach t in array array[
    'servicos', 'leads', 'rotina_tarefas', 'rotina_registros', 'campanhas', 'referencias',
    'conteudos', 'metricas_marketing', 'metricas_procedimento', 'posvenda_config',
    'aniversario_envios', 'indicacoes', 'mensagens_modelos'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "membros leem" on public.%I for select to authenticated using (public.sou_membro(workspace_id))', t);
    execute format('create policy "editar operacional (inserir)" on public.%I for insert to authenticated with check (public.pode_editar_operacional(workspace_id))', t);
    execute format('create policy "editar operacional (alterar)" on public.%I for update to authenticated using (public.pode_editar_operacional(workspace_id)) with check (public.pode_editar_operacional(workspace_id))', t);
    execute format('create policy "editar operacional (excluir)" on public.%I for delete to authenticated using (public.pode_editar_operacional(workspace_id))', t);
  end loop;

  -- Entregáveis e configurações: só quem administra (consultora durante; cliente depois)
  foreach t in array array[
    'crm_colunas', 'playbook_secoes', 'funis', 'processos', 'analises_conteudo',
    'pilares_conteudo', 'etapas_acompanhamento'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "membros leem" on public.%I for select to authenticated using (public.sou_membro(workspace_id))', t);
    execute format('create policy "quem administra insere" on public.%I for insert to authenticated with check (public.pode_administrar(workspace_id))', t);
    execute format('create policy "quem administra altera" on public.%I for update to authenticated using (public.pode_administrar(workspace_id)) with check (public.pode_administrar(workspace_id))', t);
    execute format('create policy "quem administra exclui" on public.%I for delete to authenticated using (public.pode_administrar(workspace_id))', t);
  end loop;
end $$;

-- Comentários: qualquer membro comenta (inclusive a consultora após encerrar);
-- cada pessoa edita/apaga os seus; quem administra também apaga.
alter table public.comentarios enable row level security;
grant select, insert, update, delete on public.comentarios to authenticated;
create policy "membros leem" on public.comentarios
  for select to authenticated using (public.sou_membro(workspace_id));
create policy "membros comentam" on public.comentarios
  for insert to authenticated with check (public.sou_membro(workspace_id) and created_by = auth.uid());
create policy "autora edita" on public.comentarios
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "autora ou quem administra apaga" on public.comentarios
  for delete to authenticated using (created_by = auth.uid() or public.pode_administrar(workspace_id));

-- Anexos
alter table public.anexos enable row level security;
grant select, insert, delete on public.anexos to authenticated;
create policy "membros leem" on public.anexos
  for select to authenticated using (public.sou_membro(workspace_id));
create policy "quem edita anexa" on public.anexos
  for insert to authenticated with check (public.pode_editar_operacional(workspace_id));
create policy "autora ou quem administra apaga" on public.anexos
  for delete to authenticated
  using ((created_by = auth.uid() and public.pode_editar_operacional(workspace_id)) or public.pode_administrar(workspace_id));

-- Leituras: cada pessoa vê e marca só as próprias
alter table public.leituras enable row level security;
grant select, insert, update, delete on public.leituras to authenticated;
create policy "minhas leituras" on public.leituras
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.sou_membro(workspace_id));

-- Storage: anexos (privado, 10 MB, imagens e PDF)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos', 'anexos', false, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do nothing;

create policy "anexos: membros veem" on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and public.sou_membro(public.workspace_da_pasta(name)));
create policy "anexos: quem edita envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and public.pode_editar_operacional(public.workspace_da_pasta(name)));
create policy "anexos: quem edita apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos' and public.pode_editar_operacional(public.workspace_da_pasta(name)));

revoke execute on function public.tg_leads_etapa() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Conteúdo inicial de cada workspace (colunas, pilares, playbook,
-- mensagens, rotina)
-- ---------------------------------------------------------------------
create or replace function public.semear_workspace(ws uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.crm_colunas where workspace_id = ws) then
    return; -- já semeado
  end if;

  insert into public.crm_colunas (workspace_id, nome, ordem, tipo) values
    (ws, 'Novo lead', 1, 'novo'),
    (ws, 'Em contato', 2, 'contato'),
    (ws, 'Avaliação agendada', 3, 'agendada'),
    (ws, 'Avaliação realizada', 4, 'realizada'),
    (ws, 'Orçamento enviado', 5, 'orcamento'),
    (ws, 'Fechado (ganho)', 6, 'ganho'),
    (ws, 'Perdido', 7, 'perdido');

  insert into public.pilares_conteudo (workspace_id, nome, ordem) values
    (ws, 'Autoridade técnica', 1),
    (ws, 'Bastidores', 2),
    (ws, 'Resultados e depoimentos', 3),
    (ws, 'Educação sobre procedimentos', 4),
    (ws, 'Conexão e pessoal', 5),
    (ws, 'Oferta', 6);

  insert into public.playbook_secoes (workspace_id, titulo, ordem, conteudo) values
    (ws, 'Paciente ideal', 1, ''),
    (ws, 'Oferta e procedimentos', 2, ''),
    (ws, 'Jornada da paciente', 3, ''),
    (ws, 'Scripts de atendimento no WhatsApp', 4, ''),
    (ws, 'Roteiro da avaliação presencial', 5, ''),
    (ws, 'Apresentação de valores e formas de pagamento', 6, ''),
    (ws, 'Quebra de objeções', 7, ''),
    (ws, 'Follow-up', 8, '');

  insert into public.posvenda_config (workspace_id) values (ws) on conflict do nothing;

  insert into public.rotina_tarefas (workspace_id, titulo, frequencia, ordem) values
    (ws, 'Responder todos os leads em até 1 hora', 'diaria', 1),
    (ws, 'Fazer follow-up dos orçamentos em aberto', 'diaria', 2),
    (ws, 'Postar stories', 'diaria', 3),
    (ws, 'Confirmar as avaliações do dia seguinte', 'diaria', 4),
    (ws, 'Atualizar o CRM', 'semanal', 5),
    (ws, 'Enviar mensagens de aniversário da semana', 'semanal', 6),
    (ws, 'Contatar pacientes para retorno', 'semanal', 7),
    (ws, 'Preencher as métricas do mês', 'mensal', 8);

  insert into public.mensagens_modelos (workspace_id, categoria, titulo, texto, ordem) values
    (ws, 'boas_vindas', 'Primeiro contato',
     'Oi, {nome}! Que bom ter você por aqui 💛 Sou da equipe da clínica. Me conta: o que você gostaria de melhorar ou realçar?', 1),
    (ws, 'confirmacao', 'Confirmação da avaliação',
     'Oi, {nome}! Passando para confirmar sua avaliação no dia {data}. Podemos contar com você? Qualquer imprevisto, é só me avisar por aqui.', 2),
    (ws, 'pos_procedimento', 'Cuidados após o procedimento',
     'Oi, {nome}! Como você está se sentindo depois do seu {procedimento}? Lembre-se dos cuidados que conversamos. Qualquer dúvida, estou à disposição.', 3),
    (ws, 'retorno', 'Lembrete de retorno',
     'Oi, {nome}! Já está chegando a hora do retorno do seu {procedimento}. Vamos agendar para manter o resultado lindo? Tenho horários a partir de {data}.', 4),
    (ws, 'aniversario', 'Feliz aniversário',
     'Feliz aniversário, {nome}! 🎉 Para comemorar, preparamos um presente: {beneficio}. Vamos agendar?', 5),
    (ws, 'reativacao', 'Paciente sumida',
     'Oi, {nome}! Sentimos sua falta por aqui. Que tal agendarmos uma avaliação para ver como estão os resultados do seu {procedimento}?', 6),
    (ws, 'pedido_indicacao', 'Pedido de indicação',
     'Oi, {nome}! Fico muito feliz que você amou o resultado. Se tiver uma amiga que também gostaria de se cuidar, indique para nós: {beneficio}.', 7),
    (ws, 'pedido_depoimento', 'Pedido de depoimento',
     'Oi, {nome}! Seu depoimento ajuda outras mulheres a darem o primeiro passo. Pode me contar em poucas palavras como foi sua experiência com o {procedimento}?', 8),
    (ws, 'datas_campanhas', 'Campanha especial',
     'Oi, {nome}! Temos uma condição especial neste mês: {beneficio}. Quer que eu reserve um horário para você?', 9);
end;
$$;
revoke execute on function public.semear_workspace(uuid) from public, anon, authenticated;

-- criar_workspace passa a semear o conteúdo inicial
create or replace function public.criar_workspace(p_nome text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  novo uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logada.';
  end if;

  insert into public.workspaces (nome, created_by) values (trim(p_nome), auth.uid())
  returning id into novo;

  insert into public.workspace_membros (workspace_id, user_id, papel, created_by)
  values (novo, auth.uid(), 'consultora', auth.uid());

  insert into public.origens_lead (workspace_id, nome, ordem, created_by)
  select novo, o.nome, o.ordem, auth.uid()
  from (values ('Instagram', 1), ('Indicação', 2), ('Google', 3),
               ('Tráfego pago', 4), ('Retorno', 5), ('Outros', 6)) as o(nome, ordem);

  perform public.semear_workspace(novo);
  return novo;
end;
$$;

-- workspaces que já existem também recebem o conteúdo inicial
select public.semear_workspace(id) from public.workspaces;
