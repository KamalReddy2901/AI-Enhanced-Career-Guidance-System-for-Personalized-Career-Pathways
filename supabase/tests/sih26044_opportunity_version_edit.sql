-- SIH26044 opportunity version edit/versioning assertions.
-- Drafts are editable atomically; published versions are immutable and changed
-- only by creating a successor draft. Transactional/no residue.

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
  ('95000000-0000-0000-0000-000000000001'),
  ('95000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into sih26044.actors (id, auth_user_id, display_name) values
  ('95100000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000001', 'Versioning Recruiter A'),
  ('95100000-0000-0000-0000-000000000002', '95000000-0000-0000-0000-000000000002', 'Versioning Recruiter B');

insert into sih26044.organizations (id, legal_name, display_name, kind) values
  ('95200000-0000-0000-0000-000000000001', 'Versioning Employer A Pvt Ltd', 'Versioning Employer A', 'employer'),
  ('95200000-0000-0000-0000-000000000002', 'Versioning Employer B Pvt Ltd', 'Versioning Employer B', 'employer');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status) values
  ('95300000-0000-0000-0000-000000000001', '95100000-0000-0000-0000-000000000001', '95200000-0000-0000-0000-000000000001', 'active'),
  ('95300000-0000-0000-0000-000000000002', '95100000-0000-0000-0000-000000000002', '95200000-0000-0000-0000-000000000002', 'active');
insert into sih26044.organization_membership_roles (membership_id, role) values
  ('95300000-0000-0000-0000-000000000001', 'recruiter'),
  ('95300000-0000-0000-0000-000000000002', 'recruiter');

create temporary table pg_temp.versioning_ids (
  opportunity_id uuid not null,
  version_id uuid not null,
  version_number integer not null
) on commit drop;

grant select, insert, update, delete on pg_temp.versioning_ids to authenticated;

-- Create v1 as an explicitly human-confirmed draft.
set local role authenticated;
set local "request.jwt.claim.sub" = '95000000-0000-0000-0000-000000000001';
insert into pg_temp.versioning_ids
select * from sih26044.save_opportunity_draft(
  '95200000-0000-0000-0000-000000000001', null, null,
  '{
    "title":"Versioned Internship v1 draft",
    "description":"Initial editable production draft",
    "opportunityType":"internship",
    "audiences":["student"],
    "requirements":[{
      "category":"other_literal",
      "priority":"required",
      "literalSourceWording":"Submit a portfolio sample",
      "importance":3,
      "evidenceExpectation":"artifact_expected",
      "hardGate":false,
      "humanConfirmed":true,
      "confirmationMethod":"structured_human_entry",
      "categoryPayload":{}
    }],
    "eligibilityRules":[]
  }'::jsonb
);
reset role;

select pg_temp.assert_true(
  (select version_number = 1 from pg_temp.versioning_ids),
  'new opportunity begins at version 1'
);
select pg_temp.assert_true(
  (select v.status = 'draft' and o.status = 'draft'
   from pg_temp.versioning_ids x
   join sih26044.opportunity_versions v on v.id = x.version_id
   join sih26044.opportunities o on o.id = x.opportunity_id),
  'new version and parent remain draft before explicit publication'
);

-- Edit the exact persisted draft in place. Identity/version number must remain stable.
set local role authenticated;
set local "request.jwt.claim.sub" = '95000000-0000-0000-0000-000000000001';
select * from sih26044.save_opportunity_draft(
  '95200000-0000-0000-0000-000000000001',
  (select opportunity_id from pg_temp.versioning_ids),
  (select version_id from pg_temp.versioning_ids),
  '{
    "title":"Versioned Internship v1 edited",
    "description":"Edited atomically before publication",
    "opportunityType":"internship",
    "audiences":["student"],
    "requirements":[{
      "category":"other_literal",
      "priority":"required",
      "literalSourceWording":"Submit one reviewed portfolio sample",
      "importance":3,
      "evidenceExpectation":"artifact_expected",
      "hardGate":false,
      "humanConfirmed":true,
      "confirmationMethod":"structured_human_entry",
      "categoryPayload":{}
    }],
    "eligibilityRules":[]
  }'::jsonb
);
reset role;

select pg_temp.assert_true(
  (select v.title = 'Versioned Internship v1 edited' and v.version_number = 1 and v.status = 'draft'
   from pg_temp.versioning_ids x join sih26044.opportunity_versions v on v.id = x.version_id),
  'editing a persisted draft keeps exact version identity and version number'
);
select pg_temp.assert_true(
  (select count(*) = 1
   from pg_temp.versioning_ids x
   join sih26044.opportunity_requirements r on r.opportunity_version_id = x.version_id
   where r.literal_source_wording = 'Submit one reviewed portfolio sample'),
  'draft child structure is atomically replaced rather than appended'
);

-- Publish exact v1.
set local role authenticated;
set local "request.jwt.claim.sub" = '95000000-0000-0000-0000-000000000001';
select sih26044.publish_opportunity_version((select version_id from pg_temp.versioning_ids));
reset role;

select pg_temp.assert_true(
  (select v.status = 'published' and o.status = 'published' and o.current_version_id = v.id
   from pg_temp.versioning_ids x
   join sih26044.opportunity_versions v on v.id = x.version_id
   join sih26044.opportunities o on o.id = x.opportunity_id),
  'explicit publication freezes v1 and makes it the current version'
);

-- Published version cannot be edited in place through the production RPC.
set local role authenticated;
set local "request.jwt.claim.sub" = '95000000-0000-0000-0000-000000000001';
select pg_temp.assert_blocked(
  format($sql$select * from sih26044.save_opportunity_draft(
    '95200000-0000-0000-0000-000000000001', '%s', '%s',
    '{"title":"ILLEGAL published mutation","description":"must fail","opportunityType":"internship","audiences":["student"],"requirements":[],"eligibilityRules":[]}'::jsonb
  )$sql$, (select opportunity_id from pg_temp.versioning_ids), (select version_id from pg_temp.versioning_ids)),
  'published version cannot be edited through save_opportunity_draft'
);
reset role;
select pg_temp.assert_true(
  (select v.title = 'Versioned Internship v1 edited' from pg_temp.versioning_ids x join sih26044.opportunity_versions v on v.id = x.version_id),
  'failed published edit leaves frozen version content unchanged'
);

-- Create successor v2 under same opportunity. Confirmation is intentionally reset.
set local role authenticated;
set local "request.jwt.claim.sub" = '95000000-0000-0000-0000-000000000001';
insert into pg_temp.versioning_ids
select * from sih26044.save_opportunity_draft(
  '95200000-0000-0000-0000-000000000001',
  (select opportunity_id from pg_temp.versioning_ids where version_number = 1),
  null,
  '{
    "title":"Versioned Internship v2 draft",
    "description":"Successor draft derived from frozen v1",
    "opportunityType":"internship",
    "audiences":["student"],
    "requirements":[{
      "category":"other_literal",
      "priority":"required",
      "literalSourceWording":"Submit one reviewed portfolio sample",
      "importance":3,
      "evidenceExpectation":"artifact_expected",
      "hardGate":false,
      "humanConfirmed":false,
      "categoryPayload":{}
    }],
    "eligibilityRules":[]
  }'::jsonb
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 2 and max(version_number) = 2 from pg_temp.versioning_ids),
  'successor creation allocates version 2 under the same opportunity'
);
select pg_temp.assert_true(
  (select count(distinct opportunity_id) = 1 from pg_temp.versioning_ids),
  'successor draft retains stable opportunity identity'
);
select pg_temp.assert_true(
  (select v.status = 'draft' and not r.human_confirmed
   from pg_temp.versioning_ids x
   join sih26044.opportunity_versions v on v.id = x.version_id
   join sih26044.opportunity_requirements r on r.opportunity_version_id = v.id
   where x.version_number = 2),
  'successor remains draft and high-impact confirmation is not inherited automatically'
);
select pg_temp.assert_true(
  (select o.current_version_id = x.version_id
   from pg_temp.versioning_ids x
   join sih26044.opportunities o on o.id = x.opportunity_id
   where x.version_number = 1),
  'creating successor draft does not change the authoritative current published version'
);

-- Another employer cannot edit or create a successor under employer A.
set local role authenticated;
set local "request.jwt.claim.sub" = '95000000-0000-0000-0000-000000000002';
select pg_temp.assert_blocked(
  format($sql$select * from sih26044.save_opportunity_draft(
    '95200000-0000-0000-0000-000000000001', '%s', '%s',
    '{"title":"Cross-tenant edit","description":"must fail","opportunityType":"internship","audiences":["student"],"requirements":[],"eligibilityRules":[]}'::jsonb
  )$sql$, (select opportunity_id from pg_temp.versioning_ids where version_number = 2), (select version_id from pg_temp.versioning_ids where version_number = 2)),
  'cross-tenant recruiter cannot edit successor draft'
);
select pg_temp.assert_blocked(
  format($sql$select * from sih26044.save_opportunity_draft(
    '95200000-0000-0000-0000-000000000001', '%s', null,
    '{"title":"Cross-tenant successor","description":"must fail","opportunityType":"internship","audiences":["student"],"requirements":[],"eligibilityRules":[]}'::jsonb
  )$sql$, (select opportunity_id from pg_temp.versioning_ids where version_number = 1)),
  'cross-tenant recruiter cannot create successor version'
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 2
   from sih26044.opportunity_versions v
   join pg_temp.versioning_ids x on x.opportunity_id = v.opportunity_id),
  'blocked cross-tenant writes leave no extra versions'
);

rollback;
