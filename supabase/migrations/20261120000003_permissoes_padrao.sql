-- =====================================================================
-- Permissões padrão seguras
-- O Supabase dá automaticamente às tabelas novas as permissões TRUNCATE,
-- REFERENCES e TRIGGER (e MAINTAIN no PostgreSQL 17) para visitantes
-- (anon) e usuárias logadas. TRUNCATE esvazia a tabela passando por cima
-- do RLS. Aqui removemos isso de todas as tabelas atuais e mudamos o
-- padrão para as próximas.
-- =====================================================================

revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;

do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'revoke maintain on all tables in schema public from authenticated';
    execute 'alter default privileges in schema public revoke maintain on tables from authenticated';
  end if;
end $$;
