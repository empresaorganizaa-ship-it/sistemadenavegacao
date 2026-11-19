-- =====================================================================
-- Permissões explícitas das tabelas
-- Projetos novos do Supabase não dão acesso automático às tabelas criadas
-- por SQL. Aqui liberamos só o necessário para quem está logada (as regras
-- de RLS continuam decidindo QUAIS linhas cada pessoa vê ou altera) e
-- retiramos tudo de visitantes sem login.
-- =====================================================================

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select, update on public.profiles to authenticated;
grant select, update, delete on public.workspaces to authenticated;
grant select, delete on public.workspace_membros to authenticated;
grant select, insert, delete on public.convites to authenticated;
grant select, insert, update, delete on
  public.metas_ciclo,
  public.metas_mes,
  public.metricas_mensais,
  public.origens_lead,
  public.metricas_leads_origem
to authenticated;

-- Funções internas não devem ser chamadas diretamente por ninguém de fora
revoke execute on function public.tg_auditoria() from public, anon, authenticated;
revoke execute on function public.tg_novo_usuario() from public, anon, authenticated;
revoke execute on function public.tg_metas_mes_workspace() from public, anon, authenticated;
revoke execute on function public.tg_leads_origem_workspace() from public, anon, authenticated;
