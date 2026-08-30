-- CareerCase × SIH26044: privacy-protected institution/policy Skills Intelligence.
-- Individual learner rows remain inaccessible to institution and policy analytics.
-- This migration exposes only aggregate RPCs with a CareerCase reporting policy
-- of minimum cell size 5. The threshold is a product privacy policy, not a claim
-- of statutory or national methodology.

create or replace function sih26044.is_authorized_policy_program_analyst()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.organization_memberships m
    join sih26044.organization_membership_roles mr on mr.membership_id = m.id
    join sih26044.organizations o on o.id = m.organization_id
    where m.actor_id = sih26044.current_actor_id()
      and m.status = 'active'
      and m.valid_from <= statement_timestamp()
      and (m.valid_until is null or m.valid_until > statement_timestamp())
      and mr.role = 'policy_program_analyst'
      and o.kind = 'government'
      and o.status = 'active'
  )
$$;

create or replace function sih26044.can_read_institution_aggregate(requested_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.organizations target
    where target.id = requested_organization_id
      and target.kind = 'educational_institution'
      and target.status = 'active'
      and (
        sih26044.has_active_organization_role(requested_organization_id, 'institution_admin')
        or sih26044.is_authorized_policy_program_analyst()
      )
  )
$$;

create or replace function sih26044.list_authorized_analytics_institutions()
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
  with candidate as (
    select o.id as organization_id, o.display_name, 'institution_admin'::text as access_mode, 1 as priority
    from sih26044.organizations o
    where o.kind = 'educational_institution'
      and o.status = 'active'
      and sih26044.has_active_organization_role(o.id, 'institution_admin')

    union all

    select o.id, o.display_name, 'policy_program_analyst'::text, 2
    from sih26044.organizations o
    where o.kind = 'educational_institution'
      and o.status = 'active'
      and sih26044.is_authorized_policy_program_analyst()
  ), ranked as (
    select c.*,
      row_number() over (partition by c.organization_id order by c.priority) as rn
    from candidate c
  )
  select r.organization_id, r.display_name, r.access_mode
  from ranked r
  where r.rn = 1
  order by r.display_name, r.organization_id
$$;

create or replace function sih26044.get_institution_skills_intelligence(
  requested_organization_id uuid,
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
  methodology_version constant text := 'institution-skills-intelligence-v1';
  actor_id uuid;
  target_name text;
  access_mode text;
  cohort_size bigint;
  points jsonb;
  result jsonb;
begin
  actor_id := sih26044.current_actor_id();
  if actor_id is null then
    raise exception 'An active SIH actor is required for aggregate analytics';
  end if;
  if requested_organization_id is null then
    raise exception 'Institution organization id is required';
  end if;
  if requested_from is null or requested_to is null or requested_to <= requested_from then
    raise exception 'Analytics time window must have requested_to after requested_from';
  end if;
  if requested_to > statement_timestamp() + interval '1 day' then
    raise exception 'Analytics time window cannot extend materially into the future';
  end if;
  if not sih26044.can_read_institution_aggregate(requested_organization_id) then
    raise exception 'Actor is not authorized for this institution aggregate';
  end if;

  select o.display_name
  into target_name
  from sih26044.organizations o
  where o.id = requested_organization_id
    and o.kind = 'educational_institution'
    and o.status = 'active';

  access_mode := case
    when sih26044.has_active_organization_role(requested_organization_id, 'institution_admin')
      then 'institution_admin'
    else 'policy_program_analyst'
  end;

  select count(distinct m.actor_id)
  into cohort_size
  from sih26044.organization_memberships m
  join sih26044.organization_membership_roles mr on mr.membership_id = m.id
  where m.organization_id = requested_organization_id
    and mr.role = 'learner'
    and m.status in ('active', 'ended')
    and m.valid_from < requested_to
    and (m.valid_until is null or m.valid_until >= requested_from);

  with cohort as (
    select distinct m.actor_id
    from sih26044.organization_memberships m
    join sih26044.organization_membership_roles mr on mr.membership_id = m.id
    where m.organization_id = requested_organization_id
      and mr.role = 'learner'
      and m.status in ('active', 'ended')
      and m.valid_from < requested_to
      and (m.valid_until is null or m.valid_until >= requested_from)
  ),
  latest_readiness as (
    select distinct on (r.subject_actor_id, r.opportunity_version_id)
      r.subject_actor_id,
      r.opportunity_version_id,
      r.readiness_band,
      r.result_body,
      r.generated_at
    from sih26044.opportunity_readiness_results r
    join cohort c on c.actor_id = r.subject_actor_id
    where r.generated_at >= requested_from
      and r.generated_at < requested_to
    order by r.subject_actor_id, r.opportunity_version_id, r.generated_at desc, r.created_at desc
  ),
  readiness_total as (
    select count(*)::bigint as total from latest_readiness
  ),
  readiness_categories as (
    select unnest(enum_range(null::sih26044.readiness_band))::text as label
  ),
  readiness_points as (
    select
      'readiness_distribution'::text as metric,
      jsonb_build_object('readinessBand', rc.label) as dimensions,
      count(lr.subject_actor_id)::bigint as raw_value,
      rt.total as raw_denominator,
      count(distinct lr.subject_actor_id)::bigint as cell_subject_count
    from readiness_categories rc
    cross join readiness_total rt
    left join latest_readiness lr on lr.readiness_band::text = rc.label
    group by rc.label, rt.total
  ),
  required_results as (
    select
      lr.subject_actor_id,
      req.item ->> 'state' as requirement_state
    from latest_readiness lr
    cross join lateral jsonb_array_elements(
      coalesce(lr.result_body -> 'requiredRequirementResults', '[]'::jsonb)
    ) req(item)
  ),
  required_total as (
    select count(*)::bigint as total from required_results
  ),
  evidence_gap_categories as (
    select unnest(array['MET_WEAK_EVIDENCE', 'UNKNOWN']::text[]) as label
  ),
  evidence_gap_points as (
    select
      'evidence_gap_distribution'::text as metric,
      jsonb_build_object('requirementState', ec.label) as dimensions,
      count(rr.subject_actor_id)::bigint as raw_value,
      rt.total as raw_denominator,
      count(distinct rr.subject_actor_id)::bigint as cell_subject_count
    from evidence_gap_categories ec
    cross join required_total rt
    left join required_results rr on rr.requirement_state = ec.label
    group by ec.label, rt.total
  ),
  capability_gap_categories as (
    select unnest(array['PARTIAL', 'GAP']::text[]) as label
  ),
  capability_gap_points as (
    select
      'capability_gap_distribution'::text as metric,
      jsonb_build_object('requirementState', cc.label) as dimensions,
      count(rr.subject_actor_id)::bigint as raw_value,
      rt.total as raw_denominator,
      count(distinct rr.subject_actor_id)::bigint as cell_subject_count
    from capability_gap_categories cc
    cross join required_total rt
    left join required_results rr on rr.requirement_state = cc.label
    group by cc.label, rt.total
  ),
  eligibility_categories as (
    select unnest(array['NEEDS_REVIEW', 'NOT_CURRENTLY_ELIGIBLE']::text[]) as label
  ),
  eligibility_points as (
    select
      'eligibility_gap_distribution'::text as metric,
      jsonb_build_object('eligibilityStatus', ec.label) as dimensions,
      count(lr.subject_actor_id)::bigint as raw_value,
      rt.total as raw_denominator,
      count(distinct lr.subject_actor_id)::bigint as cell_subject_count
    from eligibility_categories ec
    cross join readiness_total rt
    left join latest_readiness lr on lr.result_body ->> 'eligibilityStatus' = ec.label
    group by ec.label, rt.total
  ),
  application_cases as (
    select
      a.id as application_id,
      a.applicant_actor_id,
      a.opportunity_version_id,
      coalesce((
        select e.to_stage::text
        from sih26044.application_events e
        where e.application_id = a.id
        order by e.sequence_number desc
        limit 1
      ), a.initial_stage::text) as current_stage
    from sih26044.applications a
    join cohort c on c.actor_id = a.applicant_actor_id
    where a.created_at >= requested_from
      and a.created_at < requested_to
  ),
  application_total as (
    select count(*)::bigint as total from application_cases
  ),
  application_categories as (
    select unnest(enum_range(null::sih26044.application_stage))::text as label
  ),
  application_points as (
    select
      'application_funnel'::text as metric,
      jsonb_build_object('stage', ac.label) as dimensions,
      count(app.application_id)::bigint as raw_value,
      at.total as raw_denominator,
      count(distinct app.applicant_actor_id)::bigint as cell_subject_count
    from application_categories ac
    cross join application_total at
    left join application_cases app on app.current_stage = ac.label
    group by ac.label, at.total
  ),
  outcome_cases as (
    select o.id, o.subject_actor_id, o.kind::text as outcome_kind
    from sih26044.outcome_events o
    join cohort c on c.actor_id = o.subject_actor_id
    where o.occurred_at >= requested_from
      and o.occurred_at < requested_to
  ),
  outcome_total as (
    select count(*)::bigint as total from outcome_cases
  ),
  outcome_categories as (
    select unnest(enum_range(null::sih26044.outcome_kind))::text as label
  ),
  outcome_points as (
    select
      'outcome_distribution'::text as metric,
      jsonb_build_object('outcomeKind', oc.label) as dimensions,
      count(o.id)::bigint as raw_value,
      ot.total as raw_denominator,
      count(distinct o.subject_actor_id)::bigint as cell_subject_count
    from outcome_categories oc
    cross join outcome_total ot
    left join outcome_cases o on o.outcome_kind = oc.label
    group by oc.label, ot.total
  ),
  collaboration_cases as (
    select distinct ce.id, ce.kind::text as collaboration_kind
    from sih26044.collaboration_engagements ce
    left join sih26044.collaboration_partner_organizations po
      on po.collaboration_engagement_id = ce.id
    where (ce.host_organization_id = requested_organization_id
      or po.organization_id = requested_organization_id)
      and coalesce(ce.starts_at, ce.created_at) < requested_to
      and coalesce(ce.ends_at, requested_to) >= requested_from
  ),
  collaboration_total as (
    select count(*)::bigint as total from collaboration_cases
  ),
  collaboration_categories as (
    select unnest(enum_range(null::sih26044.collaboration_kind))::text as label
  ),
  collaboration_points as (
    select
      'faculty_industry_engagement'::text as metric,
      jsonb_build_object('collaborationKind', cc.label) as dimensions,
      count(distinct ce.id)::bigint as raw_value,
      ct.total as raw_denominator,
      count(distinct cp.actor_id)::bigint as cell_subject_count
    from collaboration_categories cc
    cross join collaboration_total ct
    left join collaboration_cases ce on ce.collaboration_kind = cc.label
    left join sih26044.collaboration_participants cp
      on cp.collaboration_engagement_id = ce.id
    group by cc.label, ct.total
  ),
  requirement_pattern_points as (
    select
      'requirement_pattern'::text as metric,
      jsonb_build_object(
        'requirementLabel', coalesce(r.canonical_skill_label, r.literal_source_wording),
        'priority', r.priority::text
      ) as dimensions,
      count(distinct app.application_id)::bigint as raw_value,
      at.total as raw_denominator,
      count(distinct app.applicant_actor_id)::bigint as cell_subject_count
    from application_cases app
    join sih26044.opportunity_requirements r
      on r.opportunity_version_id = app.opportunity_version_id
    cross join application_total at
    where r.priority = 'required'
    group by coalesce(r.canonical_skill_label, r.literal_source_wording), r.priority, at.total
    having count(distinct app.applicant_actor_id) >= minimum_cell_size
  ),
  all_points as (
    select * from readiness_points
    union all select * from evidence_gap_points
    union all select * from capability_gap_points
    union all select * from eligibility_points
    union all select * from application_points
    union all select * from outcome_points
    union all select * from collaboration_points
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
  )
  into points
  from all_points p;

  result := jsonb_build_object(
    'generatedAt', statement_timestamp(),
    'organization', jsonb_build_object(
      'id', requested_organization_id,
      'displayName', target_name
    ),
    'accessMode', access_mode,
    'query', jsonb_build_object(
      'organizationId', requested_organization_id,
      'metrics', jsonb_build_array(
        'readiness_distribution',
        'evidence_gap_distribution',
        'capability_gap_distribution',
        'eligibility_gap_distribution',
        'application_funnel',
        'outcome_distribution',
        'faculty_industry_engagement',
        'requirement_pattern'
      ),
      'from', requested_from,
      'to', requested_to,
      'groupBy', '[]'::jsonb,
      'minimumCohortSize', minimum_cell_size
    ),
    'cohort', jsonb_build_object(
      'size', case when cohort_size < minimum_cell_size then null else cohort_size end,
      'suppressed', cohort_size < minimum_cell_size,
      'suppressionReason', case when cohort_size < minimum_cell_size then 'below_minimum_cell_size' else null end
    ),
    'points', points,
    'methodologyVersion', methodology_version,
    'sourceLabel', 'CareerCase SIH26044 tenant records; descriptive aggregate only',
    'scopeNote', 'This view is institution-scoped. It is not a national labour-market estimate and does not rank candidates.',
    'privacy', jsonb_build_object(
      'minimumCellSize', minimum_cell_size,
      'policyLabel', 'CareerCase aggregate reporting policy v1',
      'individualDrilldown', false
    )
  );

  if sih26044.has_prohibited_json_keys(result) then
    raise exception 'Aggregate analytics result contains a prohibited private or high-stakes key';
  end if;

  perform sih26044.record_authoritative_audit(
    actor_id,
    null,
    requested_organization_id,
    'analytics.institution_aggregate_viewed',
    'organizations',
    requested_organization_id::text,
    'aggregate_analytics',
    jsonb_build_object(
      'methodologyVersion', methodology_version,
      'minimumCellSize', minimum_cell_size,
      'from', requested_from,
      'to', requested_to,
      'accessMode', access_mode
    )
  );

  return result;
end
$$;

revoke all on function sih26044.is_authorized_policy_program_analyst() from public, anon, authenticated;
revoke all on function sih26044.can_read_institution_aggregate(uuid) from public, anon, authenticated;
revoke all on function sih26044.list_authorized_analytics_institutions() from public, anon;
revoke all on function sih26044.get_institution_skills_intelligence(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function sih26044.list_authorized_analytics_institutions() to authenticated;
grant execute on function sih26044.get_institution_skills_intelligence(uuid, timestamptz, timestamptz) to authenticated;

comment on function sih26044.get_institution_skills_intelligence(uuid, timestamptz, timestamptz) is
  'Privacy-protected, descriptive institution Skills Intelligence. Minimum cell size 5 is a CareerCase product reporting policy. No individual learner rows or private Career Guidance inputs are returned.';
