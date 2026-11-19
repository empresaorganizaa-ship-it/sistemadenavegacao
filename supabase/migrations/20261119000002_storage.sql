-- =====================================================================
-- Storage: logos dos workspaces (bucket privado)
-- Os arquivos ficam em "<workspace_id>/arquivo". Só membros do workspace
-- conseguem ver; só quem administra consegue enviar ou apagar.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create or replace function public.workspace_da_pasta(caminho text)
returns uuid
language plpgsql immutable
as $$
begin
  return split_part(caminho, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

create policy "logos: membros veem" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos' and public.sou_membro(public.workspace_da_pasta(name)));

create policy "logos: quem administra envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and public.pode_administrar(public.workspace_da_pasta(name)));

create policy "logos: quem administra substitui" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and public.pode_administrar(public.workspace_da_pasta(name)))
  with check (bucket_id = 'logos' and public.pode_administrar(public.workspace_da_pasta(name)));

create policy "logos: quem administra apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and public.pode_administrar(public.workspace_da_pasta(name)));
