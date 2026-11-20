-- =====================================================================
-- Cronograma do acompanhamento em quadro (A fazer | Em andamento |
-- Concluído): a cliente pode mover as ações entre as colunas, sem poder
-- mudar o texto, as datas ou excluir.
-- =====================================================================

create or replace function public.mover_etapa(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  ws uuid;
begin
  if p_status not in ('proxima', 'andamento', 'concluida') then
    raise exception 'Coluna inválida.';
  end if;
  select workspace_id into ws from public.etapas_acompanhamento where id = p_id;
  if ws is null or not public.pode_editar_operacional(ws) then
    raise exception 'Sem permissão para mover esta ação.';
  end if;
  update public.etapas_acompanhamento
  set status = p_status, updated_by = auth.uid(), updated_at = now()
  where id = p_id;
end;
$$;
revoke execute on function public.mover_etapa(uuid, text) from public, anon;
grant execute on function public.mover_etapa(uuid, text) to authenticated;
