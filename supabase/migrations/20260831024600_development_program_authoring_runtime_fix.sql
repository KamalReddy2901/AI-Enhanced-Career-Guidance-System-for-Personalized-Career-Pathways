-- Runtime repair for save_development_program_draft.
-- RETURNS TABLE output names are PL/pgSQL variables, so child-table columns must
-- stay explicitly qualified during exact-draft replacement.

create or replace function sih26044.save_development_program_draft(
  requested_provider_organization_id uuid,
  requested_program_id uuid,
  requested_version_id uuid,
  requested_payload jsonb
)
returns table (
  development_program_id uuid,
  development_program_version_id uuid,
  version_number integer
)
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  current_actor uuid;
  target_program sih26044.development_programs%rowtype;
  target_version sih26044.development_program_versions%rowtype;
  target_program_id uuid;
  target_version_id uuid;
  target_version_number integer;
  program_title text;
  program_description text;
  program_kind sih26044.development_program_kind;
  program_delivery_mode sih26044.development_delivery_mode;
  registration_url text;
  starts_at_value timestamptz;
  ends_at_value timestamptz;
  targets jsonb;
  target jsonb;
  target_ordinal integer := 0;
  literal_wording text;
  resolution_status_value sih26044.requirement_resolution_status;
  canonical_resolution_value sih26044.canonical_resolution_state;
  canonical_skill_id_value text;
  canonical_skill_label_value text;
  suggestions_value jsonb;
  human_confirmed_value boolean;
  confirmation_method_text text;
begin
  current_actor := sih26044.current_actor_id();
  if current_actor is null then
    raise exception 'An active SIH actor is required to author development programs';
  end if;

  if requested_provider_organization_id is null
     or not sih26044.has_any_active_organization_role(
       requested_provider_organization_id,
       array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[]
     ) then
    raise exception 'Actor is not authorized to author development programs for this provider organization';
  end if;

  if requested_payload is null or jsonb_typeof(requested_payload) <> 'object' then
    raise exception 'Development-program payload must be a JSON object';
  end if;

  program_title := btrim(coalesce(requested_payload ->> 'title', ''));
  program_description := btrim(coalesce(requested_payload ->> 'description', ''));
  if length(program_title) < 1 or length(program_title) > 300 then
    raise exception 'Development-program title must contain 1 to 300 characters';
  end if;
  if length(program_description) < 1 or length(program_description) > 5000 then
    raise exception 'Development-program description must contain 1 to 5000 characters';
  end if;

  begin
    program_kind := (requested_payload ->> 'kind')::sih26044.development_program_kind;
    program_delivery_mode := (requested_payload ->> 'deliveryMode')::sih26044.development_delivery_mode;
  exception when invalid_text_representation then
    raise exception 'Development-program kind or delivery mode is invalid';
  end;
  if program_kind is null or program_delivery_mode is null then
    raise exception 'Development-program kind and delivery mode are required';
  end if;

  registration_url := nullif(btrim(coalesce(requested_payload ->> 'externalRegistrationUrl', '')), '');
  if registration_url is not null and registration_url !~ '^https://' then
    raise exception 'External registration URL must use HTTPS';
  end if;

  starts_at_value := nullif(requested_payload ->> 'startsAt', '')::timestamptz;
  ends_at_value := nullif(requested_payload ->> 'endsAt', '')::timestamptz;
  if starts_at_value is not null and ends_at_value is not null and ends_at_value < starts_at_value then
    raise exception 'Development-program end time cannot precede start time';
  end if;

  targets := coalesce(requested_payload -> 'skillTargets', '[]'::jsonb);
  if jsonb_typeof(targets) <> 'array' or jsonb_array_length(targets) < 1 then
    raise exception 'At least one literal skill/capability target is required';
  end if;

  if requested_program_id is null then
    insert into sih26044.development_programs (
      provider_organization_id, status, created_by_actor_id
    ) values (
      requested_provider_organization_id, 'draft', current_actor
    ) returning id into target_program_id;

    target_version_number := 1;
    insert into sih26044.development_program_versions (
      development_program_id, version_number, status, kind, title, description,
      delivery_mode, external_registration_url, starts_at, ends_at, created_by_actor_id
    ) values (
      target_program_id, target_version_number, 'draft', program_kind, program_title,
      program_description, program_delivery_mode, registration_url, starts_at_value,
      ends_at_value, current_actor
    ) returning id into target_version_id;
  else
    select * into target_program
    from sih26044.development_programs p
    where p.id = requested_program_id
    for update;

    if target_program.id is null
       or target_program.provider_organization_id <> requested_provider_organization_id
       or not sih26044.can_manage_development_program(requested_program_id) then
      raise exception 'Development program not found or actor is not authorized';
    end if;
    if target_program.status = 'archived' then
      raise exception 'Archived development programs cannot be revised';
    end if;
    target_program_id := target_program.id;

    if requested_version_id is null then
      select coalesce(max(v.version_number), 0) + 1
      into target_version_number
      from sih26044.development_program_versions v
      where v.development_program_id = target_program_id;

      insert into sih26044.development_program_versions (
        development_program_id, version_number, status, kind, title, description,
        delivery_mode, external_registration_url, starts_at, ends_at, created_by_actor_id
      ) values (
        target_program_id, target_version_number, 'draft', program_kind, program_title,
        program_description, program_delivery_mode, registration_url, starts_at_value,
        ends_at_value, current_actor
      ) returning id into target_version_id;
    else
      select * into target_version
      from sih26044.development_program_versions v
      where v.id = requested_version_id
        and v.development_program_id = target_program_id
      for update;
      if target_version.id is null or target_version.status <> 'draft' then
        raise exception 'Only the exact draft development-program version can be edited';
      end if;
      target_version_id := target_version.id;
      target_version_number := target_version.version_number;

      update sih26044.development_program_versions v
      set kind = program_kind,
          title = program_title,
          description = program_description,
          delivery_mode = program_delivery_mode,
          external_registration_url = registration_url,
          starts_at = starts_at_value,
          ends_at = ends_at_value
      where v.id = target_version_id;

      delete from sih26044.development_program_skill_targets t
      where t.development_program_version_id = target_version_id;
    end if;
  end if;

  for target in select value from jsonb_array_elements(targets)
  loop
    literal_wording := btrim(coalesce(target ->> 'literalSourceWording', ''));
    if length(literal_wording) < 1 or length(literal_wording) > 500 then
      raise exception 'Each development-program target must preserve 1 to 500 literal characters';
    end if;

    begin
      resolution_status_value := (target ->> 'resolutionStatus')::sih26044.requirement_resolution_status;
      canonical_resolution_value := (target ->> 'canonicalResolution')::sih26044.canonical_resolution_state;
    exception when invalid_text_representation then
      raise exception 'Development-program target resolution state is invalid';
    end;

    canonical_skill_id_value := nullif(btrim(coalesce(target ->> 'canonicalSkillId', '')), '');
    canonical_skill_label_value := btrim(coalesce(target ->> 'canonicalSkillLabel', ''));
    suggestions_value := coalesce(target -> 'resolutionSuggestions', '[]'::jsonb);
    human_confirmed_value := coalesce((target ->> 'humanConfirmed')::boolean, false);
    confirmation_method_text := nullif(btrim(coalesce(target ->> 'confirmationMethod', '')), '');

    if canonical_skill_label_value = '' or jsonb_typeof(suggestions_value) <> 'array' then
      raise exception 'Development-program target canonical label and suggestion shape are required';
    end if;

    if resolution_status_value = 'resolved' then
      if canonical_resolution_value not in ('exact', 'alias')
         or canonical_skill_id_value is null
         or jsonb_array_length(suggestions_value) <> 0 then
        raise exception 'Resolved development-program targets require an exact/alias canonical skill and no suggestions';
      end if;
    elsif resolution_status_value = 'review_required' then
      if canonical_resolution_value <> 'unresolved'
         or canonical_skill_id_value is not null
         or jsonb_array_length(suggestions_value) < 1
         or human_confirmed_value then
        raise exception 'Review-required development-program targets remain non-authoritative suggestions';
      end if;
    elsif resolution_status_value = 'unresolved' then
      if canonical_resolution_value <> 'unresolved'
         or canonical_skill_id_value is not null
         or jsonb_array_length(suggestions_value) <> 0 then
        raise exception 'Unresolved development-program targets must retain literal wording without canonical guessing';
      end if;
    else
      raise exception 'Development-program target resolution status is required';
    end if;

    if human_confirmed_value and (
      confirmation_method_text is null
      or confirmation_method_text not in ('structured_human_entry', 'ai_assisted_review', 'connector_review')
    ) then
      raise exception 'Production development-program confirmation requires an allowed non-fixture human method';
    end if;

    insert into sih26044.development_program_skill_targets (
      development_program_version_id, ordinal, literal_source_wording,
      resolution_status, canonical_resolution, canonical_skill_id,
      canonical_skill_label, resolution_suggestions, human_confirmed,
      confirmed_by_actor_id, confirmed_at, confirmation_method
    ) values (
      target_version_id, target_ordinal, literal_wording,
      resolution_status_value, canonical_resolution_value, canonical_skill_id_value,
      canonical_skill_label_value, suggestions_value, human_confirmed_value,
      case when human_confirmed_value then current_actor else null end,
      case when human_confirmed_value then statement_timestamp() else null end,
      case when human_confirmed_value then confirmation_method_text::sih26044.human_confirmation_method else null end
    );
    target_ordinal := target_ordinal + 1;
  end loop;

  update sih26044.development_programs p
  set updated_at = statement_timestamp()
  where p.id = target_program_id;

  perform sih26044.record_authoritative_audit(
    current_actor,
    null,
    requested_provider_organization_id,
    'development_program.draft_saved',
    'development_program_version',
    target_version_id::text,
    null,
    jsonb_build_object(
      'developmentProgramId', target_program_id,
      'versionNumber', target_version_number,
      'targetCount', target_ordinal,
      'publicationImplicit', false
    )
  );

  return query select target_program_id, target_version_id, target_version_number;
end
$$;

revoke all on function sih26044.save_development_program_draft(uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function sih26044.save_development_program_draft(uuid, uuid, uuid, jsonb) to authenticated;
