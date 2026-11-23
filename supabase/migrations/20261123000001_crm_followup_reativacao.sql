-- =====================================================================
-- CRM: novas colunas "Follow-up" (depois do orçamento) e "Reativação"
-- (pacientes antigas ou perdidas que vamos tentar trazer de volta).
-- Entram no padrão dos novos espaços e nos espaços que já existem.
-- =====================================================================

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
    (ws, 'Follow-up', 6, 'outro'),
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

-- Espaços existentes: abre espaço na ordem e cria as colunas (se ainda não existirem)
do $$
declare
  w record;
  pos_followup int;
  pos_reativacao int;
begin
  for w in select id from public.workspaces loop
    if not exists (select 1 from public.crm_colunas where workspace_id = w.id and lower(nome) in ('follow-up', 'follow up', 'followup')) then
      -- logo antes da primeira coluna de "ganho" (ou no fim)
      select coalesce(min(ordem), (select coalesce(max(ordem), 0) + 1 from public.crm_colunas where workspace_id = w.id))
        into pos_followup
        from public.crm_colunas where workspace_id = w.id and tipo = 'ganho';
      update public.crm_colunas set ordem = ordem + 1 where workspace_id = w.id and ordem >= pos_followup;
      insert into public.crm_colunas (workspace_id, nome, ordem, tipo) values (w.id, 'Follow-up', pos_followup, 'outro');
    end if;
    if not exists (select 1 from public.crm_colunas where workspace_id = w.id and lower(nome) in ('reativação', 'reativacao')) then
      select coalesce(max(ordem), 0) + 1 into pos_reativacao from public.crm_colunas where workspace_id = w.id;
      insert into public.crm_colunas (workspace_id, nome, ordem, tipo) values (w.id, 'Reativação', pos_reativacao, 'outro');
    end if;
  end loop;
end $$;
