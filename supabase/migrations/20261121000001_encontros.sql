-- =====================================================================
-- Encontros: registro de cada reunião do acompanhamento (data, resumo,
-- próximos passos) e os combinados, que a cliente marca como feitos.
-- =====================================================================

create table public.encontros (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  data date not null default public.hoje_br(),
  titulo text not null check (length(trim(titulo)) > 0),
  resumo text not null default '',
  proximo_encontro date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.encontros (workspace_id, data);

create table public.encontro_combinados (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  encontro_id uuid not null references public.encontros (id) on delete cascade,
  texto text not null check (length(trim(texto)) > 0),
  responsavel text not null default 'cliente' check (responsavel in ('cliente', 'consultora', 'ambas')),
  prazo date,
  feito boolean not null default false,
  feito_em timestamptz,
  feito_por uuid references auth.users (id) on delete set null,
  ordem int not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.encontro_combinados (workspace_id, feito, prazo);
create index on public.encontro_combinados (encontro_id);

-- combinado sempre no mesmo workspace do encontro
create or replace function public.tg_combinado_workspace()
returns trigger
language plpgsql
as $$
begin
  select workspace_id into new.workspace_id from public.encontros where id = new.encontro_id;
  if new.workspace_id is null then
    raise exception 'Encontro inválido.';
  end if;
  return new;
end;
$$;
create trigger combinado_workspace before insert or update on public.encontro_combinados
  for each row execute function public.tg_combinado_workspace();

create trigger auditoria before insert or update on public.encontros
  for each row execute function public.tg_auditoria();
create trigger auditoria before insert or update on public.encontro_combinados
  for each row execute function public.tg_auditoria();

-- RLS: quem administra (consultora durante o acompanhamento) cria e edita;
-- todos os membros leem.
alter table public.encontros enable row level security;
alter table public.encontro_combinados enable row level security;
grant select, insert, update, delete on public.encontros, public.encontro_combinados to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['encontros', 'encontro_combinados'] loop
    execute format('create policy "membros leem" on public.%I for select to authenticated using (public.sou_membro(workspace_id))', t);
    execute format('create policy "quem administra insere" on public.%I for insert to authenticated with check (public.pode_administrar(workspace_id))', t);
    execute format('create policy "quem administra altera" on public.%I for update to authenticated using (public.pode_administrar(workspace_id)) with check (public.pode_administrar(workspace_id))', t);
    execute format('create policy "quem administra exclui" on public.%I for delete to authenticated using (public.pode_administrar(workspace_id))', t);
  end loop;
end $$;

-- A cliente marca um combinado como feito (sem poder mudar o texto ou o prazo)
create or replace function public.marcar_combinado(p_id uuid, p_feito boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  ws uuid;
begin
  select workspace_id into ws from public.encontro_combinados where id = p_id;
  if ws is null or not public.pode_editar_operacional(ws) then
    raise exception 'Sem permissão para marcar este combinado.';
  end if;
  update public.encontro_combinados
  set feito = p_feito,
      feito_em = case when p_feito then now() end,
      feito_por = case when p_feito then auth.uid() end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_id;
end;
$$;
revoke execute on function public.marcar_combinado(uuid, boolean) from public, anon;
grant execute on function public.marcar_combinado(uuid, boolean) to authenticated;
revoke execute on function public.tg_combinado_workspace() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Exemplo: encontros no espaço de teste
-- ---------------------------------------------------------------------
create or replace function public.exemplo_encontros(ws uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  hoje date := public.hoje_br();
  e1 uuid;
  e2 uuid;
begin
  insert into encontros (workspace_id, data, titulo, resumo, proximo_encontro) values
    (ws, hoje - 14, 'Encontro 1 · Diagnóstico',
     E'## O que conversamos\n\n- Hoje **60% dos leads** vêm do Instagram, mas só **30%** agendam.\n- A secretária responde em média depois de 3 horas.\n\n## Foco das próximas semanas\n\nResponder rápido e convidar para a avaliação.',
     hoje - 7)
  returning id into e1;
  insert into encontros (workspace_id, data, titulo, resumo, proximo_encontro) values
    (ws, hoje - 7, 'Encontro 2 · Playbook de WhatsApp',
     E'Revisamos os scripts de primeiro contato e o roteiro da avaliação.\n\n> Lembrete: não passar preço pelo WhatsApp, convidar para a avaliação.',
     hoje + 7)
  returning id into e2;

  insert into encontro_combinados (workspace_id, encontro_id, texto, responsavel, prazo, feito, feito_em, ordem) values
    (ws, e1, 'Cadastrar todos os leads do mês no CRM', 'cliente', hoje - 10, true, now() - interval '9 days', 1),
    (ws, e1, 'Enviar os números de faturamento dos últimos 6 meses', 'cliente', hoje - 8, true, now() - interval '8 days', 2),
    (ws, e1, 'Montar a análise do Instagram', 'consultora', hoje - 7, true, now() - interval '7 days', 3),
    (ws, e2, 'Usar o script de primeiro contato em todos os leads', 'cliente', hoje + 3, false, null, 1),
    (ws, e2, 'Responder os leads em até 1 hora', 'cliente', hoje - 1, false, null, 2),
    (ws, e2, 'Escrever a seção de quebra de objeções no playbook', 'consultora', hoje + 5, false, null, 3);
end;
$$;
revoke execute on function public.exemplo_encontros(uuid) from public, anon, authenticated;

-- o espaço de exemplo passa a incluir encontros
create or replace function public.criar_espaco_exemplo()
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  ws uuid;
  ciclo uuid;
  ano int := extract(year from now())::int;
  mes_atual int := extract(month from now())::int;
  m int;
  fat numeric;
  leads int;
  agend int;
  realiz int;
  vendas int;
  origem record;
  restante int;
  qtd int;
begin
  ws := public.criar_workspace('Consultório Exemplo (teste)');

  insert into public.metas_ciclo (workspace_id, nome, data_inicio, data_fim, valor, ativo, created_by)
  values (ws, 'Ciclo ' || ano, make_date(ano, 1, 1), make_date(ano, 12, 31), 600000, true, auth.uid())
  returning id into ciclo;

  for m in 1..12 loop
    insert into public.metas_mes (ciclo_id, workspace_id, mes, valor, created_by)
    values (
      ciclo, ws, make_date(ano, m, 1),
      case when m in (3, 5, 11) then 56000 else 48000 end, -- meses de campanha com meta maior (soma = 600 mil)
      auth.uid()
    );
  end loop;

  for m in 1..mes_atual loop
    leads := 60 + (m * 7) % 35;
    agend := round(leads * (0.45 + (m % 4) * 0.04));
    realiz := round(agend * (0.72 + (m % 3) * 0.05));
    vendas := round(realiz * (0.38 + (m % 5) * 0.03));
    fat := vendas * (2300 + (m % 6) * 180);

    insert into public.metricas_mensais (
      workspace_id, ano, mes, faturamento, investimento_anuncios, leads_novos,
      avaliacoes_agendadas, avaliacoes_realizadas, vendas_fechadas,
      pacientes_retorno, indicacoes_recebidas, created_by
    ) values (
      ws, ano, m, fat, 1500 + (m % 4) * 250, leads,
      agend, realiz, vendas, 4 + m % 5, 2 + m % 4, auth.uid()
    );

    restante := leads;
    for origem in
      select id, ordem from public.origens_lead where workspace_id = ws order by ordem
    loop
      qtd := case origem.ordem
        when 1 then round(leads * 0.40)
        when 2 then round(leads * 0.20)
        when 3 then round(leads * 0.10)
        when 4 then round(leads * 0.20)
        when 5 then round(leads * 0.05)
        else restante
      end;
      qtd := least(qtd, restante);
      restante := restante - qtd;
      insert into public.metricas_leads_origem (workspace_id, origem_id, ano, mes, quantidade, created_by)
      values (ws, origem.id, ano, m, qtd, auth.uid());
    end loop;
  end loop;

  perform public.completar_exemplo(ws);
  perform public.exemplo_encontros(ws);
  return ws;
end;
$$;
