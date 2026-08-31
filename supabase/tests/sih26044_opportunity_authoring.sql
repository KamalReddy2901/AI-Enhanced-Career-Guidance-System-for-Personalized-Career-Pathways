-- Executable SIH26044 production opportunity-authoring assertions.
-- Run after all migrations on a disposable database. Transactional/no residue.

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end
$$;

create or replace function pg_temp.assert_blocked(command text, message text)
returns void language plpgsql as $$
declare blocked boolean := false;
begin
  begin
    execute command;
  exception when others then
    blocked := true;
  end;
  if not blocked then raise exception 'ASSERTION FAILED: %', message; end if;
end
$$;

insert into auth.users (id) values
  ('91000000-0000-0000-0000-000000000001'),
  ('91000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into sih26044.actors (id, auth_user_id, display_name) values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'Authoring Recruiter A'),
  ('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000002', 'Authoring Recruiter B');

insert into sih26044.organizations (id, legal_name, display_name, kind) values
  ('93000000-0000-0000-0000-000000000001', 'Authoring Industry A Pvt Ltd', 'Authoring Industry A', 'employer'),
  ('93000000-0000-0000-0000-000000000002', 'Authoring Industry B Pvt Ltd', 'Authoring Industry B', 'employer');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status) values
  ('94000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', 'active'),
  ('94000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000002', '93000000-0000-0000-0000-000000000002', 'active');
insert into sih26044.organization_membership_roles (membership_id, role) values
  ('94000000-0000-0000-0000-000000000001', 'recruiter'),
  ('94000000-0000-0000-0000-000000000002', 'recruiter');

-- Organization A recruiter creates an atomic draft carrying an unresolved
-- literal skill plus non-authoritative review suggestions.
set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-0000-0000-000000000001';
select * from sih26044.save_opportunity_draft(
  '93000000-0000-0000-0000-000000000001',
  null,
  null,
  jsonb_build_object(
    'title', 'Authoring Review-Required Internship',
    'description', 'Atomic authoring contract fixture',
    'opportunityType', 'internship',
    'audiences', jsonb_build_array('student'),
    'requirements', jsonb_build_array(jsonb_build_object(
      'category', 'skill',
      'priority', 'required',
      'literalSourceWording', 'Panchakarma Therapy Protocols',
      'importance', 3,
      'evidenceExpectation', 'artifact_expected',
      'hardGate', false,
      'humanConfirmed', false,
      'resolutionStatus', 'review_required',
      'canonicalResolution', 'unresolved',
      'canonicalSkillLabel', 'Panchakarma Therapy Protocols',
      'resolutionSuggestions', jsonb_build_array(jsonb_build_object(
        'skillId', 'iot-protocols',
        'label', 'IoT Protocols',
        'score', 0.61,
        'reviewOnly', true
      ))
    )),
    'eligibilityRules', '[]'::jsonb
  )
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 1
   from sih26044.opportunities o
   join sih26044.opportunity_versions v on v.opportunity_id = o.id
   where o.owner_organization_id = '93000000-0000-0000-0000-000000000001'
     and v.title = 'Authoring Review-Required Internship'
     and o.status = 'draft'
     and v.status = 'draft'),
  'authorized recruiter atomically creates one draft opportunity/version'
);
select pg_temp.assert_true(
  (select r.resolution_status = 'review_required'
      and r.canonical_resolution = 'unresolved'
      and r.canonical_skill_id is null
      and r.canonical_skill_label = 'Panchakarma Therapy Protocols'
      and not r.human_confirmed
      and jsonb_array_length(r.resolution_suggestions) = 1
      and r.resolution_suggestions->0->>'skillId' = 'iot-protocols'
   from sih26044.opportunity_requirements r
   join sih26044.opportunity_versions v on v.id = r.opportunity_version_id
   where v.title = 'Authoring Review-Required Internship'),
  'review-required suggestion remains non-authoritative and literal wording is preserved'
);
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.audit_events
   where action = 'opportunity.draft_saved'
     and organization_id = '93000000-0000-0000-0000-000000000001'),
  'atomic draft save records an authoritative audit event'
);

-- Publication is separate and must reject the unconfirmed review-required row.
set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-0000-0000-000000000001';
select pg_temp.assert_blocked(
  $sql$select sih26044.publish_opportunity_version(
    (select v.id from sih26044.opportunity_versions v where v.title = 'Authoring Review-Required Internship')
  )$sql$,
  'review-required unconfirmed requirement cannot be published'
);
reset role;

-- A different organization's recruiter cannot author into organization A.
set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-0000-0000-000000000002';
select pg_temp.assert_blocked(
  $sql$select * from sih26044.save_opportunity_draft(
    '93000000-0000-0000-0000-000000000001', null, null,
    '{"title":"Unauthorized Draft","description":"must fail","opportunityType":"internship","audiences":["student"],"requirements":[],"eligibilityRules":[]}'::jsonb
  )$sql$,
  'recruiter from organization B cannot author for organization A'
);
reset role;
select pg_temp.assert_true(
  (select count(*) = 0 from sih26044.opportunity_versions where title = 'Unauthorized Draft'),
  'unauthorized authoring leaves no partial draft rows'
);

-- Production RPC rejects controlled-fixture confirmation and the whole atomic
-- statement rolls back, leaving no parent or child residue.
set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-0000-0000-000000000001';
select pg_temp.assert_blocked(
  $sql$select * from sih26044.save_opportunity_draft(
    '93000000-0000-0000-0000-000000000001', null, null,
    '{
      "title":"Controlled Fixture Must Roll Back",
      "description":"must fail atomically",
      "opportunityType":"internship",
      "audiences":["student"],
      "requirements":[{
        "category":"other_literal",
        "priority":"required",
        "literalSourceWording":"Human-authored requirement",
        "importance":3,
        "evidenceExpectation":"any_recorded",
        "hardGate":false,
        "humanConfirmed":true,
        "confirmationMethod":"controlled_fixture",
        "categoryPayload":{}
      }],
      "eligibilityRules":[]
    }'::jsonb
  )$sql$,
  'production authoring rejects controlled_fixture confirmation'
);
reset role;
select pg_temp.assert_true(
  (select count(*) = 0 from sih26044.opportunity_versions where title = 'Controlled Fixture Must Roll Back'),
  'failed production confirmation leaves no partial opportunity/version'
);

-- Human reviewer explicitly keeps the literal skill unresolved. The server
-- derives confirming actor/time from the authenticated session and replaces the
-- draft children atomically.
set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-0000-0000-000000000001';
select * from sih26044.save_opportunity_draft(
  '93000000-0000-0000-0000-000000000001',
  (select o.id
   from sih26044.opportunities o
   join sih26044.opportunity_versions v on v.opportunity_id = o.id
   where v.title = 'Authoring Review-Required Internship'),
  (select v.id from sih26044.opportunity_versions v where v.title = 'Authoring Review-Required Internship'),
  jsonb_build_object(
    'title', 'Authoring Review-Required Internship',
    'description', 'Human-reviewed literal unresolved requirement',
    'opportunityType', 'internship',
    'audiences', jsonb_build_array('student'),
    'requirements', jsonb_build_array(jsonb_build_object(
      'category', 'skill',
      'priority', 'required',
      'literalSourceWording', 'Panchakarma Therapy Protocols',
      'importance', 3,
      'evidenceExpectation', 'artifact_expected',
      'hardGate', false,
      'humanConfirmed', true,
      'confirmationMethod', 'structured_human_entry',
      'resolutionStatus', 'unresolved',
      'canonicalResolution', 'unresolved',
      'canonicalSkillLabel', 'Panchakarma Therapy Protocols',
      'resolutionSuggestions', '[]'::jsonb
    )),
    'eligibilityRules', '[]'::jsonb
  )
);
reset role;

select pg_temp.assert_true(
  (select r.resolution_status = 'unresolved'
      and r.canonical_skill_id is null
      and r.canonical_skill_label = 'Panchakarma Therapy Protocols'
      and r.human_confirmed
      and r.confirmed_by_actor_id = '92000000-0000-0000-0000-000000000001'
      and r.confirmed_at is not null
      and r.confirmation_method = 'structured_human_entry'
      and r.resolution_suggestions = '[]'::jsonb
   from sih26044.opportunity_requirements r
   join sih26044.opportunity_versions v on v.id = r.opportunity_version_id
   where v.title = 'Authoring Review-Required Internship'),
  'human-reviewed literal unresolved state persists with server-derived confirmation authority'
);
select pg_temp.assert_true(
  (select count(*) = 1
   from sih26044.opportunity_requirements r
   join sih26044.opportunity_versions v on v.id = r.opportunity_version_id
   where v.title = 'Authoring Review-Required Internship'),
  'draft child replacement is atomic rather than additive'
);

-- Explicit human publication now succeeds for the exact persisted version.
set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-0000-0000-000000000001';
select sih26044.publish_opportunity_version(
  (select v.id from sih26044.opportunity_versions v where v.title = 'Authoring Review-Required Internship')
);
reset role;
select pg_temp.assert_true(
  (select v.status = 'published'
      and v.published_at is not null
      and o.status = 'published'
      and o.current_version_id = v.id
   from sih26044.opportunity_versions v
   join sih26044.opportunities o on o.id = v.opportunity_id
   where v.title = 'Authoring Review-Required Internship'),
  'explicit publish freezes the exact confirmed draft and makes it current'
);
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.audit_events
   where action = 'opportunity.version_published'
     and organization_id = '93000000-0000-0000-0000-000000000001'),
  'explicit human publication records authoritative publisher audit'
);

rollback;
