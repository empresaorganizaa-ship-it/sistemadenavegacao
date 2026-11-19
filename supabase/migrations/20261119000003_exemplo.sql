-- =====================================================================
-- Dados de exemplo: cria um workspace de teste preenchido, para visualizar
-- o sistema antes de colocar os dados reais. Pode ser apagado depois em
-- Configurações.
-- (Leads, mensagens etc. entram aqui nas próximas fases.)
-- =====================================================================

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

  return ws;
end;
$$;

revoke execute on function public.criar_espaco_exemplo() from public, anon;
grant execute on function public.criar_espaco_exemplo() to authenticated;
