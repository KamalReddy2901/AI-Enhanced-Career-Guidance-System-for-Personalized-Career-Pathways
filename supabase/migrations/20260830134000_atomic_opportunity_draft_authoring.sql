-- CareerCase × SIH26044: atomic production opportunity draft authoring.
-- This RPC is the authenticated write boundary for human-authored opportunity
-- drafts. It derives actor authority from the session, preserves unresolved
-- literal wording, stores review-only suggestions losslessly, and never
-- publishes implicitly.

create or replace function sih26044.save_opportunity_draft(
  requested_owner_organization_id uuid,
  requested_opportunity_id uuid,
  requested_version_id uuid,
  requested_payload jsonb
)
returns table (
  opportunity_id uuid,
  opportunity_version_id uuid,
  version_number integer
)
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  actor_id uuid;
  target_opportunity_id uuid;
  target_version_id uuid;
  target_version_number integer;
  target_owner_organization_id uuid;
  target_version_status sih26044.opportunity_version_status;
  requirement_item jsonb;
  eligibility_item jsonb;
  requirement_ordinal bigint;
  eligibility_ordinal bigint;
  requirement_category sih26044.requirement_category;
  requirement_resolution_status sih26044.requirement_resolution_status;
  requirement_canonical_resolution sih26044.canonical_resolution_state;
  requirement_human_confirmed boolean;
  eligibility_human_confirmed boolean;
  confirmation_method_text text;
  requirements_payload jsonb;
  eligibility_payload jsonb;
begin
  actor_id := sih26044.current_actor_id();
  if actor_id is null then
    raise exception 'An active SIH actor is required to save an opportunity draft';
  end if;

  if requested_payload is null or jsonb_typeof(requested_payload) <> 'object' then
    raise exception 'Opportunity draft payload must be a JSON object';
  end if;

  if not sih26044.has_any_active_organization_role(
    requested_owner_organization_id,
    array['recruiter', 'industry_partner', 'institution_admin', 'faculty']::sih26044.actor_role[]
  ) then
    raise exception 'Actor is not authorized to author opportunities for this organization';
  end if;

  if length(btrim(coalesce(requested_payload->>'title', ''))) = 0 then
    raise exception 'Opportunity title is required';
  end if;
  if length(btrim(coalesce(requested_payload->>'description', ''))) = 0 then
    raise exception 'Opportunity description is required';
  end if;
  if jsonb_typeof(requested_payload->'audiences') <> 'array'
     or jsonb_array_length(requested_payload->'audiences') = 0 then
    raise exception 'At least one opportunity audience is required';
  end if;

  requirements_payload := coalesce(requested_payload->'requirements', '[]'::jsonb);
  eligibility_payload := coalesce(requested_payload->'eligibilityRules', '[]'::jsonb);
  if jsonb_typeof(requirements_payload) <> 'array' then
    raise exception 'Opportunity requirements must be a JSON array';
  end if;
  if jsonb_typeof(eligibility_payload) <> 'array' then
    raise exception 'Eligibility rules must be a JSON array';
  end if;

  if requested_opportunity_id is null then
    if requested_version_id is not null then
      raise exception 'A version id cannot be supplied without an opportunity id';
    end if;

    insert into sih26044.opportunities (
      owner_organization_id,
      status,
      created_by_actor_id
    ) values (
      requested_owner_organization_id,
      'draft',
      actor_id
    )
    returning id into target_opportunity_id;

    target_version_number := 1;
    insert into sih26044.opportunity_versions (
      opportunity_id,
      version_number,
      status,
      title,
      description,
      opportunity_type,
      audiences,
      source_system,
      source_captured_at,
      source_literal_text,
      closes_at,
      created_by_actor_id
    ) values (
      target_opportunity_id,
      target_version_number,
      'draft',
      requested_payload->>'title',
      requested_payload->>'description',
      (requested_payload->>'opportunityType')::sih26044.opportunity_type,
      array(select jsonb_array_elements_text(requested_payload->'audiences'))::sih26044.opportunity_audience[],
      'careercase_human_authoring',
      statement_timestamp(),
      coalesce(requested_payload->>'sourceLiteralText', requested_payload->>'description'),
      nullif(requested_payload->>'closesAt', '')::timestamptz,
      actor_id
    )
    returning id into target_version_id;
  else
    select o.owner_organization_id
    into target_owner_organization_id
    from sih26044.opportunities o
    where o.id = requested_opportunity_id
    for update;

    if target_owner_organization_id is null then
      raise exception 'Opportunity not found';
    end if;
    if target_owner_organization_id <> requested_owner_organization_id then
      raise exception 'Opportunity owner organization cannot be changed through draft save';
    end if;
    if not sih26044.can_manage_opportunity(requested_opportunity_id) then
      raise exception 'Actor is not authorized to manage this opportunity';
    end if;

    target_opportunity_id := requested_opportunity_id;

    if requested_version_id is null then
      select coalesce(max(v.version_number), 0) + 1
      into target_version_number
      from sih26044.opportunity_versions v
      where v.opportunity_id = target_opportunity_id;

      insert into sih26044.opportunity_versions (
        opportunity_id,
        version_number,
        status,
        title,
        description,
        opportunity_type,
        audiences,
        source_system,
        source_captured_at,
        source_literal_text,
        closes_at,
        created_by_actor_id
      ) values (
        target_opportunity_id,
        target_version_number,
        'draft',
        requested_payload->>'title',
        requested_payload->>'description',
        (requested_payload->>'opportunityType')::sih26044.opportunity_type,
        array(select jsonb_array_elements_text(requested_payload->'audiences'))::sih26044.opportunity_audience[],
        'careercase_human_authoring',
        statement_timestamp(),
        coalesce(requested_payload->>'sourceLiteralText', requested_payload->>'description'),
        nullif(requested_payload->>'closesAt', '')::timestamptz,
        actor_id
      )
      returning id into target_version_id;
    else
      select v.status, v.version_number
      into target_version_status, target_version_number
      from sih26044.opportunity_versions v
      where v.id = requested_version_id
        and v.opportunity_id = target_opportunity_id
      for update;

      if target_version_status is null then
        raise exception 'Opportunity draft version not found';
      end if;
      if target_version_status <> 'draft' then
        raise exception 'Published opportunity versions are immutable; create a new draft version';
      end if;

      target_version_id := requested_version_id;
      update sih26044.opportunity_versions
      set title = requested_payload->>'title',
          description = requested_payload->>'description',
          opportunity_type = (requested_payload->>'opportunityType')::sih26044.opportunity_type,
          audiences = array(select jsonb_array_elements_text(requested_payload->'audiences'))::sih26044.opportunity_audience[],
          source_system = 'careercase_human_authoring',
          source_captured_at = statement_timestamp(),
          source_literal_text = coalesce(requested_payload->>'sourceLiteralText', requested_payload->>'description'),
          closes_at = nullif(requested_payload->>'closesAt', '')::timestamptz
      where id = target_version_id;

      delete from sih26044.opportunity_requirements
      where opportunity_version_id = target_version_id;
      delete from sih26044.eligibility_rules
      where opportunity_version_id = target_version_id;
    end if;
  end if;

  for requirement_item, requirement_ordinal in
    select value, ordinality - 1
    from jsonb_array_elements(requirements_payload) with ordinality
  loop
    requirement_category := (requirement_item->>'category')::sih26044.requirement_category;
    requirement_human_confirmed := coalesce((requirement_item->>'humanConfirmed')::boolean, false);
    confirmation_method_text := requirement_item->>'confirmationMethod';

    if length(btrim(coalesce(requirement_item->>'literalSourceWording', ''))) = 0 then
      raise exception 'Every requirement must preserve non-empty literal source wording';
    end if;
    if requirement_human_confirmed and confirmation_method_text not in (
      'structured_human_entry', 'ai_assisted_review', 'connector_review'
    ) then
      raise exception 'Production authoring requires an explicit non-fixture human confirmation method';
    end if;

    if requirement_category = 'skill' then
      requirement_resolution_status := (requirement_item->>'resolutionStatus')::sih26044.requirement_resolution_status;
      requirement_canonical_resolution := (requirement_item->>'canonicalResolution')::sih26044.canonical_resolution_state;

      if requirement_resolution_status = 'resolved' then
        if requirement_canonical_resolution not in ('exact', 'alias')
           or length(btrim(coalesce(requirement_item->>'canonicalSkillId', ''))) = 0
           or length(btrim(coalesce(requirement_item->>'canonicalSkillLabel', ''))) = 0 then
          raise exception 'Resolved skills require exact/alias resolution plus canonical id and label';
        end if;
      elsif requirement_resolution_status = 'review_required' then
        if requirement_canonical_resolution <> 'unresolved'
           or requirement_human_confirmed
           or jsonb_typeof(coalesce(requirement_item->'resolutionSuggestions', '[]'::jsonb)) <> 'array'
           or jsonb_array_length(coalesce(requirement_item->'resolutionSuggestions', '[]'::jsonb)) = 0 then
          raise exception 'review_required skills must remain unconfirmed, unresolved, and retain review-only suggestions';
        end if;
      elsif requirement_resolution_status = 'unresolved' then
        if requirement_canonical_resolution <> 'unresolved' then
          raise exception 'Unresolved skills must retain unresolved canonical resolution';
        end if;
      end if;
    else
      requirement_resolution_status := null;
      requirement_canonical_resolution := null;
    end if;

    insert into sih26044.opportunity_requirements (
      opportunity_version_id,
      ordinal,
      category,
      priority,
      literal_source_wording,
      importance,
      evidence_expectation,
      hard_gate,
      canonical_resolution,
      canonical_skill_id,
      canonical_skill_label,
      minimum_proficiency,
      minimum_years,
      category_payload,
      human_confirmed,
      confirmed_by_actor_id,
      confirmed_at,
      confirmation_method,
      resolution_status,
      resolution_suggestions
    ) values (
      target_version_id,
      requirement_ordinal::integer,
      requirement_category,
      (requirement_item->>'priority')::sih26044.requirement_priority,
      requirement_item->>'literalSourceWording',
      (requirement_item->>'importance')::smallint,
      (requirement_item->>'evidenceExpectation')::sih26044.requirement_evidence_expectation,
      coalesce((requirement_item->>'hardGate')::boolean, false),
      requirement_canonical_resolution,
      case when requirement_category = 'skill' and requirement_resolution_status = 'resolved'
        then requirement_item->>'canonicalSkillId' else null end,
      case when requirement_category = 'skill'
        then coalesce(nullif(requirement_item->>'canonicalSkillLabel', ''), requirement_item->>'literalSourceWording')
        else null end,
      nullif(requirement_item->>'minimumProficiency', '')::smallint,
      nullif(requirement_item->>'minimumYears', '')::numeric,
      coalesce(requirement_item->'categoryPayload', '{}'::jsonb),
      requirement_human_confirmed,
      case when requirement_human_confirmed then actor_id else null end,
      case when requirement_human_confirmed then statement_timestamp() else null end,
      case when requirement_human_confirmed then confirmation_method_text::sih26044.human_confirmation_method else null end,
      requirement_resolution_status,
      case when requirement_resolution_status = 'review_required'
        then coalesce(requirement_item->'resolutionSuggestions', '[]'::jsonb)
        else '[]'::jsonb end
    );
  end loop;

  for eligibility_item, eligibility_ordinal in
    select value, ordinality - 1
    from jsonb_array_elements(eligibility_payload) with ordinality
  loop
    eligibility_human_confirmed := coalesce((eligibility_item->>'humanConfirmed')::boolean, false);
    confirmation_method_text := eligibility_item->>'confirmationMethod';

    if length(btrim(coalesce(eligibility_item->>'literalSourceWording', ''))) = 0 then
      raise exception 'Every eligibility rule must preserve non-empty literal source wording';
    end if;
    if eligibility_human_confirmed and confirmation_method_text not in (
      'structured_human_entry', 'ai_assisted_review', 'connector_review'
    ) then
      raise exception 'Production authoring requires an explicit non-fixture human confirmation method';
    end if;

    insert into sih26044.eligibility_rules (
      opportunity_version_id,
      ordinal,
      rule_kind,
      literal_source_wording,
      typed_rule_definition,
      human_confirmed,
      confirmed_by_actor_id,
      confirmed_at,
      confirmation_method
    ) values (
      target_version_id,
      eligibility_ordinal::integer,
      (eligibility_item->>'ruleKind')::sih26044.eligibility_rule_kind,
      eligibility_item->>'literalSourceWording',
      coalesce(eligibility_item->'typedRuleDefinition', '{}'::jsonb),
      eligibility_human_confirmed,
      case when eligibility_human_confirmed then actor_id else null end,
      case when eligibility_human_confirmed then statement_timestamp() else null end,
      case when eligibility_human_confirmed then confirmation_method_text::sih26044.human_confirmation_method else null end
    );
  end loop;

  update sih26044.opportunities
  set updated_at = statement_timestamp()
  where id = target_opportunity_id;

  perform sih26044.record_authoritative_audit(
    actor_id,
    null,
    requested_owner_organization_id,
    'opportunity.draft_saved',
    'opportunity_versions',
    target_version_id::text,
    null,
    jsonb_build_object(
      'opportunityId', target_opportunity_id::text,
      'versionNumber', target_version_number,
      'requirementCount', jsonb_array_length(requirements_payload),
      'eligibilityRuleCount', jsonb_array_length(eligibility_payload)
    )
  );

  return query
  select target_opportunity_id, target_version_id, target_version_number;
end
$$;

revoke all on function sih26044.save_opportunity_draft(uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function sih26044.save_opportunity_draft(uuid, uuid, uuid, jsonb) to authenticated;

comment on function sih26044.save_opportunity_draft(uuid, uuid, uuid, jsonb) is
  'Atomic authenticated opportunity draft save. Does not publish. Derives current actor confirmation trace, preserves unresolved/review-required skill state losslessly, and records an authoritative draft-save audit event.';
