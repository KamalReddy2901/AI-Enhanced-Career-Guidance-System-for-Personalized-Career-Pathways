-- SIH26044 Foundation D1: private evidence artifact storage contract.
-- Object path: <actor-id>/<artifact-id>/<safe-filename>

insert into storage.buckets (id, name, public, file_size_limit)
values ('career-evidence-private', 'career-evidence-private', false, 26214400)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

create policy sih_private_evidence_select_owner
on storage.objects for select to authenticated
using (
  bucket_id = 'career-evidence-private'
  and (storage.foldername(name))[1] = sih26044.current_actor_id()::text
);

create policy sih_private_evidence_insert_owner
on storage.objects for insert to authenticated
with check (
  bucket_id = 'career-evidence-private'
  and (storage.foldername(name))[1] = sih26044.current_actor_id()::text
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and array_length(storage.foldername(name), 1) = 3
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
);

create policy sih_private_evidence_update_owner
on storage.objects for update to authenticated
using (
  bucket_id = 'career-evidence-private'
  and (storage.foldername(name))[1] = sih26044.current_actor_id()::text
)
with check (
  bucket_id = 'career-evidence-private'
  and (storage.foldername(name))[1] = sih26044.current_actor_id()::text
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and array_length(storage.foldername(name), 1) = 3
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
);

create policy sih_private_evidence_delete_owner
on storage.objects for delete to authenticated
using (
  bucket_id = 'career-evidence-private'
  and (storage.foldername(name))[1] = sih26044.current_actor_id()::text
);

comment on schema storage is
  'Supabase Storage. SIH26044 career-evidence-private remains non-public; recruiter document delivery requires a later purpose-specific signed-URL service.';
