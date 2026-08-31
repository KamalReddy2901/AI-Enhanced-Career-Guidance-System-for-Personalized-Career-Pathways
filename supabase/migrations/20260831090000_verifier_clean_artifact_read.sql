-- Permit a verifier to retrieve only clean artifact bytes that are linked to
-- evidence covered by an active, consented verification request. The subject
-- owner policy remains unchanged; this policy adds no listing or broad tenant
-- access beyond the existing request-scoped evidence predicate.

create or replace function sih26044.can_read_clean_verification_artifact(
  object_bucket_id text,
  object_path text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select object_bucket_id = 'career-evidence-private'
    and exists (
      select 1
      from sih26044.artifacts artifact
      join sih26044.evidence_artifact_links link
        on link.artifact_id = artifact.id
      where artifact.storage_bucket_id = object_bucket_id
        and artifact.storage_object_path = object_path
        and artifact.scan_status = 'clean'
        and sih26044.can_verify_evidence(link.evidence_record_id)
    )
$$;

revoke all on function sih26044.can_read_clean_verification_artifact(text, text)
from public, anon;
grant execute on function sih26044.can_read_clean_verification_artifact(text, text)
to authenticated;

create policy sih_private_evidence_select_clean_verifier
on storage.objects for select to authenticated
using (
  bucket_id = 'career-evidence-private'
  and sih26044.can_read_clean_verification_artifact(bucket_id, name)
);

comment on function sih26044.can_read_clean_verification_artifact(text, text) is
  'Request-scoped verifier Storage authorization. Only clean registered artifacts linked to actively consented evidence are readable; returns a boolean and exposes no artifact contents.';

comment on policy sih_private_evidence_select_clean_verifier on storage.objects is
  'Allows authenticated faculty/issuer verifiers to retrieve clean artifact bytes only through active bounded verification authority.';
