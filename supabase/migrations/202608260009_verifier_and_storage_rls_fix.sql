-- SIH26044 Foundation D1: fix verifier evidence access and registered artifact deletion.
--
-- Root causes:
-- 1. Verifier evidence RLS policy uses can_access_verification_request(), but nested
--    queries hit RLS filters preventing verification_requests visibility.
-- 2. Storage DELETE policy's NOT EXISTS check against artifacts hits artifacts RLS,
--    preventing reliable registration detection.
--
-- Solutions:
-- 1. SECURITY DEFINER helper with elevated read to determine verifiable evidence.
-- 2. SECURITY DEFINER helper with elevated read to determine orphan status.

-- Verifier evidence authorization: can current actor read THIS evidence via verification?
create or replace function sih26044.can_verify_evidence(evidence_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.verification_requests vr
    join sih26044.consent_grants cg on cg.id = vr.consent_grant_id
    join sih26044.consent_evidence_records cer on cer.consent_grant_id = cg.id
      and cer.evidence_record_id = vr.evidence_record_id
    where vr.evidence_record_id = evidence_id
      and vr.status in ('requested', 'accepted')
      and (vr.expires_at is null or vr.expires_at > statement_timestamp())
      and (
        vr.requested_verifier_actor_id is null
        or vr.requested_verifier_actor_id = sih26044.current_actor_id()
      )
      and vr.requested_verifier_organization_id is not null
      and cg.subject_actor_id = vr.subject_actor_id
      and cg.grantee_organization_id = vr.requested_verifier_organization_id
      and cg.purpose = 'evidence_verification'
      and (cg.expires_at is null or cg.expires_at > statement_timestamp())
      and not exists (
        select 1 from sih26044.consent_lifecycle_events cle
        where cle.consent_grant_id = cg.id
          and cle.action = 'withdrawn'
      )
      and sih26044.has_any_active_organization_role(
        vr.requested_verifier_organization_id,
        array['faculty', 'issuer_verifier']::sih26044.actor_role[]
      )
  )
$$;

comment on function sih26044.can_verify_evidence is
  'Narrow authorization predicate: may current actor read THIS evidence due to valid verification request? Returns only boolean, exposes no evidence content.';

-- Orphan detection: is this Storage object NOT registered as an artifact?
create or replace function sih26044.is_orphan_evidence_object(
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
    and (storage.foldername(object_path))[1] = sih26044.current_actor_id()::text
    and not exists (
      select 1
      from sih26044.artifacts a
      where a.storage_bucket_id = object_bucket_id
        and a.storage_object_path = object_path
    )
$$;

comment on function sih26044.is_orphan_evidence_object is
  'Narrow authorization predicate: is Storage object an orphan (not registered)? Requires bucket=career-evidence-private and actor-owned path. Returns only boolean.';

-- Replace verifier evidence RLS policy to use elevated helper.
drop policy if exists evidence_records_select_assigned_verifier on sih26044.evidence_records;

create policy evidence_records_select_assigned_verifier
on sih26044.evidence_records for select to authenticated
using (
  sih26044.can_verify_evidence(id)
  and subject_actor_id <> sih26044.current_actor_id()
);

comment on policy evidence_records_select_assigned_verifier on sih26044.evidence_records is
  'Assigned verifier may read exactly the evidence covered by valid verification request + consent. Does not grant broad evidence access.';

-- Replace Storage DELETE policy to use elevated orphan check.
drop policy if exists sih_private_evidence_delete_orphan_owner on storage.objects;

create policy sih_private_evidence_delete_orphan_owner
on storage.objects for delete to authenticated
using (
  sih26044.is_orphan_evidence_object(bucket_id, name)
);

comment on policy sih_private_evidence_delete_orphan_owner on storage.objects is
  'Owner may delete orphan evidence uploads. Registered artifacts cannot be deleted by normal clients.';
