-- SIH26044 Foundation D1: least-privilege row authorization.
-- There is deliberately no universal administrator bypass helper or policy.

create or replace function sih26044.has_active_organization_membership(requested_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.organization_memberships m
    join sih26044.organizations o on o.id = m.organization_id
    where m.actor_id = sih26044.current_actor_id()
      and m.organization_id = requested_organization_id
      and m.status = 'active'
      and m.valid_from <= statement_timestamp()
      and (m.valid_until is null or m.valid_until > statement_timestamp())
      and o.status = 'active'
  )
$$;

create or replace function sih26044.can_manage_opportunity(requested_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.opportunities o
    where o.id = requested_opportunity_id
      and sih26044.has_any_active_organization_role(
        o.owner_organization_id,
        array['recruiter', 'industry_partner', 'institution_admin', 'faculty']::sih26044.actor_role[]
      )
  )
$$;

create or replace function sih26044.can_access_verification_request(requested_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.verification_requests vr
    where vr.id = requested_request_id
      and (
        vr.subject_actor_id = sih26044.current_actor_id()
        or (
          vr.status in ('requested', 'accepted')
          and (vr.expires_at is null or vr.expires_at > statement_timestamp())
          and vr.requested_verifier_organization_id is not null
          and (vr.requested_verifier_actor_id is null or vr.requested_verifier_actor_id = sih26044.current_actor_id())
          and sih26044.has_any_active_organization_role(
            vr.requested_verifier_organization_id,
            array['faculty', 'issuer_verifier']::sih26044.actor_role[]
          )
          and sih26044.is_consent_active(
            vr.consent_grant_id,
            vr.subject_actor_id,
            vr.requested_verifier_organization_id,
            'evidence_verification'
          )
          and exists (
            select 1 from sih26044.consent_evidence_records ce
            where ce.consent_grant_id = vr.consent_grant_id
              and ce.evidence_record_id = vr.evidence_record_id
          )
        )
      )
  )
$$;

create or replace function sih26044.can_append_verification_event(
  requested_request_id uuid,
  requested_action sih26044.verification_action,
  requested_actor_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.verification_requests vr
    where vr.id = requested_request_id
      and sih26044.can_access_verification_request(vr.id)
      and (
        (
          vr.subject_actor_id = sih26044.current_actor_id()
          and requested_action in ('submitted_for_review', 'self_confirmed', 'disputed', 'revoked', 'corrected')
          and requested_actor_organization_id is null
        )
        or
        (
          vr.requested_verifier_organization_id = requested_actor_organization_id
          and requested_action in ('verified_by_human', 'disputed', 'revoked', 'corrected')
          and sih26044.has_any_active_organization_role(
            requested_actor_organization_id,
            array['faculty', 'issuer_verifier']::sih26044.actor_role[]
          )
        )
        or
        (
          vr.requested_verifier_organization_id = requested_actor_organization_id
          and requested_action = 'verified_by_issuer'
          and sih26044.has_active_organization_role(requested_actor_organization_id, 'issuer_verifier')
        )
      )
  )
$$;

create or replace function sih26044.can_recruiter_read_application(requested_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.applications a
    join sih26044.application_snapshots s on s.application_id = a.id and s.finalized_at is not null
    join sih26044.application_snapshot_consents sc on sc.application_snapshot_id = s.id
    join sih26044.consent_grants g on g.id = sc.consent_grant_id
    where a.id = requested_application_id
      and sih26044.has_any_active_organization_role(
        a.owner_organization_id,
        array['recruiter', 'industry_partner']::sih26044.actor_role[]
      )
      and sih26044.current_application_stage(a.id) not in ('saved', 'preparing')
      and sih26044.is_consent_active(g.id, a.applicant_actor_id, a.owner_organization_id, 'application_review')
  )
$$;

create or replace function sih26044.can_append_application_event(
  requested_application_id uuid,
  requested_to_stage sih26044.application_stage,
  requested_event_kind sih26044.application_event_kind
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.applications a
    where a.id = requested_application_id
      and (
        (
          a.applicant_actor_id = sih26044.current_actor_id()
          and requested_to_stage in ('applied', 'withdrawn', 'accepted', 'declined')
          and requested_event_kind = 'stage_transition'
        )
        or
        (
          sih26044.can_recruiter_read_application(a.id)
          and requested_to_stage in (
            'screening', 'evidence_requested', 'under_review', 'interview',
            'shortlisted', 'offered', 'rejected_by_human', 'active',
            'completed', 'cancelled', 'outcome_recorded'
          )
          and (
            (requested_to_stage = 'rejected_by_human' and requested_event_kind = 'human_rejection')
            or (requested_to_stage <> 'rejected_by_human' and requested_event_kind = 'stage_transition')
          )
        )
      )
  )
$$;

create or replace function sih26044.can_access_outcome(requested_outcome_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1 from sih26044.outcome_events o
    where o.id = requested_outcome_id
      and (
        o.subject_actor_id = sih26044.current_actor_id()
        or (o.application_id is not null and sih26044.can_recruiter_read_application(o.application_id))
        or sih26044.has_any_active_organization_role(
          o.organization_id,
          array['faculty', 'institution_admin', 'recruiter', 'industry_partner']::sih26044.actor_role[]
        )
      )
  )
$$;

create or replace function sih26044.can_access_collaboration(requested_collaboration_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.collaboration_engagements c
    where c.id = requested_collaboration_id
      and (
        sih26044.has_active_organization_membership(c.host_organization_id)
        or exists (
          select 1 from sih26044.collaboration_partner_organizations p
          where p.collaboration_engagement_id = c.id
            and sih26044.has_active_organization_membership(p.organization_id)
        )
        or exists (
          select 1 from sih26044.collaboration_participants p
          where p.collaboration_engagement_id = c.id
            and p.actor_id = sih26044.current_actor_id()
        )
      )
  )
$$;

revoke all on function sih26044.has_active_organization_membership(uuid) from public;
revoke all on function sih26044.can_manage_opportunity(uuid) from public;
revoke all on function sih26044.can_access_verification_request(uuid) from public;
revoke all on function sih26044.can_append_verification_event(uuid, sih26044.verification_action, uuid) from public;
revoke all on function sih26044.can_recruiter_read_application(uuid) from public;
revoke all on function sih26044.can_append_application_event(uuid, sih26044.application_stage, sih26044.application_event_kind) from public;
revoke all on function sih26044.can_access_outcome(uuid) from public;
revoke all on function sih26044.can_access_collaboration(uuid) from public;
grant execute on function sih26044.has_active_organization_membership(uuid) to authenticated;
grant execute on function sih26044.can_manage_opportunity(uuid) to authenticated;
grant execute on function sih26044.can_access_verification_request(uuid) to authenticated;
grant execute on function sih26044.can_append_verification_event(uuid, sih26044.verification_action, uuid) to authenticated;
grant execute on function sih26044.can_recruiter_read_application(uuid) to authenticated;
grant execute on function sih26044.can_append_application_event(uuid, sih26044.application_stage, sih26044.application_event_kind) to authenticated;
grant execute on function sih26044.can_access_outcome(uuid) to authenticated;
grant execute on function sih26044.can_access_collaboration(uuid) to authenticated;

-- RLS is enabled on every SIH26044 table, including normalized link tables.
alter table sih26044.actors enable row level security;
alter table sih26044.organizations enable row level security;
alter table sih26044.organization_memberships enable row level security;
alter table sih26044.organization_membership_roles enable row level security;
alter table sih26044.opportunities enable row level security;
alter table sih26044.opportunity_versions enable row level security;
alter table sih26044.opportunity_requirements enable row level security;
alter table sih26044.eligibility_rules enable row level security;
alter table sih26044.evidence_records enable row level security;
alter table sih26044.artifacts enable row level security;
alter table sih26044.evidence_artifact_links enable row level security;
alter table sih26044.verification_requests enable row level security;
alter table sih26044.verification_events enable row level security;
alter table sih26044.opportunity_readiness_results enable row level security;
alter table sih26044.consent_grants enable row level security;
alter table sih26044.consent_evidence_records enable row level security;
alter table sih26044.consent_lifecycle_events enable row level security;
alter table sih26044.applications enable row level security;
alter table sih26044.application_snapshots enable row level security;
alter table sih26044.application_snapshot_evidence enable row level security;
alter table sih26044.application_snapshot_consents enable row level security;
alter table sih26044.application_events enable row level security;
alter table sih26044.outcome_events enable row level security;
alter table sih26044.outcome_application_snapshots enable row level security;
alter table sih26044.outcome_evidence_emissions enable row level security;
alter table sih26044.collaboration_engagements enable row level security;
alter table sih26044.collaboration_partner_organizations enable row level security;
alter table sih26044.collaboration_participants enable row level security;
alter table sih26044.collaboration_objectives enable row level security;
alter table sih26044.audit_events enable row level security;

grant usage on schema sih26044 to authenticated;
grant select on all tables in schema sih26044 to authenticated;
grant insert on sih26044.actors, sih26044.opportunities, sih26044.opportunity_versions,
  sih26044.opportunity_requirements, sih26044.eligibility_rules,
  sih26044.evidence_records, sih26044.artifacts, sih26044.evidence_artifact_links,
  sih26044.verification_requests, sih26044.verification_events,
  sih26044.opportunity_readiness_results, sih26044.consent_grants,
  sih26044.consent_evidence_records, sih26044.consent_lifecycle_events,
  sih26044.applications, sih26044.application_snapshots,
  sih26044.application_snapshot_evidence, sih26044.application_snapshot_consents,
  sih26044.application_events, sih26044.outcome_events,
  sih26044.outcome_application_snapshots, sih26044.outcome_evidence_emissions,
  sih26044.collaboration_engagements, sih26044.collaboration_partner_organizations,
  sih26044.collaboration_participants, sih26044.collaboration_objectives,
  sih26044.audit_events to authenticated;
grant update, delete on sih26044.opportunities, sih26044.opportunity_versions,
  sih26044.opportunity_requirements, sih26044.eligibility_rules to authenticated;
grant update on sih26044.collaboration_engagements to authenticated;

create policy actors_select_self on sih26044.actors for select to authenticated
  using (id = sih26044.current_actor_id());
create policy actors_insert_self on sih26044.actors for insert to authenticated
  with check (auth_user_id = auth.uid());

create policy organizations_select_membership on sih26044.organizations for select to authenticated
  using (sih26044.has_active_organization_membership(id));
create policy memberships_select_self_or_admin on sih26044.organization_memberships for select to authenticated
  using (
    actor_id = sih26044.current_actor_id()
    or sih26044.has_active_organization_role(organization_id, 'institution_admin')
  );
create policy membership_roles_select_self_or_admin on sih26044.organization_membership_roles for select to authenticated
  using (exists (
    select 1 from sih26044.organization_memberships m
    where m.id = membership_id
      and (
        m.actor_id = sih26044.current_actor_id()
        or sih26044.has_active_organization_role(m.organization_id, 'institution_admin')
      )
  ));

create policy opportunities_select_published_or_owner on sih26044.opportunities for select to authenticated
  using (status <> 'draft' or sih26044.can_manage_opportunity(id));
create policy opportunities_insert_owner on sih26044.opportunities for insert to authenticated
  with check (
    created_by_actor_id = sih26044.current_actor_id()
    and sih26044.has_any_active_organization_role(
      owner_organization_id,
      array['recruiter', 'industry_partner', 'institution_admin', 'faculty']::sih26044.actor_role[]
    )
  );
create policy opportunities_update_owner_draft on sih26044.opportunities for update to authenticated
  using (status = 'draft' and sih26044.can_manage_opportunity(id))
  with check (status = 'draft' and sih26044.can_manage_opportunity(id));
create policy opportunities_delete_owner_draft on sih26044.opportunities for delete to authenticated
  using (status = 'draft' and sih26044.can_manage_opportunity(id));

create policy opportunity_versions_select_published_or_owner on sih26044.opportunity_versions for select to authenticated
  using (status = 'published' or sih26044.can_manage_opportunity(opportunity_id));
create policy opportunity_versions_insert_owner on sih26044.opportunity_versions for insert to authenticated
  with check (status = 'draft' and created_by_actor_id = sih26044.current_actor_id() and sih26044.can_manage_opportunity(opportunity_id));
create policy opportunity_versions_update_owner_draft on sih26044.opportunity_versions for update to authenticated
  using (status = 'draft' and sih26044.can_manage_opportunity(opportunity_id))
  with check (status = 'draft' and sih26044.can_manage_opportunity(opportunity_id));
create policy opportunity_versions_delete_owner_draft on sih26044.opportunity_versions for delete to authenticated
  using (status = 'draft' and sih26044.can_manage_opportunity(opportunity_id));

create policy opportunity_requirements_select_version on sih26044.opportunity_requirements for select to authenticated
  using (exists (
    select 1 from sih26044.opportunity_versions v
    where v.id = opportunity_version_id and (v.status = 'published' or sih26044.can_manage_opportunity(v.opportunity_id))
  ));
create policy opportunity_requirements_insert_draft on sih26044.opportunity_requirements for insert to authenticated
  with check (exists (
    select 1 from sih26044.opportunity_versions v
    where v.id = opportunity_version_id and v.status = 'draft' and sih26044.can_manage_opportunity(v.opportunity_id)
  ));
create policy opportunity_requirements_update_draft on sih26044.opportunity_requirements for update to authenticated
  using (exists (
    select 1 from sih26044.opportunity_versions v
    where v.id = opportunity_version_id and v.status = 'draft' and sih26044.can_manage_opportunity(v.opportunity_id)
  ));
create policy opportunity_requirements_delete_draft on sih26044.opportunity_requirements for delete to authenticated
  using (exists (
    select 1 from sih26044.opportunity_versions v
    where v.id = opportunity_version_id and v.status = 'draft' and sih26044.can_manage_opportunity(v.opportunity_id)
  ));

create policy eligibility_rules_select_version on sih26044.eligibility_rules for select to authenticated
  using (exists (
    select 1 from sih26044.opportunity_versions v
    where v.id = opportunity_version_id and (v.status = 'published' or sih26044.can_manage_opportunity(v.opportunity_id))
  ));
create policy eligibility_rules_insert_draft on sih26044.eligibility_rules for insert to authenticated
  with check (exists (
    select 1 from sih26044.opportunity_versions v
    where v.id = opportunity_version_id and v.status = 'draft' and sih26044.can_manage_opportunity(v.opportunity_id)
  ));
create policy eligibility_rules_update_draft on sih26044.eligibility_rules for update to authenticated
  using (exists (
    select 1 from sih26044.opportunity_versions v
    where v.id = opportunity_version_id and v.status = 'draft' and sih26044.can_manage_opportunity(v.opportunity_id)
  ));
create policy eligibility_rules_delete_draft on sih26044.eligibility_rules for delete to authenticated
  using (exists (
    select 1 from sih26044.opportunity_versions v
    where v.id = opportunity_version_id and v.status = 'draft' and sih26044.can_manage_opportunity(v.opportunity_id)
  ));

create policy evidence_records_select_subject on sih26044.evidence_records for select to authenticated
  using (subject_actor_id = sih26044.current_actor_id());
create policy evidence_records_select_assigned_verifier on sih26044.evidence_records for select to authenticated
  using (exists (
    select 1 from sih26044.verification_requests vr
    where vr.evidence_record_id = id and sih26044.can_access_verification_request(vr.id)
      and vr.subject_actor_id <> sih26044.current_actor_id()
  ));
create policy evidence_records_insert_subject on sih26044.evidence_records for insert to authenticated
  with check (subject_actor_id = sih26044.current_actor_id());

create policy artifacts_select_subject on sih26044.artifacts for select to authenticated
  using (subject_actor_id = sih26044.current_actor_id());
create policy artifacts_select_assigned_verifier on sih26044.artifacts for select to authenticated
  using (exists (
    select 1
    from sih26044.evidence_artifact_links l
    join sih26044.verification_requests vr on vr.evidence_record_id = l.evidence_record_id
    where l.artifact_id = id
      and vr.subject_actor_id <> sih26044.current_actor_id()
      and sih26044.can_access_verification_request(vr.id)
  ));
create policy artifacts_insert_subject on sih26044.artifacts for insert to authenticated
  with check (subject_actor_id = sih26044.current_actor_id());
create policy evidence_artifact_links_select_subject on sih26044.evidence_artifact_links for select to authenticated
  using (exists (
    select 1 from sih26044.evidence_records e
    where e.id = evidence_record_id and e.subject_actor_id = sih26044.current_actor_id()
  ));
create policy evidence_artifact_links_select_assigned_verifier on sih26044.evidence_artifact_links for select to authenticated
  using (exists (
    select 1 from sih26044.verification_requests vr
    where vr.evidence_record_id = evidence_record_id
      and vr.subject_actor_id <> sih26044.current_actor_id()
      and sih26044.can_access_verification_request(vr.id)
  ));
create policy evidence_artifact_links_insert_subject on sih26044.evidence_artifact_links for insert to authenticated
  with check (
    linked_by_actor_id = sih26044.current_actor_id()
    and exists (select 1 from sih26044.evidence_records e where e.id = evidence_record_id and e.subject_actor_id = sih26044.current_actor_id())
    and exists (select 1 from sih26044.artifacts a where a.id = artifact_id and a.subject_actor_id = sih26044.current_actor_id())
  );

create policy verification_requests_select_bounded on sih26044.verification_requests for select to authenticated
  using (sih26044.can_access_verification_request(id));
create policy verification_requests_insert_subject on sih26044.verification_requests for insert to authenticated
  with check (
    subject_actor_id = sih26044.current_actor_id()
    and status = 'requested'
    and consent_grant_id is not null
    and requested_verifier_organization_id is not null
    and exists (select 1 from sih26044.evidence_records e where e.id = evidence_record_id and e.subject_actor_id = sih26044.current_actor_id())
    and sih26044.is_consent_active(consent_grant_id, subject_actor_id, requested_verifier_organization_id, 'evidence_verification')
    and exists (select 1 from sih26044.consent_evidence_records ce where ce.consent_grant_id = consent_grant_id and ce.evidence_record_id = evidence_record_id)
  );
create policy verification_events_select_bounded on sih26044.verification_events for select to authenticated
  using (sih26044.can_access_verification_request(verification_request_id));
create policy verification_events_insert_bounded on sih26044.verification_events for insert to authenticated
  with check (
    actor_id = sih26044.current_actor_id()
    and sih26044.can_append_verification_event(verification_request_id, action, actor_organization_id)
  );

create policy readiness_results_select_subject on sih26044.opportunity_readiness_results for select to authenticated
  using (subject_actor_id = sih26044.current_actor_id());
create policy readiness_results_insert_subject on sih26044.opportunity_readiness_results for insert to authenticated
  with check (subject_actor_id = sih26044.current_actor_id());

create policy consent_grants_select_subject on sih26044.consent_grants for select to authenticated
  using (subject_actor_id = sih26044.current_actor_id());
create policy consent_grants_insert_subject on sih26044.consent_grants for insert to authenticated
  with check (subject_actor_id = sih26044.current_actor_id() and created_by_actor_id = sih26044.current_actor_id());
create policy consent_evidence_select_subject on sih26044.consent_evidence_records for select to authenticated
  using (exists (select 1 from sih26044.consent_grants g where g.id = consent_grant_id and g.subject_actor_id = sih26044.current_actor_id()));
create policy consent_evidence_insert_subject on sih26044.consent_evidence_records for insert to authenticated
  with check (
    exists (select 1 from sih26044.consent_grants g where g.id = consent_grant_id and g.subject_actor_id = sih26044.current_actor_id())
    and exists (select 1 from sih26044.evidence_records e where e.id = evidence_record_id and e.subject_actor_id = sih26044.current_actor_id())
  );
create policy consent_events_select_subject on sih26044.consent_lifecycle_events for select to authenticated
  using (exists (select 1 from sih26044.consent_grants g where g.id = consent_grant_id and g.subject_actor_id = sih26044.current_actor_id()));
create policy consent_events_insert_withdrawal on sih26044.consent_lifecycle_events for insert to authenticated
  with check (
    action = 'withdrawn'
    and actor_id = sih26044.current_actor_id()
    and exists (select 1 from sih26044.consent_grants g where g.id = consent_grant_id and g.subject_actor_id = sih26044.current_actor_id())
  );

create policy applications_select_subject_or_recruiter on sih26044.applications for select to authenticated
  using (applicant_actor_id = sih26044.current_actor_id() or sih26044.can_recruiter_read_application(id));
create policy applications_insert_subject on sih26044.applications for insert to authenticated
  with check (applicant_actor_id = sih26044.current_actor_id());
create policy application_snapshots_select_subject_or_recruiter on sih26044.application_snapshots for select to authenticated
  using (
    exists (select 1 from sih26044.applications a where a.id = application_id and a.applicant_actor_id = sih26044.current_actor_id())
    or (finalized_at is not null and sih26044.can_recruiter_read_application(application_id))
  );
create policy application_snapshots_insert_subject on sih26044.application_snapshots for insert to authenticated
  with check (exists (select 1 from sih26044.applications a where a.id = application_id and a.applicant_actor_id = sih26044.current_actor_id()));
create policy snapshot_evidence_select_subject_or_recruiter on sih26044.application_snapshot_evidence for select to authenticated
  using (exists (
    select 1 from sih26044.application_snapshots s join sih26044.applications a on a.id = s.application_id
    where s.id = application_snapshot_id
      and (a.applicant_actor_id = sih26044.current_actor_id() or (s.finalized_at is not null and sih26044.can_recruiter_read_application(a.id)))
  ));
create policy snapshot_evidence_insert_subject on sih26044.application_snapshot_evidence for insert to authenticated
  with check (exists (
    select 1 from sih26044.application_snapshots s join sih26044.applications a on a.id = s.application_id
    where s.id = application_snapshot_id and s.finalized_at is null and a.applicant_actor_id = sih26044.current_actor_id()
  ));
create policy snapshot_consents_select_subject_or_recruiter on sih26044.application_snapshot_consents for select to authenticated
  using (exists (
    select 1 from sih26044.application_snapshots s join sih26044.applications a on a.id = s.application_id
    where s.id = application_snapshot_id
      and (a.applicant_actor_id = sih26044.current_actor_id() or (s.finalized_at is not null and sih26044.can_recruiter_read_application(a.id)))
  ));
create policy snapshot_consents_insert_subject on sih26044.application_snapshot_consents for insert to authenticated
  with check (exists (
    select 1 from sih26044.application_snapshots s join sih26044.applications a on a.id = s.application_id
    where s.id = application_snapshot_id and s.finalized_at is null and a.applicant_actor_id = sih26044.current_actor_id()
  ));
create policy application_events_select_subject_or_recruiter on sih26044.application_events for select to authenticated
  using (exists (
    select 1 from sih26044.applications a
    where a.id = application_id and (a.applicant_actor_id = sih26044.current_actor_id() or sih26044.can_recruiter_read_application(a.id))
  ));
create policy application_events_insert_attributed on sih26044.application_events for insert to authenticated
  with check (
    actor_id = sih26044.current_actor_id()
    and sih26044.can_append_application_event(application_id, to_stage, event_kind)
  );

create policy outcomes_select_authorized on sih26044.outcome_events for select to authenticated
  using (sih26044.can_access_outcome(id));
create policy outcomes_insert_authorized_organization on sih26044.outcome_events for insert to authenticated
  with check (
    recorded_by_actor_id = sih26044.current_actor_id()
    and sih26044.has_any_active_organization_role(
      organization_id,
      array['faculty', 'institution_admin', 'recruiter', 'industry_partner']::sih26044.actor_role[]
    )
    and (application_id is null or sih26044.can_recruiter_read_application(application_id))
  );
create policy outcome_snapshots_select_authorized on sih26044.outcome_application_snapshots for select to authenticated
  using (sih26044.can_access_outcome(outcome_event_id));
create policy outcome_snapshots_insert_recorder on sih26044.outcome_application_snapshots for insert to authenticated
  with check (exists (select 1 from sih26044.outcome_events o where o.id = outcome_event_id and o.recorded_by_actor_id = sih26044.current_actor_id()));
create policy outcome_emissions_select_authorized on sih26044.outcome_evidence_emissions for select to authenticated
  using (sih26044.can_access_outcome(outcome_event_id));
create policy outcome_emissions_insert_recorder on sih26044.outcome_evidence_emissions for insert to authenticated
  with check (exists (select 1 from sih26044.outcome_events o where o.id = outcome_event_id and o.recorded_by_actor_id = sih26044.current_actor_id()));

create policy collaborations_select_participant on sih26044.collaboration_engagements for select to authenticated
  using (sih26044.can_access_collaboration(id));
create policy collaborations_insert_host on sih26044.collaboration_engagements for insert to authenticated
  with check (
    created_by_actor_id = sih26044.current_actor_id()
    and sih26044.has_any_active_organization_role(
      host_organization_id,
      array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[]
    )
  );
create policy collaborations_update_participant on sih26044.collaboration_engagements for update to authenticated
  using (sih26044.has_any_active_organization_role(
    host_organization_id,
    array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[]
  ))
  with check (sih26044.has_any_active_organization_role(
    host_organization_id,
    array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[]
  ));
create policy collaboration_partners_select_access on sih26044.collaboration_partner_organizations for select to authenticated
  using (sih26044.can_access_collaboration(collaboration_engagement_id));
create policy collaboration_partners_insert_host on sih26044.collaboration_partner_organizations for insert to authenticated
  with check (exists (
    select 1 from sih26044.collaboration_engagements c
    where c.id = collaboration_engagement_id
      and sih26044.has_any_active_organization_role(c.host_organization_id, array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[])
  ));
create policy collaboration_participants_select_access on sih26044.collaboration_participants for select to authenticated
  using (sih26044.can_access_collaboration(collaboration_engagement_id));
create policy collaboration_participants_insert_host on sih26044.collaboration_participants for insert to authenticated
  with check (exists (
    select 1 from sih26044.collaboration_engagements c
    where c.id = collaboration_engagement_id
      and sih26044.has_any_active_organization_role(c.host_organization_id, array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[])
  ));
create policy collaboration_objectives_select_access on sih26044.collaboration_objectives for select to authenticated
  using (sih26044.can_access_collaboration(collaboration_engagement_id));
create policy collaboration_objectives_insert_host on sih26044.collaboration_objectives for insert to authenticated
  with check (exists (
    select 1 from sih26044.collaboration_engagements c
    where c.id = collaboration_engagement_id
      and sih26044.has_any_active_organization_role(c.host_organization_id, array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[])
  ));

create policy audit_events_select_actor_or_org_auditor on sih26044.audit_events for select to authenticated
  using (
    actor_id = sih26044.current_actor_id()
    or (organization_id is not null and sih26044.has_active_organization_role(organization_id, 'auditor'))
  );
create policy audit_events_insert_attributed on sih26044.audit_events for insert to authenticated
  with check (
    actor_id = sih26044.current_actor_id()
    and (organization_id is null or sih26044.has_active_organization_membership(organization_id))
  );

comment on function sih26044.can_recruiter_read_application(uuid) is
  'Recruiter boundary: own-organization submitted application plus finalized snapshot and active application_review consent. Never raw learner evidence.';
comment on function sih26044.can_access_verification_request(uuid) is
  'Verifier boundary: exact request/evidence, assigned organization role, unexpired request, and active evidence_verification consent.';
