-- =====================================================================
-- Fase 1 — Base: perfis, workspaces, papéis, convites, metas e métricas
-- =====================================================================
-- Todas as tabelas têm RLS (Row Level Security) ativado: o próprio banco
-- garante que cada pessoa só enxerga os dados dos workspaces dos quais
-- faz parte.

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel_membro as enum ('consultora', 'cliente');
create type public.status_workspace as enum ('em_acompanhamento', 'acompanhamento_encerrado');

-- ---------------------------------------------------------------------
-- Perfis (um por usuário do Supabase Auth)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Workspaces (o espaço de cada cliente)
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  status public.status_workspace not null default 'em_acompanhamento',
  cor_destaque text not null default '#9C7A5B' check (cor_destaque ~ '^#[0-9A-Fa-f]{6}$'),
  logo_path text,
  ano_ativo int not null default extract(year from now())::int check (ano_ativo between 2000 and 2100),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.workspace_membros (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel public.papel_membro not null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on public.workspace_membros (user_id);

-- Convites: a pessoa convidada entra no workspace ao fazer login com o e-mail convidado.
create table public.convites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%@%'),
  papel public.papel_membro not null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);
create index on public.convites (email);

-- ---------------------------------------------------------------------
-- Funções de permissão
-- (security definer: consultam a tabela de membros sem cair nas próprias
--  regras de RLS, evitando recursão)
-- ---------------------------------------------------------------------
create or replace function public.meu_papel(ws uuid)
returns public.papel_membro
language sql stable security definer set search_path = public
as $$
  select papel from public.workspace_membros
  where workspace_id = ws and user_id = auth.uid();
$$;

create or replace function public.sou_membro(ws uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_membros
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

-- Quem "manda" no workspace:
--   em acompanhamento  -> consultora
--   encerrado          -> cliente
-- Pode editar configurações, membros e (nas próximas fases) os entregáveis.
create or replace function public.pode_administrar(ws uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_membros m
    join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and (
        (m.papel = 'consultora' and w.status = 'em_acompanhamento')
        or (m.papel = 'cliente' and w.status = 'acompanhamento_encerrado')
      )
  );
$$;

-- Dados operacionais (metas, métricas, CRM, rotina...):
--   cliente sempre edita; consultora edita só durante o acompanhamento.
create or replace function public.pode_editar_operacional(ws uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_membros m
    join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and (m.papel = 'cliente' or w.status = 'em_acompanhamento')
  );
$$;

-- Perfis que compartilham algum workspace comigo (para mostrar "Inserido por Bruna")
create or replace function public.compartilha_workspace(outro uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_membros a
    join public.workspace_membros b on b.workspace_id = a.workspace_id
    where a.user_id = auth.uid() and b.user_id = outro
  );
$$;

-- ---------------------------------------------------------------------
-- Auditoria: quem alterou e quando
-- ---------------------------------------------------------------------
create or replace function public.tg_auditoria()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
  else
    -- impede que alguém "reescreva" a autoria original
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.updated_at := now();
  return new;
end;
$$;

create trigger auditoria before insert or update on public.workspaces
  for each row execute function public.tg_auditoria();

-- ---------------------------------------------------------------------
-- Novo usuário -> cria perfil e aceita convites pendentes
-- ---------------------------------------------------------------------
create or replace function public.aceitar_convites_de(uid uuid, mail text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.workspace_membros (workspace_id, user_id, papel, created_by)
  select c.workspace_id, uid, c.papel, c.created_by
  from public.convites c
  where c.email = lower(trim(mail))
  on conflict (workspace_id, user_id) do nothing;

  delete from public.convites where email = lower(trim(mail));
end;
$$;
revoke all on function public.aceitar_convites_de(uuid, text) from public, anon, authenticated;

create or replace function public.tg_novo_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;

  if new.email is not null then
    perform public.aceitar_convites_de(new.id, new.email);
  end if;
  return new;
end;
$$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.tg_novo_usuario();

-- Para quem já tinha conta e foi convidada depois: chamado a cada login.
create or replace function public.aceitar_meus_convites()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  mail text;
begin
  select email into mail from auth.users where id = auth.uid();
  if mail is not null then
    perform public.aceitar_convites_de(auth.uid(), mail);
  end if;
end;
$$;

-- Criar um workspace: quem cria vira a consultora.
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

  return novo;
end;
$$;

-- ---------------------------------------------------------------------
-- Metas
-- ---------------------------------------------------------------------
create table public.metas_ciclo (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  data_inicio date not null,
  data_fim date not null,
  valor numeric(14, 2) not null default 0 check (valor >= 0),
  ativo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (data_fim >= data_inicio)
);
create index on public.metas_ciclo (workspace_id);
-- só um ciclo ativo por workspace
create unique index metas_ciclo_um_ativo on public.metas_ciclo (workspace_id) where ativo;

create table public.metas_mes (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references public.metas_ciclo (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  mes date not null check (extract(day from mes) = 1), -- sempre o dia 1 do mês
  valor numeric(14, 2) not null default 0 check (valor >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (ciclo_id, mes)
);
create index on public.metas_mes (workspace_id, mes);

-- garante que metas_mes.workspace_id é o mesmo do ciclo
create or replace function public.tg_metas_mes_workspace()
returns trigger
language plpgsql
as $$
begin
  select workspace_id into new.workspace_id from public.metas_ciclo where id = new.ciclo_id;
  return new;
end;
$$;
create trigger metas_mes_workspace before insert or update on public.metas_mes
  for each row execute function public.tg_metas_mes_workspace();

create trigger auditoria before insert or update on public.metas_ciclo
  for each row execute function public.tg_auditoria();
create trigger auditoria before insert or update on public.metas_mes
  for each row execute function public.tg_auditoria();

-- Ativar um ciclo (desativa os outros do mesmo workspace)
create or replace function public.ativar_ciclo(p_ciclo uuid)
returns void
language plpgsql security invoker set search_path = public
as $$
declare
  ws uuid;
begin
  select workspace_id into ws from public.metas_ciclo where id = p_ciclo;
  if ws is null or not public.pode_editar_operacional(ws) then
    raise exception 'Sem permissão para alterar este ciclo.';
  end if;
  update public.metas_ciclo set ativo = false where workspace_id = ws and ativo and id <> p_ciclo;
  update public.metas_ciclo set ativo = true where id = p_ciclo;
end;
$$;

-- ---------------------------------------------------------------------
-- Métricas comerciais (um registro por mês)
-- ---------------------------------------------------------------------
create table public.metricas_mensais (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  ano int not null check (ano between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  faturamento numeric(14, 2) check (faturamento >= 0),
  investimento_anuncios numeric(14, 2) check (investimento_anuncios >= 0),
  leads_novos int check (leads_novos >= 0),
  avaliacoes_agendadas int check (avaliacoes_agendadas >= 0),
  avaliacoes_realizadas int check (avaliacoes_realizadas >= 0),
  vendas_fechadas int check (vendas_fechadas >= 0),
  pacientes_retorno int check (pacientes_retorno >= 0),
  indicacoes_recebidas int check (indicacoes_recebidas >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (workspace_id, ano, mes)
);
create trigger auditoria before insert or update on public.metricas_mensais
  for each row execute function public.tg_auditoria();

-- Origens de lead (lista editável por workspace)
create table public.origens_lead (
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
create trigger auditoria before insert or update on public.origens_lead
  for each row execute function public.tg_auditoria();

create table public.metricas_leads_origem (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  origem_id uuid not null references public.origens_lead (id) on delete cascade,
  ano int not null check (ano between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  quantidade int not null default 0 check (quantidade >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (origem_id, ano, mes)
);
create index on public.metricas_leads_origem (workspace_id, ano);
create trigger auditoria before insert or update on public.metricas_leads_origem
  for each row execute function public.tg_auditoria();

-- garante que a origem pertence ao mesmo workspace
create or replace function public.tg_leads_origem_workspace()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.origens_lead where id = new.origem_id and workspace_id = new.workspace_id
  ) then
    raise exception 'Origem de lead não pertence a este workspace.';
  end if;
  return new;
end;
$$;
create trigger leads_origem_workspace before insert or update on public.metricas_leads_origem
  for each row execute function public.tg_leads_origem_workspace();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_membros enable row level security;
alter table public.convites enable row level security;
alter table public.metas_ciclo enable row level security;
alter table public.metas_mes enable row level security;
alter table public.metricas_mensais enable row level security;
alter table public.origens_lead enable row level security;
alter table public.metricas_leads_origem enable row level security;

-- profiles
create policy "ver meu perfil e de quem divide workspace comigo" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.compartilha_workspace(id));
create policy "editar meu perfil" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- workspaces (criação só pela função criar_workspace)
create policy "membros veem o workspace" on public.workspaces
  for select to authenticated using (public.sou_membro(id));
create policy "quem administra edita o workspace" on public.workspaces
  for update to authenticated
  using (public.pode_administrar(id)) with check (public.sou_membro(id));
create policy "quem administra exclui o workspace" on public.workspaces
  for delete to authenticated using (public.pode_administrar(id));

-- workspace_membros (entrada só por convite/função)
create policy "membros veem os membros" on public.workspace_membros
  for select to authenticated using (public.sou_membro(workspace_id));
create policy "quem administra remove membros, ou a pessoa sai" on public.workspace_membros
  for delete to authenticated
  using (public.pode_administrar(workspace_id) or user_id = auth.uid());

-- convites
create policy "membros veem convites" on public.convites
  for select to authenticated using (public.sou_membro(workspace_id));
create policy "quem administra convida" on public.convites
  for insert to authenticated with check (public.pode_administrar(workspace_id));
create policy "quem administra cancela convite" on public.convites
  for delete to authenticated using (public.pode_administrar(workspace_id));

-- tabelas operacionais: membros leem; quem pode editar operacional grava
do $$
declare
  t text;
begin
  foreach t in array array['metas_ciclo', 'metas_mes', 'metricas_mensais', 'metricas_leads_origem'] loop
    execute format('create policy "membros leem" on public.%I for select to authenticated using (public.sou_membro(workspace_id))', t);
    execute format('create policy "editar operacional (inserir)" on public.%I for insert to authenticated with check (public.pode_editar_operacional(workspace_id))', t);
    execute format('create policy "editar operacional (alterar)" on public.%I for update to authenticated using (public.pode_editar_operacional(workspace_id)) with check (public.pode_editar_operacional(workspace_id))', t);
    execute format('create policy "editar operacional (excluir)" on public.%I for delete to authenticated using (public.pode_editar_operacional(workspace_id))', t);
  end loop;
end $$;

-- origens de lead são configuração: quem administra edita
create policy "membros leem" on public.origens_lead
  for select to authenticated using (public.sou_membro(workspace_id));
create policy "quem administra insere" on public.origens_lead
  for insert to authenticated with check (public.pode_administrar(workspace_id));
create policy "quem administra altera" on public.origens_lead
  for update to authenticated
  using (public.pode_administrar(workspace_id)) with check (public.pode_administrar(workspace_id));
create policy "quem administra exclui" on public.origens_lead
  for delete to authenticated using (public.pode_administrar(workspace_id));

-- Permissões de execução das funções públicas
revoke execute on function public.criar_workspace(text) from public, anon;
revoke execute on function public.aceitar_meus_convites() from public, anon;
revoke execute on function public.ativar_ciclo(uuid) from public, anon;
grant execute on function public.criar_workspace(text) to authenticated;
grant execute on function public.aceitar_meus_convites() to authenticated;
grant execute on function public.ativar_ciclo(uuid) to authenticated;
