-- CareerCase × SIH26044: employer/opportunity Skills Intelligence.
-- Applicant-derived analytics are computed only from exact immutable submitted
-- snapshots whose subjects hold active aggregate_analytics consent for the
-- employer. Small cells are structurally suppressed; no individual drill-down.

create or replace function sih26044.can_read_industry_aggregate(requested_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.organizations o
    where o.id = requested_organization_id
      and o.kind = 'employer'
      and o.status = 'active'
      and sih26044.has_any_active_organization_role(
        requested_organization_id,
        array['recruiter', 'industry_partner']::sih26044.actor_role[]
      )
  )
$$;

create or replace function sih26044.list_authorized_industry_analytics_organizations()
returns table (
  organization_id uuid,
  display_name text,
  access_mode text
)
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select
    o.id,
    o.display_name,
    case
      when sih26044.has_active_organization_role(o.id, 'recruiter') then 'recruiter'::text
      else 'industry_partner'::text
    end
  from sih26044.organizations o
  where o.kind = 'employer'
    and o.status = 'active'
    and sih26044.has_any_active_organization_role(
      o.id,
      array['recruiter', 'industry_partner']::sih26044.actor_role[]
    )
  order by o.display_name, o.id
$$;

create or replace function sih26044.list_authorized_industry_analytics_opportunities(
  requested_organization_id uuid
)
returns table (
  opportunity_version_id uuid,
  title text,
  opportunity_type text,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
begin
  if not sih26044.can_read_industry_aggregate(requested_organization_id) then
    raise exception 'Actor is not authorized for this employer analytics scope';
  end if;

  return query
  select v.id, v.title, v.opportunity_type::text, v.published_at
  from sih26044.opportunities o
  join sih26044.opportunity_versions v on v.opportunity_id = o.id
  where o.owner_organization_id = requested_organization_id
    and v.status = 'published'
  order by v.published_at desc nulls last, v.created_at desc, v.id;
end
$$;

create or replace function sih26044.get_industry_skills_intelligence(
  requested_organization_id uuid,
  requested_opportunity_version_id uuid,
  requested_from timestamptz,
  requested_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  minimum_cell_size constant integer := 5;
  methodology_version constant text := 'industry-skills-intelligence-v1';
  actor_id uuid;
  target_name text;
  access_mode text;
  cohort_size bigint;
  points jsonb;
  result jsonb;
begin
  actor_id := sih26044.current_actor_id();
  if actor_id is null then
    raise exception 'An active SIH actor is required for industry aggregate analytics';
  end if;
  if requested_organization_id is null then
    raise exception 'Employer organization id is required';
  end if;
  if requested_from is null or requested_to is null or requested_to <= requested_from then
    raise exception 'Industry analytics time window must have requested_to after requested_from';
  end if;
  if requested_to > statement_timestamp() + interval '1 day' then
    raise exception 'Industry analytics time window cannot extend materially into the future';
  end if;
  if not sih26044.can_read_industry_aggregate(requested_organization_id) then
    raise exception 'Actor is not authorized for this employer aggregate';
  end if;
  if requested_opportunity_version_id is not null and not exists (
    select 1
    from sih26044.opportunity_versions v
    join sih26044.opportunities o on o.id = v.opportunity_id
    where v.id = requested_opportunity_version_id
      and o.owner_organization_id = requested_organization_id
      and v.status = 'published'
  ) then
    raise exception 'Opportunity version is outside the authorized employer analytics scope';
  end if;

  select o.display_name into target_name
  from sih26044.organizations o
  where o.id = requested_organization_id;

  access_mode := case
    when sih26044.has_active_organization_role(requested_organization_id, 'recruiter') then 'recruiter'
    else 'industry_partner'
  end;

  with submitted as (
    select
      a.id as application_id,
      a.applicant_actor_id,
      a.opportunity_version_id,
      submitted.application_snapshot_id,
      submitted.occurred_at as submitted_at,
      s.readiness_result_id,
      s.recruiter_allowlist_projection,
      sih26044.current_application_stage(a.id)::text as current_stage
    from sih26044.applications a
    join sih26044.application_events submitted
      on submitted.application_id = a.id
      and submitted.to_stage = 'applied'
      and submitted.event_kind = 'stage_transition'
    join sih26044.application_snapshots s
      on s.id = submitted.application_snapshot_id
      and s.application_id = a.id
      and s.finalized_at is not null
      and s.integrity_fingerprint is not null
    where a.owner_organization_id = requested_organization_id
      and (requested_opportunity_version_id is null or a.opportunity_version_id = requested_opportunity_version_id)
      and submitted.occurred_at >= requested_from
      and submitted.occurred_at < requested_to
      and exists (
        select 1
        from sih26044.consent_grants g
        where g.subject_actor_id = a.applicant_actor_id
          and g.grantee_organization_id = requested_organization_id
          and g.purpose = 'aggregate_analytics'
          and sih26044.is_consent_active(
            g.id,
            a.applicant_actor_id,
            requested_organization_id,
            'aggregate_analytics'
          )
      )
  )
  select count(distinct applicant_actor_id) into cohort_size from submitted;

  with submitted as (
    select
      a.id as application_id,
      a.applicant_actor_id,
      a.opportunity_version_id,
      submitted.application_snapshot_id,
      submitted.occurred_at as submitted_at,
      s.readiness_result_id,
      s.recruiter_allowlist_projection,
      sih26044.current_application_stage(a.id)::text as current_stage,
      v.opportunity_type::text as opportunity_type
    from sih26044.applications a
    join sih26044.application_events submitted
      on submitted.application_id = a.id
      and submitted.to_stage = 'applied'
      and submitted.event_kind = 'stage_transition'
    join sih26044.application_snapshots s
      on s.id = submitted.application_snapshot_id
      and s.application_id = a.id
      and s.finalized_at is not null
      and s.integrity_fingerprint is not null
    join sih26044.opportunity_versions v on v.id = a.opportunity_version_id
    where a.owner_organization_id = requested_organization_id
      and (requested_opportunity_version_id is null or a.opportunity_version_id = requested_opportunity_version_id)
      and submitted.occurred_at >= requested_from
      and submitted.occurred_at < requested_to
      and exists (
        select 1
        from sih26044.consent_grants g
        where g.subject_actor_id = a.applicant_actor_id
          and g.grantee_organization_id = requested_organization_id
          and g.purpose = 'aggregate_analytics'
          and sih26044.is_consent_active(
            g.id,
            a.applicant_actor_id,
            requested_organization_id,
            'aggregate_analytics'
          )
      )
  ),
  submitted_total as (
    select count(*)::bigint as total from submitted
  ),
  application_count_point as (
    select
      'application_count'::text as metric,
      jsonb_build_object('scope', case when requested_opportunity_version_id is null then 'organization' else 'opportunity_version' end) as dimensions,
      count(*)::bigint as raw_value,
      count(*)::bigint as raw_denominator,
      count(distinct applicant_actor_id)::bigint as cell_subject_count
    from submitted
  ),
  eligibility_categories as (
    select unnest(array['ELIGIBLE','NEEDS_REVIEW','NOT_CURRENTLY_ELIGIBLE']::text[]) as label
  ),
  eligibility_rows as (
    select
      s.applicant_actor_id,
      coalesce(r.result_body ->> 'eligibilityStatus', 'NEEDS_REVIEW') as eligibility_status
    from submitted s
    join sih26044.opportunity_readiness_results r on r.id = s.readiness_result_id
  ),
  eligibility_points as (
    select
      'eligibility_distribution'::text as metric,
      jsonb_build_object('eligibilityStatus', c.label) as dimensions,
      count(e.applicant_actor_id)::bigint as raw_value,
      (select total from submitted_total) as raw_denominator,
      count(distinct e.applicant_actor_id)::bigint as cell_subject_count
    from eligibility_categories c
    left join eligibility_rows e on e.eligibility_status = c.label
    group by c.label
  ),
  readiness_categories as (
    select unnest(enum_range(null::sih26044.readiness_band))::text as label
  ),
  readiness_points as (
    select
      'readiness_distribution'::text as metric,
      jsonb_build_object('readinessBand', c.label) as dimensions,
      count(s.applicant_actor_id)::bigint as raw_value,
      (select total from submitted_total) as raw_denominator,
      count(distinct s.applicant_actor_id)::bigint as cell_subject_count
    from readiness_categories c
    left join submitted s on s.recruiter_allowlist_projection ->> 'readinessBand' = c.label
    group by c.label
  ),
  requirement_rows as (
    select
      s.applicant_actor_id,
      req.item ->> 'requirementId' as requirement_id,
      req.item ->> 'literalSourceWording' as requirement_label,
      req.item ->> 'priority' as priority,
      req.item ->> 'state' as requirement_state
    from submitted s
    cross join lateral jsonb_array_elements(coalesce(s.recruiter_allowlist_projection -> 'requirements', '[]'::jsonb)) req(item)
  ),
  requirement_totals as (
    select requirement_id, count(distinct applicant_actor_id)::bigint as total
    from requirement_rows
    group by requirement_id
  ),
  support_categories as (
    select unnest(array['MET_STRONG','MET_WEAK_EVIDENCE','PARTIAL','UNKNOWN','GAP','NOT_APPLICABLE']::text[]) as label
  ),
  requirement_support_points as (
    select
      'requirement_support_distribution'::text as metric,
      jsonb_build_object(
        'requirementId', r.requirement_id,
        'requirementLabel', max(r.requirement_label),
        'priority', max(r.priority),
        'requirementState', c.label
      ) as dimensions,
      count(rr.applicant_actor_id)::bigint as raw_value,
      max(t.total)::bigint as raw_denominator,
      count(distinct rr.applicant_actor_id)::bigint as cell_subject_count
    from (select distinct requirement_id, requirement_label, priority from requirement_rows) r
    join requirement_totals t on t.requirement_id = r.requirement_id
    cross join support_categories c
    left join requirement_rows rr
      on rr.requirement_id = r.requirement_id
      and rr.requirement_state = c.label
    group by r.requirement_id, c.label
  ),
  evidence_gap_points as (
    select
      'evidence_gap_distribution'::text as metric,
      jsonb_build_object(
        'requirementId', r.requirement_id,
        'requirementLabel', max(r.requirement_label),
        'gapKind', 'weak_or_unknown_evidence'
      ) as dimensions,
      count(distinct case when r.requirement_state in ('MET_WEAK_EVIDENCE','UNKNOWN') then r.applicant_actor_id end)::bigint as raw_value,
      max(t.total)::bigint as raw_denominator,
      count(distinct case when r.requirement_state in ('MET_WEAK_EVIDENCE','UNKNOWN') then r.applicant_actor_id end)::bigint as cell_subject_count
    from requirement_rows r
    join requirement_totals t on t.requirement_id = r.requirement_id
    where r.priority = 'required'
    group by r.requirement_id
  ),
  application_categories as (
    select unnest(enum_range(null::sih26044.application_stage))::text as label
  ),
  application_points as (
    select
      'application_funnel'::text as metric,
      jsonb_build_object('stage', c.label) as dimensions,
      count(s.application_id)::bigint as raw_value,
      (select total from submitted_total) as raw_denominator,
      count(distinct s.applicant_actor_id)::bigint as cell_subject_count
    from application_categories c
    left join submitted s on s.current_stage = c.label
    group by c.label
  ),
  evidence_request_point as (
    select
      'evidence_request_burden'::text as metric,
      jsonb_build_object('event', 'evidence_requested') as dimensions,
      count(distinct s.application_id)::bigint as raw_value,
      (select total from submitted_total) as raw_denominator,
      count(distinct s.applicant_actor_id)::bigint as cell_subject_count
    from submitted s
    where exists (
      select 1 from sih26044.application_events e
      where e.application_id = s.application_id and e.to_stage = 'evidence_requested'
    )
  ),
  outcome_rows as (
    select o.id, o.kind::text as outcome_kind, o.subject_actor_id
    from sih26044.outcome_events o
    join submitted s on s.application_id = o.application_id
    where o.organization_id = requested_organization_id
      and o.occurred_at >= requested_from
      and o.occurred_at < requested_to
  ),
  outcome_total as (
    select count(*)::bigint as total from outcome_rows
  ),
  outcome_categories as (
    select unnest(enum_range(null::sih26044.outcome_kind))::text as label
  ),
  outcome_points as (
    select
      'outcome_distribution'::text as metric,
      jsonb_build_object('outcomeKind', c.label) as dimensions,
      count(o.id)::bigint as raw_value,
      (select total from outcome_total) as raw_denominator,
      count(distinct o.subject_actor_id)::bigint as cell_subject_count
    from outcome_categories c
    left join outcome_rows o on o.outcome_kind = c.label
    group by c.label
  ),
  requirement_pattern_base as (
    select
      coalesce(r.canonical_skill_label, r.literal_source_wording) as requirement_label,
      r.priority::text as priority,
      v.id as opportunity_version_id
    from sih26044.opportunities o
    join sih26044.opportunity_versions v on v.opportunity_id = o.id and v.status = 'published'
    join sih26044.opportunity_requirements r on r.opportunity_version_id = v.id
    where o.owner_organization_id = requested_organization_id
      and (requested_opportunity_version_id is null or v.id = requested_opportunity_version_id)
      and v.published_at >= requested_from
      and v.published_at < requested_to
  ),
  requirement_pattern_total as (
    select count(distinct opportunity_version_id)::bigint as total from requirement_pattern_base
  ),
  requirement_pattern_points as (
    select
      'requirement_pattern'::text as metric,
      jsonb_build_object('requirementLabel', requirement_label, 'priority', priority) as dimensions,
      count(distinct opportunity_version_id)::bigint as raw_value,
      (select total from requirement_pattern_total) as raw_denominator,
      count(distinct opportunity_version_id)::bigint as cell_subject_count
    from requirement_pattern_base
    group by requirement_label, priority
  ),
  all_points as (
    select * from application_count_point
    union all select * from eligibility_points
    union all select * from readiness_points
    union all select * from requirement_support_points
    union all select * from evidence_gap_points
    union all select * from application_points
    union all select * from evidence_request_point
    union all select * from outcome_points
    union all select * from requirement_pattern_points
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'dimensions', p.dimensions,
        'metric', p.metric,
        'value', case when p.cell_subject_count < minimum_cell_size then null else p.raw_value end,
        'denominator', case when p.cell_subject_count < minimum_cell_size then null else p.raw_denominator end,
        'cohortSize', case when p.cell_subject_count < minimum_cell_size then null else p.cell_subject_count end,
        'suppressed', p.cell_subject_count < minimum_cell_size,
        'suppressionReason', case when p.cell_subject_count < minimum_cell_size then 'below_minimum_cell_size' else null end,
        'interpretation', 'descriptive',
        'causalClaimed', false
      )
      order by p.metric, p.dimensions::text
    ),
    '[]'::jsonb
  ) into points
  from all_points p;

  result := jsonb_build_object(
    'generatedAt', statement_timestamp(),
    'organization', jsonb_build_object('id', requested_organization_id, 'displayName', target_name),
    'accessMode', access_mode,
    'query', jsonb_build_object(
      'organizationId', requested_organization_id,
      'opportunityVersionId', requested_opportunity_version_id,
      'metrics', jsonb_build_array(
        'application_count',
        'eligibility_distribution',
        'readiness_distribution',
        'requirement_support_distribution',
        'evidence_gap_distribution',
        'application_funnel',
        'evidence_request_burden',
        'outcome_distribution',
        'requirement_pattern'
      ),
      'from', requested_from,
      'to', requested_to,
      'groupBy', case when requested_opportunity_version_id is null then jsonb_build_array('opportunity_type') else '[]'::jsonb end,
      'minimumCohortSize', minimum_cell_size
    ),
    'cohort', jsonb_build_object(
      'size', case when cohort_size < minimum_cell_size then null else cohort_size end,
      'suppressed', cohort_size < minimum_cell_size,
      'suppressionReason', case when cohort_size < minimum_cell_size then 'below_minimum_cell_size' else null end
    ),
    'points', points,
    'methodologyVersion', methodology_version,
    'sourceLabel', 'CareerCase employer-owned opportunities plus consented immutable application snapshots; descriptive aggregate only',
    'scopeNote', 'This employer/opportunity view describes the selected CareerCase source set and time window. It does not rank candidates, predict hiring, or represent national labour-market demand.',
    'privacy', jsonb_build_object(
      'minimumCellSize', minimum_cell_size,
      'policyLabel', 'CareerCase aggregate reporting policy v1',
      'individualDrilldown', false,
      'consentPurpose', 'aggregate_analytics'
    )
  );

  if sih26044.has_prohibited_json_keys(result) then
    raise exception 'Industry aggregate result contains a prohibited private or high-stakes key';
  end if;

  perform sih26044.record_authoritative_audit(
    actor_id,
    null,
    requested_organization_id,
    'analytics.industry_aggregate_viewed',
    'organizations',
    requested_organization_id::text,
    'aggregate_analytics',
    jsonb_build_object(
      'methodologyVersion', methodology_version,
      'minimumCellSize', minimum_cell_size,
      'from', requested_from,
      'to', requested_to,
      'opportunityVersionId', requested_opportunity_version_id,
      'accessMode', access_mode
    )
  );

  return result;
end
$$;

revoke all on function sih26044.can_read_industry_aggregate(uuid) from public, anon, authenticated;
revoke all on function sih26044.list_authorized_industry_analytics_organizations() from public, anon;
revoke all on function sih26044.list_authorized_industry_analytics_opportunities(uuid) from public, anon;
revoke all on function sih26044.get_industry_skills_intelligence(uuid, uuid, timestamptz, timestamptz) from public, anon;

grant execute on function sih26044.list_authorized_industry_analytics_organizations() to authenticated;
grant execute on function sih26044.list_authorized_industry_analytics_opportunities(uuid) to authenticated;
grant execute on function sih26044.get_industry_skills_intelligence(uuid, uuid, timestamptz, timestamptz) to authenticated;

comment on function sih26044.get_industry_skills_intelligence(uuid, uuid, timestamptz, timestamptz) is
  'Privacy-protected employer/opportunity Skills Intelligence computed from exact immutable submitted snapshots with active aggregate_analytics consent. Small applicant cells are suppressed; no individual drill-down, ranking, or hiring prediction.';
