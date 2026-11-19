-- =====================================================================
-- Dados de exemplo dos novos módulos (CRM, rotina, marketing, pós-venda,
-- entregáveis e cronograma do acompanhamento).
-- =====================================================================

create or replace function public.completar_exemplo(ws uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  hoje date := public.hoje_br();
  ano int := extract(year from public.hoje_br())::int;
  mes_atual int := extract(month from public.hoje_br())::int;
  s_toxina uuid; s_labial uuid; s_bio uuid; s_hof uuid; s_skin uuid;
  c record;
  o_insta uuid; o_ind uuid; o_trafego uuid; o_google uuid;
  p_aut uuid; p_res uuid; p_edu uuid; p_bast uuid;
  l_mariana uuid; l_carla uuid; l_julia uuid; ref1 uuid;
  m int;
begin
  -- serviços
  insert into servicos (workspace_id, nome, descricao, preco_min, preco_max, intervalo_retorno_dias, ordem) values
    (ws, 'Toxina botulínica', 'Suaviza linhas de expressão', 1200, 1800, 120, 1) returning id into s_toxina;
  insert into servicos (workspace_id, nome, descricao, preco_min, preco_max, intervalo_retorno_dias, ordem) values
    (ws, 'Preenchimento labial', 'Volume e contorno dos lábios', 1500, 2200, 270, 2) returning id into s_labial;
  insert into servicos (workspace_id, nome, descricao, preco_min, preco_max, intervalo_retorno_dias, ordem) values
    (ws, 'Bioestimulador de colágeno', 'Firmeza e qualidade da pele', 2500, 3800, 90, 3) returning id into s_bio;
  insert into servicos (workspace_id, nome, descricao, preco_min, preco_max, intervalo_retorno_dias, ordem) values
    (ws, 'Harmonização facial completa', 'Planejamento facial global', 6000, 12000, 180, 4) returning id into s_hof;
  insert into servicos (workspace_id, nome, descricao, preco_min, preco_max, intervalo_retorno_dias, ordem) values
    (ws, 'Skinbooster', 'Hidratação profunda', 900, 1400, 60, 5) returning id into s_skin;

  select id into o_insta from origens_lead where workspace_id = ws and nome = 'Instagram';
  select id into o_ind from origens_lead where workspace_id = ws and nome = 'Indicação';
  select id into o_trafego from origens_lead where workspace_id = ws and nome = 'Tráfego pago';
  select id into o_google from origens_lead where workspace_id = ws and nome = 'Google';

  -- leads em todas as colunas
  for c in select id, tipo from crm_colunas where workspace_id = ws loop
    if c.tipo = 'novo' then
      insert into leads (workspace_id, coluna_id, nome, whatsapp, instagram, origem_id, servico_id, data_entrada, proxima_acao, proxima_acao_data, aniversario) values
        (ws, c.id, 'Fernanda Lima', '11987650001', '@fe.lima', o_insta, s_labial, hoje, 'Responder DM e enviar boas-vindas', hoje, make_date(1990, extract(month from hoje)::int, least(28, extract(day from hoje)::int + 2))),
        (ws, c.id, 'Patrícia Gomes', '11987650002', null, o_trafego, s_toxina, hoje - 1, 'Ligar para entender a necessidade', hoje, null);
    elsif c.tipo = 'contato' then
      insert into leads (workspace_id, coluna_id, nome, whatsapp, origem_id, servico_id, data_entrada, proxima_acao, proxima_acao_data) values
        (ws, c.id, 'Renata Alves', '11987650003', o_google, s_bio, hoje - 3, 'Enviar horários de avaliação', hoje + 1);
    elsif c.tipo = 'agendada' then
      insert into leads (workspace_id, coluna_id, nome, whatsapp, origem_id, servico_id, data_entrada, proxima_acao, proxima_acao_data, aniversario) values
        (ws, c.id, 'Beatriz Costa', '11987650004', o_insta, s_hof, hoje - 6, 'Confirmar avaliação', hoje + 2, make_date(1988, 3, 14)),
        (ws, c.id, 'Luana Martins', '11987650005', o_trafego, s_toxina, hoje - 4, 'Confirmar avaliação', hoje + 3, null);
    elsif c.tipo = 'realizada' then
      insert into leads (workspace_id, coluna_id, nome, whatsapp, origem_id, servico_id, valor_orcamento, data_entrada, proxima_acao, proxima_acao_data) values
        (ws, c.id, 'Camila Rocha', '11987650006', o_insta, s_bio, 3200, hoje - 10, 'Enviar orçamento detalhado', hoje);
    elsif c.tipo = 'orcamento' then
      insert into leads (workspace_id, coluna_id, nome, whatsapp, origem_id, servico_id, valor_orcamento, data_entrada, proxima_acao, proxima_acao_data) values
        (ws, c.id, 'Aline Souza', '11987650007', o_google, s_hof, 8500, hoje - 12, 'Follow-up do orçamento', hoje - 1);
    elsif c.tipo = 'ganho' then
      insert into leads (workspace_id, coluna_id, nome, whatsapp, instagram, origem_id, servico_id, valor_orcamento, valor_fechado, data_entrada, data_procedimento, aniversario) values
        (ws, c.id, 'Mariana Duarte', '11987650008', '@mari.duarte', o_insta, s_toxina, 1500, 1500, hoje - 130, hoje - 115, make_date(1992, extract(month from hoje)::int, greatest(1, extract(day from hoje)::int - 1)))
        returning id into l_mariana;
      insert into leads (workspace_id, coluna_id, nome, whatsapp, origem_id, servico_id, valor_orcamento, valor_fechado, data_entrada, data_procedimento, indicada_por) values
        (ws, c.id, 'Carla Mendes', '11987650009', o_ind, s_skin, 1200, 1100, hoje - 70, hoje - 55, l_mariana)
        returning id into l_carla;
      insert into leads (workspace_id, coluna_id, nome, whatsapp, origem_id, servico_id, valor_orcamento, valor_fechado, data_entrada, data_procedimento, aniversario) values
        (ws, c.id, 'Júlia Ferreira', '11987650010', o_trafego, s_bio, 3500, 3300, hoje - 40, hoje - 30, make_date(1985, 12, 5))
        returning id into l_julia;
      insert into leads (workspace_id, coluna_id, nome, whatsapp, origem_id, servico_id, valor_fechado, data_entrada, data_procedimento, indicada_por) values
        (ws, c.id, 'Sofia Ribeiro', '11987650011', o_ind, s_labial, 1900, hoje - 20, hoje - 8, l_mariana);
    elsif c.tipo = 'perdido' then
      insert into leads (workspace_id, coluna_id, nome, whatsapp, origem_id, servico_id, valor_orcamento, data_entrada, motivo_perda) values
        (ws, c.id, 'Tatiane Nunes', '11987650012', o_trafego, s_hof, 9000, hoje - 25, 'Achou o valor alto; vai juntar e retornar no próximo semestre');
    end if;
  end loop;

  -- datas de fechamento realistas
  update leads set fechado_em = data_procedimento, avaliado_em = data_procedimento, agendado_em = data_procedimento - 5
  where workspace_id = ws and data_procedimento is not null;

  insert into indicacoes (workspace_id, indicadora_id, indicada_id, data, status, recompensa_entregue)
  select ws, l_mariana, id, data_entrada, 'fechou', nome = 'Carla Mendes'
  from leads where workspace_id = ws and indicada_por = l_mariana;

  update posvenda_config set
    aniv_beneficio = 'Skinbooster com 30% de desconto',
    aniv_validade = 'Até 30 dias após o aniversário',
    aniv_regras = 'Válido para pacientes que já realizaram algum procedimento. Não cumulativo.',
    ind_beneficio_indicadora = 'R$ 200 de crédito no próximo procedimento',
    ind_beneficio_indicada = '10% de desconto no primeiro procedimento',
    ind_validade = '90 dias'
  where workspace_id = ws;

  -- cronograma do acompanhamento
  insert into etapas_acompanhamento (workspace_id, titulo, descricao, data_inicio, data_fim, status, ordem) values
    (ws, 'Diagnóstico comercial', 'Entrevista, análise dos números e do Instagram.', hoje - 60, hoje - 46, 'concluida', 1),
    (ws, 'Metas e indicadores', 'Definição da meta do ciclo e dos números acompanhados.', hoje - 45, hoje - 31, 'concluida', 2),
    (ws, 'Playbook comercial', 'Scripts de WhatsApp, roteiro da avaliação e quebra de objeções.', hoje - 30, hoje + 5, 'andamento', 3),
    (ws, 'Processos e funis', 'Funil de atendimento e rotina comercial da equipe.', hoje + 6, hoje + 30, 'proxima', 4),
    (ws, 'Pós-venda e indicação', 'Retornos, aniversariantes e programa de indicação.', hoje + 31, hoje + 60, 'proxima', 5),
    (ws, 'Encerramento', 'Revisão dos resultados e plano para seguir sozinha.', hoje + 61, hoje + 75, 'proxima', 6);

  -- entregáveis
  update playbook_secoes set conteudo =
    E'## Quem é a nossa paciente\n\n- Mulher de **30 a 55 anos**, rotina corrida, valoriza naturalidade.\n- Já pesquisou bastante no Instagram antes de chamar.\n- Tem medo de ficar "artificial".\n\n## O que ela quer ouvir\n\n1. Que o resultado será **natural**.\n2. Que a doutora é especialista e cuidadosa.\n3. Que existe acompanhamento depois.'
  where workspace_id = ws and ordem = 1;
  update playbook_secoes set conteudo =
    E'## Primeira resposta (até 1 hora)\n\n> Oi, {nome}! Que bom te ver por aqui 💛 Me conta: o que você gostaria de melhorar?\n\n## Depois que ela responder\n\n- Mostre que entendeu a dor dela.\n- **Convide para a avaliação**: não passe preço pelo WhatsApp.'
  where workspace_id = ws and ordem = 4;

  insert into funis (workspace_id, nome, objetivo, etapas) values
    (ws, 'Funil do Instagram à avaliação', 'Transformar seguidoras em avaliações agendadas',
     jsonb_build_array(
       jsonb_build_object('titulo', 'Conteúdo', 'descricao', 'Reels de educação e resultados', 'responsavel', 'Doutora', 'acao', 'CTA: "me chama no direct"'),
       jsonb_build_object('titulo', 'Direct', 'descricao', 'Resposta em até 1 hora', 'responsavel', 'Secretária', 'acao', 'Mensagem de boas-vindas'),
       jsonb_build_object('titulo', 'WhatsApp', 'descricao', 'Entender a necessidade', 'responsavel', 'Secretária', 'acao', 'Script de qualificação'),
       jsonb_build_object('titulo', 'Avaliação', 'descricao', 'Consulta presencial', 'responsavel', 'Doutora', 'acao', 'Roteiro da avaliação'),
       jsonb_build_object('titulo', 'Fechamento', 'descricao', 'Apresentação de valores', 'responsavel', 'Doutora', 'acao', 'Formas de pagamento')
     ));

  insert into processos (workspace_id, nome, passos, responsavel, frequencia) values
    (ws, 'Confirmação de avaliações',
     array['Abrir o CRM na coluna "Avaliação agendada"', 'Enviar o modelo "Confirmação da avaliação" para quem tem avaliação amanhã', 'Marcar como confirmada nas observações', 'Quem não responder até 18h: ligar'],
     'Secretária', 'Diária');

  insert into analises_conteudo (workspace_id, titulo, mes_ref, texto, pontos_fortes, pontos_melhoria, recomendacoes) values
    (ws, 'Análise de conteúdo', make_date(ano, mes_atual, 1),
     E'Análise dos conteúdos publicados no mês, com foco em **atração** e **conversão**.',
     E'- Reels de antes e depois tiveram o maior alcance\n- Stories de bastidores geraram muitas respostas',
     E'- Poucos CTAs claros para agendar\n- Frequência irregular no feed',
     E'1. Publicar **3 reels por semana**\n2. Usar CTA "me chama no direct" em todos os posts\n3. Criar destaque de dúvidas frequentes');

  -- campanhas sazonais do ano
  insert into campanhas (workspace_id, nome, objetivo, oferta, procedimento_foco, data_inicio, data_fim, canais, acoes, meta_faturamento, status) values
    (ws, 'Dia da Mulher', 'Atrair novas pacientes', 'Avaliação cortesia', 'Toxina botulínica', make_date(ano, 3, 1), make_date(ano, 3, 10), array['Instagram', 'WhatsApp'], array['Reels com depoimentos', 'Lista de transmissão'], 15000, case when mes_atual > 3 then 'concluida' else 'planejada' end),
    (ws, 'Dia das Mães', 'Vender pacotes presenteáveis', 'Vale-presente com bônus', 'Skinbooster', make_date(ano, 4, 20), make_date(ano, 5, 12), array['Instagram', 'WhatsApp'], array['Post de vale-presente', 'Stories diários'], 18000, case when mes_atual > 5 then 'concluida' else 'planejada' end),
    (ws, 'Dia dos Namorados', 'Reativar pacientes', 'Preenchimento labial com condição especial', 'Preenchimento labial', make_date(ano, 6, 1), make_date(ano, 6, 12), array['Instagram'], array['Reels de lábios'], 12000, case when mes_atual > 6 then 'concluida' else 'planejada' end),
    (ws, 'Black Friday', 'Aumentar o faturamento do mês', 'Bioestimulador com parcelamento estendido', 'Bioestimulador de colágeno', make_date(ano, 11, 20), make_date(ano, 11, 30), array['Instagram', 'WhatsApp', 'Tráfego pago'], array['Lista VIP', 'Contagem regressiva nos stories'], 25000, case when mes_atual > 11 then 'concluida' when mes_atual = 11 then 'andamento' else 'planejada' end),
    (ws, 'Fim de ano / verão', 'Preparar para as festas', 'Combo toxina + skinbooster', 'Toxina botulínica', make_date(ano, 12, 1), make_date(ano, 12, 20), array['Instagram', 'WhatsApp'], array['Agenda de dezembro'], 20000, 'planejada');

  -- marketing
  select id into p_aut from pilares_conteudo where workspace_id = ws and ordem = 1;
  select id into p_bast from pilares_conteudo where workspace_id = ws and ordem = 2;
  select id into p_res from pilares_conteudo where workspace_id = ws and ordem = 3;
  select id into p_edu from pilares_conteudo where workspace_id = ws and ordem = 4;

  insert into referencias (workspace_id, titulo, tipo, formato, pilar_id, link, observacao, tags, status) values
    (ws, 'Mitos e verdades sobre toxina', 'ideia', 'carrossel', p_edu, null, 'Responder as 5 dúvidas mais comuns do direct', array['toxina', 'educação'], 'aprovada')
    returning id into ref1;
  insert into referencias (workspace_id, titulo, tipo, formato, pilar_id, link, observacao, tags, status) values
    (ws, 'Reels de transição antes e depois', 'referencia', 'reels', p_res, 'https://www.instagram.com/', 'Gostei do ritmo e da música', array['resultado'], 'nova'),
    (ws, 'Um dia comigo no consultório', 'ideia', 'stories', p_bast, null, 'Mostrar preparo da sala e cuidados', array['bastidores'], 'nova');

  insert into conteudos (workspace_id, data, formato, pilar_id, tema, objetivo, roteiro, cta, referencia_id, responsavel, status) values
    (ws, hoje, 'reels', p_res, 'Resultado natural de toxina', 'converter', 'Mostrar antes e depois com depoimento curto.', 'Me chama no direct', null, 'Doutora', 'gravado'),
    (ws, hoje + 2, 'carrossel', p_edu, 'Mitos e verdades sobre toxina', 'nutrir', null, 'Salve para consultar depois', ref1, 'Doutora', 'roteiro'),
    (ws, hoje + 4, 'stories', p_bast, 'Bastidores do atendimento', 'atrair', null, null, null, 'Secretária', 'ideia'),
    (ws, hoje - 3, 'reels', p_aut, 'Por que estudar anatomia faz diferença', 'atrair', null, 'Siga para mais', null, 'Doutora', 'publicado');

  for m in 1..mes_atual loop
    insert into metricas_marketing (workspace_id, ano, mes, seguidores_total, seguidores_ganhos, alcance, visualizacoes, engajamento, visitas_perfil, cliques_link, dms, leads_instagram, comentario) values
      (ws, ano, m, 8200 + m * 180, 150 + (m * 37) % 90, 42000 + (m * 3100) % 15000, 61000 + (m * 4700) % 20000, 2400 + (m * 210) % 900,
       1800 + (m * 130) % 600, 140 + (m * 17) % 70, 60 + (m * 11) % 40, 22 + (m * 5) % 15,
       case when m = mes_atual then 'Alcance subiu com os reels de resultado. Manter frequência.' end);
  end loop;

  -- rotina: algumas tarefas feitas hoje
  insert into rotina_registros (workspace_id, tarefa_id, periodo, feito)
  select ws, id, hoje, true from rotina_tarefas where workspace_id = ws and frequencia = 'diaria' and ordem in (1, 3);
end;
$$;
revoke execute on function public.completar_exemplo(uuid) from public, anon, authenticated;

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
  return ws;
end;
$$;

revoke execute on function public.criar_espaco_exemplo() from public, anon;
grant execute on function public.criar_espaco_exemplo() to authenticated;
