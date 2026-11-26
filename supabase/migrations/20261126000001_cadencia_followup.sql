-- =====================================================================
-- Cadência de follow-up: 6 follow-ups por paciente (dias 2, 5, 7, 10, 15
-- e 30 a partir do início do follow-up). A cadência começa sozinha quando a
-- paciente entra numa coluna do tipo "followup", ou manualmente.
-- =====================================================================

alter table public.crm_colunas drop constraint crm_colunas_tipo_check;
alter table public.crm_colunas add constraint crm_colunas_tipo_check
  check (tipo in ('novo', 'contato', 'agendada', 'realizada', 'orcamento', 'followup', 'ganho', 'perdido', 'outro'));

-- colunas "Follow-up" já existentes passam a iniciar a cadência
update public.crm_colunas set tipo = 'followup'
where tipo = 'outro' and lower(nome) in ('follow-up', 'follow up', 'followup');

alter table public.leads add column followup_inicio date;

-- quem já está numa coluna de follow-up começa a cadência hoje
update public.leads l set followup_inicio = public.hoje_br()
from public.crm_colunas c
where c.id = l.coluna_id and c.tipo = 'followup' and l.followup_inicio is null;

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
    if t = 'followup' then
      new.followup_inicio := coalesce(new.followup_inicio, public.hoje_br());
    end if;
  end if;
  return new;
end;
$$;

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
    (ws, 'Follow-up', 6, 'followup'),
    (ws, 'Fechado (ganho)', 7, 'ganho'),
    (ws, 'Perdido', 8, 'perdido'),
    (ws, 'Reativação', 9, 'outro');

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

-- Follow-ups feitos (uma linha por follow-up marcado)
create table public.lead_followups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  etapa int not null check (etapa between 1 and 6),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (lead_id, etapa)
);
create index on public.lead_followups (workspace_id, lead_id);

-- sempre no mesmo workspace da paciente
create or replace function public.tg_followup_workspace()
returns trigger
language plpgsql
as $$
begin
  select workspace_id into new.workspace_id from public.leads where id = new.lead_id;
  if new.workspace_id is null then
    raise exception 'Paciente inválida.';
  end if;
  return new;
end;
$$;
create trigger followup_workspace before insert or update on public.lead_followups
  for each row execute function public.tg_followup_workspace();
create trigger auditoria before insert or update on public.lead_followups
  for each row execute function public.tg_auditoria();
revoke execute on function public.tg_followup_workspace() from public, anon, authenticated;

alter table public.lead_followups enable row level security;
grant select, insert, delete on public.lead_followups to authenticated;
create policy "membros leem" on public.lead_followups
  for select to authenticated using (public.sou_membro(workspace_id));
create policy "editar operacional (inserir)" on public.lead_followups
  for insert to authenticated with check (public.pode_editar_operacional(workspace_id));
create policy "editar operacional (excluir)" on public.lead_followups
  for delete to authenticated using (public.pode_editar_operacional(workspace_id));
