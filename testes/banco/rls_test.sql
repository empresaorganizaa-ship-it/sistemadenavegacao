-- Teste de isolamento e permissões (RLS).
-- Rode com:  npm run test:db   (precisa do PostgreSQL instalado localmente)
\set ON_ERROR_STOP on
set client_min_messages = notice;
\pset tuples_only on
\o /dev/null

create or replace function pg_temp.entrar(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, false);
$$;
create or replace function pg_temp.esperar(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

-- Usuárias
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'monalisa@consultora.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ana@clinica-a.com'),
  ('00000000-0000-0000-0000-00000000000c', 'carla@clinica-c.com');

set role authenticated;

-- Consultora cria dois workspaces e convida uma cliente para cada
select pg_temp.entrar('00000000-0000-0000-0000-00000000000a');
select public.criar_espaco_exemplo() as ws_a \gset
select set_config('x.ws_a', :'ws_a', false);
select public.criar_workspace('Clínica C') as ws_c \gset
select set_config('x.ws_c', :'ws_c', false);
insert into public.convites (workspace_id, email, papel) values
  (:'ws_a', 'ana@clinica-a.com', 'cliente'),
  (:'ws_c', 'carla@clinica-c.com', 'cliente'),
  (:'ws_a', 'bruna@clinica-a.com', 'cliente');
insert into public.metricas_mensais (workspace_id, ano, mes, faturamento) values (:'ws_c', 2026, 1, 999);

-- Convites são aceitos no login
select pg_temp.entrar('00000000-0000-0000-0000-00000000000b');
select public.aceitar_meus_convites();
select pg_temp.entrar('00000000-0000-0000-0000-00000000000c');
select public.aceitar_meus_convites();

-- Nova usuária convidada antes de ter conta entra automaticamente
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000d', 'Bruna@Clinica-A.com');
set role authenticated;

-- ---------- Isolamento ----------
select pg_temp.entrar('00000000-0000-0000-0000-00000000000b');
select pg_temp.esperar((select count(*) from public.workspaces) = 1, 'Ana vê só 1 workspace');
select pg_temp.esperar((select count(*) from public.workspaces where id = :'ws_c') = 0, 'Ana não vê a Clínica C');
select pg_temp.esperar((select count(*) from public.metricas_mensais where workspace_id = :'ws_c') = 0, 'Ana não vê métricas da Clínica C');
select pg_temp.esperar((select count(*) from public.metricas_mensais) > 0, 'Ana vê as métricas do próprio workspace');
select pg_temp.esperar((select count(*) from public.profiles where email = 'carla@clinica-c.com') = 0, 'Ana não vê o perfil da Carla');
select pg_temp.esperar((select count(*) from public.profiles where email = 'monalisa@consultora.com') = 1, 'Ana vê o perfil da consultora');

do $$ begin
  insert into public.metricas_mensais (workspace_id, ano, mes, faturamento)
  values (current_setting('x.ws_c')::uuid, 2026, 2, 1);
  raise exception 'FALHOU: Ana conseguiu inserir na Clínica C';
exception when insufficient_privilege then raise notice 'ok - Ana não grava na Clínica C';
end $$;

update public.metricas_mensais set faturamento = 0 where workspace_id = :'ws_c';
select pg_temp.esperar((select count(*) from public.metricas_mensais where workspace_id = :'ws_c') = 0, 'update na Clínica C não afeta nada visível');

select pg_temp.entrar('00000000-0000-0000-0000-00000000000c');
select pg_temp.esperar((select faturamento from public.metricas_mensais where workspace_id = :'ws_c' and mes = 1) = 999, 'dados da Clínica C intactos');
select pg_temp.esperar((select count(*) from public.workspaces) = 1, 'Carla vê só 1 workspace');

select pg_temp.entrar('00000000-0000-0000-0000-00000000000d');
select pg_temp.esperar((select papel from public.workspace_membros where workspace_id = :'ws_a' and user_id = '00000000-0000-0000-0000-00000000000d') = 'cliente', 'Bruna entrou pelo convite ao criar a conta');

do $$ begin
  truncate public.comentarios;
  raise exception 'FALHOU: usuária logada conseguiu esvaziar os comentários';
exception when insufficient_privilege then raise notice 'ok - usuária logada não esvazia comentários';
end $$;
do $$ begin
  truncate public.metricas_mensais;
  raise exception 'FALHOU: usuária logada conseguiu esvaziar uma tabela';
exception when insufficient_privilege then raise notice 'ok - usuária logada não esvazia tabelas';
end $$;

-- ---------- Papéis durante o acompanhamento ----------
select pg_temp.entrar('00000000-0000-0000-0000-00000000000b');
update public.metricas_mensais set leads_novos = 77 where workspace_id = :'ws_a' and mes = 1;
select pg_temp.esperar((select leads_novos from public.metricas_mensais where workspace_id = :'ws_a' and mes = 1) = 77, 'cliente edita métricas');
select pg_temp.esperar((select updated_by from public.metricas_mensais where workspace_id = :'ws_a' and mes = 1) = '00000000-0000-0000-0000-00000000000b', 'registro guarda quem alterou');
update public.workspaces set nome = 'Hackeado' where id = :'ws_a';
select pg_temp.esperar((select nome from public.workspaces where id = :'ws_a') <> 'Hackeado', 'cliente não altera configurações durante o acompanhamento');
do $$ begin
  insert into public.convites (workspace_id, email, papel) values (current_setting('x.ws_a')::uuid, 'x@x.com', 'consultora');
  raise exception 'FALHOU: cliente convidou alguém';
exception when insufficient_privilege then raise notice 'ok - cliente não convida durante o acompanhamento';
end $$;

-- ---------- Módulos (CRM, entregáveis, comentários) ----------
select pg_temp.entrar('00000000-0000-0000-0000-00000000000b');
select pg_temp.esperar((select count(*) from public.leads) > 0, 'Ana vê os leads do próprio espaço');
select pg_temp.esperar((select count(*) from public.leads where workspace_id = :'ws_c') = 0, 'Ana não vê leads da Clínica C');
select pg_temp.esperar((select count(*) from public.crm_colunas where workspace_id = :'ws_c') = 0, 'Ana não vê o CRM da Clínica C');
insert into public.leads (workspace_id, nome) values (:'ws_a', 'Lead da Ana');
select pg_temp.esperar((select count(*) from public.leads where nome = 'Lead da Ana') = 1, 'cliente cria lead');
update public.playbook_secoes set conteudo = 'alterado pela cliente' where workspace_id = :'ws_a';
select pg_temp.esperar((select count(*) from public.playbook_secoes where conteudo = 'alterado pela cliente') = 0, 'cliente não edita o playbook durante o acompanhamento');
insert into public.comentarios (workspace_id, entidade, registro_id, texto)
  select :'ws_a', 'playbook_secoes', id, 'Amei esta seção!' from public.playbook_secoes where workspace_id = :'ws_a' limit 1;
select pg_temp.esperar((select count(*) from public.comentarios where texto = 'Amei esta seção!') = 1, 'cliente comenta no playbook');
insert into public.leituras (workspace_id, entidade, registro_id)
  select :'ws_a', 'playbook_secoes', id from public.playbook_secoes where workspace_id = :'ws_a' limit 1;
do $$ begin
  insert into public.leads (workspace_id, nome) values (current_setting('x.ws_c')::uuid, 'Intrusa');
  raise exception 'FALHOU: Ana criou lead na Clínica C';
exception when insufficient_privilege then raise notice 'ok - Ana não cria lead na Clínica C';
end $$;
do $$ begin
  insert into public.comentarios (workspace_id, entidade, registro_id, texto)
  values (current_setting('x.ws_c')::uuid, 'x', gen_random_uuid(), 'oi');
  raise exception 'FALHOU: Ana comentou na Clínica C';
exception when insufficient_privilege then raise notice 'ok - Ana não comenta na Clínica C';
end $$;

select pg_temp.entrar('00000000-0000-0000-0000-00000000000a');
select pg_temp.esperar((select count(*) from public.leituras) = 0, 'leituras são individuais (consultora não vê as da Ana)');
update public.playbook_secoes set conteudo = 'texto da consultora' where workspace_id = :'ws_a' and ordem = 1;
select pg_temp.esperar((select conteudo from public.playbook_secoes where workspace_id = :'ws_a' and ordem = 1) = 'texto da consultora', 'consultora edita o playbook');
update public.comentarios set texto = 'editado por outra' where texto = 'Amei esta seção!';
select pg_temp.esperar((select count(*) from public.comentarios where texto = 'Amei esta seção!') = 1, 'ninguém edita comentário de outra pessoa');

-- ---------- Encontros ----------
select pg_temp.entrar('00000000-0000-0000-0000-00000000000b');
select pg_temp.esperar((select count(*) from public.encontros where workspace_id = :'ws_a') = 2, 'Ana vê os encontros do próprio espaço');
select pg_temp.esperar((select count(*) from public.encontro_combinados where workspace_id = :'ws_c') = 0, 'Ana não vê combinados da Clínica C');
do $$ begin
  insert into public.encontros (workspace_id, titulo) values (current_setting('x.ws_a')::uuid, 'Encontro da cliente');
  raise exception 'FALHOU: cliente criou encontro';
exception when insufficient_privilege then raise notice 'ok - cliente não cria encontro durante o acompanhamento';
end $$;
update public.encontro_combinados set texto = 'mudei o combinado' where workspace_id = :'ws_a';
select pg_temp.esperar((select count(*) from public.encontro_combinados where texto = 'mudei o combinado') = 0, 'cliente não altera o texto do combinado');
select public.marcar_combinado(id, true) from public.encontro_combinados where workspace_id = :'ws_a' and not feito and responsavel = 'cliente' limit 1;
select pg_temp.esperar((select count(*) from public.encontro_combinados where workspace_id = :'ws_a' and feito and feito_por = '00000000-0000-0000-0000-00000000000b') = 1, 'cliente marca combinado como feito');

select pg_temp.entrar('00000000-0000-0000-0000-00000000000c');
do $$ begin
  perform public.marcar_combinado((select id from public.encontro_combinados limit 1), true);
exception when others then null;
end $$;
select pg_temp.entrar('00000000-0000-0000-0000-00000000000a');
select pg_temp.esperar((select count(*) from public.encontro_combinados where workspace_id = :'ws_a' and feito_por = '00000000-0000-0000-0000-00000000000c') = 0, 'cliente de outro espaço não marca combinados');
insert into public.encontros (workspace_id, titulo) values (:'ws_a', 'Encontro 3');
insert into public.encontro_combinados (encontro_id, texto, workspace_id)
  select id, 'Novo combinado', :'ws_c' from public.encontros where titulo = 'Encontro 3';
select pg_temp.esperar((select workspace_id from public.encontro_combinados where texto = 'Novo combinado') = :'ws_a', 'combinado fica no espaço do encontro (mesmo se informarem outro)');

-- ---------- Encerramento ----------
select pg_temp.entrar('00000000-0000-0000-0000-00000000000a');
update public.workspaces set status = 'acompanhamento_encerrado' where id = :'ws_a';
select pg_temp.esperar((select status from public.workspaces where id = :'ws_a') = 'acompanhamento_encerrado', 'consultora encerra o acompanhamento');
update public.metricas_mensais set leads_novos = 1 where workspace_id = :'ws_a' and mes = 1;
select pg_temp.esperar((select leads_novos from public.metricas_mensais where workspace_id = :'ws_a' and mes = 1) = 77, 'consultora fica somente leitura após encerrar');
select pg_temp.esperar((select count(*) from public.metricas_mensais where workspace_id = :'ws_a') > 0, 'consultora ainda lê após encerrar');
update public.leads set nome = 'mudado' where workspace_id = :'ws_a';
select pg_temp.esperar((select count(*) from public.leads where nome = 'mudado') = 0, 'consultora não edita o CRM após encerrar');
insert into public.comentarios (workspace_id, entidade, registro_id, texto) values (:'ws_a', 'teste', gen_random_uuid(), 'ainda posso comentar');
select pg_temp.esperar((select count(*) from public.comentarios where texto = 'ainda posso comentar') = 1, 'consultora ainda comenta após encerrar');

select pg_temp.entrar('00000000-0000-0000-0000-00000000000b');
update public.playbook_secoes set conteudo = 'agora é minha' where workspace_id = :'ws_a' and ordem = 1;
select pg_temp.esperar((select conteudo from public.playbook_secoes where workspace_id = :'ws_a' and ordem = 1) = 'agora é minha', 'cliente edita o playbook após encerrar');
update public.workspaces set nome = 'Clínica da Ana' where id = :'ws_a';
select pg_temp.esperar((select nome from public.workspaces where id = :'ws_a') = 'Clínica da Ana', 'cliente edita configurações após encerrar');
delete from public.workspace_membros where workspace_id = :'ws_a' and user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.entrar('00000000-0000-0000-0000-00000000000a');
select pg_temp.esperar((select count(*) from public.workspaces where id = :'ws_a') = 0, 'cliente pode remover a consultora após encerrar');
select pg_temp.esperar((select count(*) from public.workspaces where id = :'ws_c') = 1, 'consultora continua na Clínica C');

-- ---------- Visitante sem login ----------
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  perform count(*) from public.workspaces;
  raise exception 'FALHOU: sem login conseguiu consultar';
exception when insufficient_privilege then raise notice 'ok - sem login não acessa as tabelas';
end $$;
do $$ begin
  truncate public.leads cascade;
  raise exception 'FALHOU: sem login conseguiu esvaziar o CRM';
exception when insufficient_privilege then raise notice 'ok - sem login não esvazia o CRM';
end $$;
do $$ begin
  truncate public.metricas_mensais;
  raise exception 'FALHOU: sem login conseguiu esvaziar uma tabela';
exception when insufficient_privilege then raise notice 'ok - sem login não esvazia tabelas';
end $$;

\o
\echo 'TODOS OS TESTES PASSARAM'
