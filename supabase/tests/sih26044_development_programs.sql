-- Executable SIH26044 development-program lifecycle and linkage assertions.
-- Runs after all migrations on a disposable database and leaves no residue.

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
  begin execute command; exception when others then blocked := true; end;
  if not blocked then raise exception 'ASSERTION FAILED: %', message; end if;
end
$$;

insert into auth.users (id) values
  ('97000000-0000-0000-0000-000000000001'),
  ('97000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into sih26044.actors (id, auth_user_id, display_name) values
  ('97100000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', 'Controlled Program Author'),
  ('97100000-0000-0000-0000-000000000002', '97000000-0000-0000-0000-000000000002', 'Unrelated Program Author');

insert into sih26044.organizations (id, legal_name, display_name, kind, status) values
  ('97200000-0000-0000-0000-000000000001', 'Controlled Skills Institute', 'Controlled Skills Institute', 'educational_institution', 'active'),
  ('97200000-0000-0000-0000-000000000002', 'Unrelated Skills Institute', 'Unrelated Skills Institute', 'educational_institution', 'active');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status) values
  ('97300000-0000-0000-0000-000000000001', '97100000-0000-0000-0000-000000000001', '97200000-0000-0000-0000-000000000001', 'active'),
  ('97300000-0000-0000-0000-000000000002', '97100000-0000-0000-0000-000000000002', '97200000-0000-0000-0000-000000000002', 'active');
insert into sih26044.organization_membership_roles (membership_id, role) values
  ('97300000-0000-0000-0000-000000000001', 'institution_admin'),
  ('97300000-0000-0000-0000-000000000002', 'faculty');

create temporary table pg_temp.program_versions (
  development_program_id uuid not null,
  development_program_version_id uuid primary key,
  version_number integer not null
) on commit drop;
grant select, insert on pg_temp.program_versions to authenticated;

set local role authenticated;
set local "request.jwt.claim.sub" = '97000000-0000-0000-0000-000000000001';
insert into pg_temp.program_versions
select * from sih26044.save_development_program_draft(
  '97200000-0000-0000-0000-000000000001',
  null,
  null,
  jsonb_build_object(
    'kind', 'training',
    'title', 'Applied Python Lab',
    'description', 'Controlled provider-authored training listing for exact skill linkage.',
    'deliveryMode', 'hybrid',
    'externalRegistrationUrl', 'https://provider.invalid/python-lab',
    'skillTargets', jsonb_build_array(
      jsonb_build_object(
        'literalSourceWording', 'Python programming',
        'resolutionStatus', 'resolved',
        'canonicalResolution', 'alias',
        'canonicalSkillId', 'python',
        'canonicalSkillLabel', 'Python',
        'resolutionSuggestions', '[]'::jsonb,
        'humanConfirmed', true,
        'confirmationMethod', 'structured_human_entry'
      ),
      jsonb_build_object(
        'literalSourceWording', 'Data workflow tooling',
        'resolutionStatus', 'review_required',
        'canonicalResolution', 'unresolved',
        'canonicalSkillLabel', 'Data workflow tooling',
        'resolutionSuggestions', jsonb_build_array(jsonb_build_object('skillId', 'data-analysis', 'label', 'Data Analysis', 'score', 0.72, 'reviewOnly', true)),
        'humanConfirmed', false
      )
    )
  )
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 1 and bool_and(version_number = 1) from pg_temp.program_versions),
  'authorized provider author creates exactly version 1 draft'
);
select pg_temp.assert_true(
  (select p.status = 'draft' and p.current_version_id is null
   from sih26044.development_programs p
   where p.id = (select development_program_id from pg_temp.program_versions where version_number = 1)),
  'saving a development-program draft does not implicitly publish or replace current version'
);
select pg_temp.assert_true(
  (select count(*) = 2
      and count(*) filter (where resolution_status = 'resolved' and canonical_skill_id = 'python' and human_confirmed) = 1
      and count(*) filter (where resolution_status = 'review_required' and canonical_skill_id is null and human_confirmed = false) = 1
   from sih26044.development_program_skill_targets t
   where t.development_program_version_id = (select development_program_version_id from pg_temp.program_versions where version_number = 1)),
  'draft preserves resolved and non-authoritative review-required targets without guessing'
);
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.audit_events a
   where a.action = 'development_program.draft_saved'
     and a.resource_id = (select development_program_version_id::text from pg_temp.program_versions where version_number = 1)),
  'draft save records an attributable authoritative audit event'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '97000000-0000-0000-0000-000000000001';
select pg_temp.assert_blocked(
  format('select sih26044.publish_development_program_version(%L)', (select development_program_version_id from pg_temp.program_versions where version_number = 1)),
  'review-required program target blocks publication'
);
select pg_temp.assert_blocked(
  format($sql$select * from sih26044.save_development_program_draft(
    '97200000-0000-0000-0000-000000000001', %L, %L,
    jsonb_build_object(
      'kind','training','title','Applied Python Lab','description','Controlled fixture confirmation must fail.','deliveryMode','hybrid',
      'skillTargets',jsonb_build_array(jsonb_build_object(
        'literalSourceWording','Python programming','resolutionStatus','resolved','canonicalResolution','alias',
        'canonicalSkillId','python','canonicalSkillLabel','Python','resolutionSuggestions','[]'::jsonb,
        'humanConfirmed',true,'confirmationMethod','controlled_fixture'
      ))
    )
  )$sql$,
  (select development_program_id from pg_temp.program_versions where version_number = 1),
  (select development_program_version_id from pg_temp.program_versions where version_number = 1)),
  'controlled-fixture confirmation cannot enter production program persistence'
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 2 from sih26044.development_program_skill_targets t
   where t.development_program_version_id = (select development_program_version_id from pg_temp.program_versions where version_number = 1)),
  'blocked draft replacement rolls back atomically without partial target residue'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '97000000-0000-0000-0000-000000000002';
select pg_temp.assert_blocked(
  $sql$select * from sih26044.save_development_program_draft(
    '97200000-0000-0000-0000-000000000001', null, null,
    '{"kind":"workshop","title":"Cross tenant","description":"Must fail","deliveryMode":"online","skillTargets":[{"literalSourceWording":"Python","resolutionStatus":"unresolved","canonicalResolution":"unresolved","canonicalSkillLabel":"Python","resolutionSuggestions":[],"humanConfirmed":false}]}'::jsonb
  )$sql$,
  'unrelated tenant cannot author a program for another provider organization'
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.development_programs),
  'cross-tenant authoring denial leaves no extra program residue'
);

-- Replace the exact draft with two explicitly human-reviewed targets: one
-- canonical skill and one deliberately literal/unresolved target.
set local role authenticated;
set local "request.jwt.claim.sub" = '97000000-0000-0000-0000-000000000001';
select * from sih26044.save_development_program_draft(
  '97200000-0000-0000-0000-000000000001',
  (select development_program_id from pg_temp.program_versions where version_number = 1),
  (select development_program_version_id from pg_temp.program_versions where version_number = 1),
  jsonb_build_object(
    'kind', 'training',
    'title', 'Applied Python Lab',
    'description', 'Controlled provider-authored training listing for exact skill linkage.',
    'deliveryMode', 'hybrid',
    'externalRegistrationUrl', 'https://provider.invalid/python-lab',
    'skillTargets', jsonb_build_array(
      jsonb_build_object(
        'literalSourceWording', 'Python programming',
        'resolutionStatus', 'resolved',
        'canonicalResolution', 'alias',
        'canonicalSkillId', 'python',
        'canonicalSkillLabel', 'Python',
        'resolutionSuggestions', '[]'::jsonb,
        'humanConfirmed', true,
        'confirmationMethod', 'structured_human_entry'
      ),
      jsonb_build_object(
        'literalSourceWording', 'Provider-specific workflow practice',
        'resolutionStatus', 'unresolved',
        'canonicalResolution', 'unresolved',
        'canonicalSkillLabel', 'Provider-specific workflow practice',
        'resolutionSuggestions', '[]'::jsonb,
        'humanConfirmed', true,
        'confirmationMethod', 'structured_human_entry'
      )
    )
  )
);
select sih26044.publish_development_program_version((select development_program_version_id from pg_temp.program_versions where version_number = 1));
reset role;

select pg_temp.assert_true(
  (select p.status = 'published' and p.current_version_id = v.id and v.status = 'published' and v.published_at is not null
   from sih26044.development_programs p
   join sih26044.development_program_versions v on v.id = p.current_version_id
   where p.id = (select development_program_id from pg_temp.program_versions where version_number = 1)),
  'explicit human publication makes the exact reviewed version current and immutable'
);
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.audit_events a
   where a.action = 'development_program.published'
     and a.resource_id = (select development_program_version_id::text from pg_temp.program_versions where version_number = 1)),
  'publication records a separate authoritative audit event'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '97000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.list_published_development_programs('python') where title = 'Applied Python Lab'),
  'published program is discoverable through exact canonical skill linkage'
);
select pg_temp.assert_true(
  (select count(*) = 0 from sih26044.list_published_development_programs('provider-specific-workflow')),
  'literal unresolved target is never guessed into canonical-skill discovery'
);
select pg_temp.assert_blocked(
  format('update sih26044.development_program_versions set title = ''Mutated'' where id = %L', (select development_program_version_id from pg_temp.program_versions where version_number = 1)),
  'authenticated browser cannot mutate a published development-program version directly'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.development_programs(provider_organization_id, created_by_actor_id)
    values ('97200000-0000-0000-0000-000000000001', '97100000-0000-0000-0000-000000000001')$sql$,
  'authenticated browser cannot bypass atomic program authoring with direct table insert'
);

insert into pg_temp.program_versions
select * from sih26044.save_development_program_draft(
  '97200000-0000-0000-0000-000000000001',
  (select development_program_id from pg_temp.program_versions where version_number = 1),
  null,
  jsonb_build_object(
    'kind', 'training',
    'title', 'Applied Python Lab — revised',
    'description', 'Successor version awaiting explicit human reconfirmation.',
    'deliveryMode', 'hybrid',
    'skillTargets', jsonb_build_array(
      jsonb_build_object(
        'literalSourceWording', 'Python programming',
        'resolutionStatus', 'resolved',
        'canonicalResolution', 'alias',
        'canonicalSkillId', 'python',
        'canonicalSkillLabel', 'Python',
        'resolutionSuggestions', '[]'::jsonb,
        'humanConfirmed', false
      )
    )
  )
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 2 and max(version_number) = 2 from pg_temp.program_versions),
  'successor authoring allocates version 2 under the same stable program identity'
);
select pg_temp.assert_true(
  (select count(distinct development_program_id) = 1 from pg_temp.program_versions),
  'successor draft preserves one stable development-program identity'
);
select pg_temp.assert_true(
  (select p.current_version_id = (select development_program_version_id from pg_temp.program_versions where version_number = 1)
      and v2.status = 'draft'
   from sih26044.development_programs p
   join sih26044.development_program_versions v2 on v2.id = (select development_program_version_id from pg_temp.program_versions where version_number = 2)
   where p.id = (select development_program_id from pg_temp.program_versions where version_number = 1)),
  'published v1 remains authoritative while successor v2 is only a draft'
);
select pg_temp.assert_true(
  (select count(*) = 1 and bool_and(human_confirmed = false)
   from sih26044.development_program_skill_targets t
   where t.development_program_version_id = (select development_program_version_id from pg_temp.program_versions where version_number = 2)),
  'successor draft can retain the mapped skill while requiring fresh explicit human confirmation'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '97000000-0000-0000-0000-000000000001';
select pg_temp.assert_blocked(
  format('select sih26044.publish_development_program_version(%L)', (select development_program_version_id from pg_temp.program_versions where version_number = 2)),
  'unconfirmed successor target blocks publication'
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 0 from sih26044.evidence_records),
  'program publication and discovery never mint learner evidence automatically'
);

rollback;
