-- ── Bucket "avatars" — fotos de perfil dos profissionais ───────────────────
-- Cada arquivo é salvo em "{user_id}/arquivo.ext"; leitura pública,
-- escrita restrita ao próprio usuário (primeiro segmento do path = auth.uid()).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars são públicos para leitura"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Usuários podem enviar seu próprio avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Usuários podem atualizar seu próprio avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Usuários podem remover seu próprio avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
