-- Executable SIH26044 collaboration-proposal authoring assertions.
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
  ('96000000-0000-0000-0000-000000000001'),
  ('96000000-0000-0000-0000-000000000002'),
  ('96000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

insert into sih26044.actors (id, auth_user_id, display_name) values
  ('96100000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001', 'Collaboration Faculty Host'),
  ('96100000-0000-0000-0000-000000000002', '96000000-0000-0000-0000-000000000002', 'Collaboration Industry Partner'),
  ('96100000-0000-0000-0000-000000000003', '96000000-0000-0000-0000-000000000003', 'Unrelated Faculty');

insert into sih26044.organizations (id, legal_name, display_name, kind, status) values
  ('96200000-0000-0000-0000-000000000001', 'Controlled Academic Host', 'Controlled Academic Host', 'educational_institution', 'active'),
  ('96200000-0000-0000-0000-000000000002', 'Controlled Industry Partner', 'Controlled Industry Partner', 'employer', 'active'),
  ('96200000-0000-0000-0000-000000000003', 'Unrelated Academic Tenant', 'Unrelated Academic Tenant', 'educational_institution', 'active'),
  ('96200000-0000-0000-0000-000000000004', 'Suspended Partner', 'Suspended Partner', 'employer', 'suspended');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status) values
  ('96300000-0000-0000-0000-000000000001', '96100000-0000-0000-0000-000000000001', '96200000-0000-0000-0000-000000000001', 'active'),
  ('96300000-0000-0000-0000-000000000002', '96100000-0000-0000-0000-000000000002', '96200000-0000-0000-0000-000000000002', 'active'),
  ('96300000-0000-0000-0000-000000000003', '96100000-0000-0000-0000-000000000003', '96200000-0000-0000-0000-000000000003', 'active');
insert into sih26044.organization_membership_roles (membership_id, role) values
  ('96300000-0000-0000-0000-000000000001', 'faculty'),
  ('96300000-0000-0000-0000-000000000002', 'industry_partner'),
  ('96300000-0000-0000-0000-000000000003', 'faculty');

create temporary table pg_temp.proposal_id (id uuid primary key) on commit drop;
grant select, insert on pg_temp.proposal_id to authenticated;

-- Host faculty can see active registered organizations through the bounded
-- authoring directory, but the host itself is not returned.
set local role authenticated;
set local "request.jwt.claim.sub" = '96000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  exists (
    select 1 from sih26044.list_collaboration_partner_organizations('96200000-0000-0000-0000-000000000001')
    where organization_id = '96200000-0000-0000-0000-000000000002'
  ),
  'authorized host author sees active partner organization'
);
select pg_temp.assert_true(
  not exists (
    select 1 from sih26044.list_collaboration_partner_organizations('96200000-0000-0000-0000-000000000001')
    where organization_id = '96200000-0000-0000-0000-000000000001'
  ),
  'partner directory excludes the selected host organization'
);
select pg_temp.assert_true(
  not exists (
    select 1 from sih26044.list_collaboration_partner_organizations('96200000-0000-0000-0000-000000000001')
    where organization_id = '96200000-0000-0000-0000-000000000004'
  ),
  'partner directory excludes suspended organizations'
);

insert into pg_temp.proposal_id
select sih26044.create_collaboration_proposal(
  '96200000-0000-0000-0000-000000000001',
  'collaborative_research',
  array['96200000-0000-0000-0000-000000000002'::uuid],
  array['Define a jointly reviewed research brief', 'Schedule one human-owned review milestone'],
  '2026-09-10T09:00:00Z',
  '2026-12-15T17:00:00Z',
  null
);
reset role;

select pg_temp.assert_true(
  (select c.status = 'proposed'
      and c.kind = 'collaborative_research'
      and c.host_organization_id = '96200000-0000-0000-0000-000000000001'
      and c.created_by_actor_id = '96100000-0000-0000-0000-000000000001'
   from sih26044.collaboration_engagements c
   where c.id = (select id from pg_temp.proposal_id)),
  'atomic authoring creates only a proposed engagement attributed to the authenticated host actor'
);
select pg_temp.assert_true(
  (select count(*) = 1
   from sih26044.collaboration_partner_organizations p
   where p.collaboration_engagement_id = (select id from pg_temp.proposal_id)
     and p.organization_id = '96200000-0000-0000-0000-000000000002'),
  'proposal persists the explicit partner organization exactly once'
);
select pg_temp.assert_true(
  (select count(*) = 1
   from sih26044.collaboration_participants p
   where p.collaboration_engagement_id = (select id from pg_temp.proposal_id)
     and p.actor_id = '96100000-0000-0000-0000-000000000001'),
  'proposal records only the authenticated proposer as the initial explicit participant'
);
select pg_temp.assert_true(
  (select array_agg(o.objective order by o.ordinal) = array['Define a jointly reviewed research brief', 'Schedule one human-owned review milestone']
   from sih26044.collaboration_objectives o
   where o.collaboration_engagement_id = (select id from pg_temp.proposal_id)),
  'literal collaboration objectives are preserved in authored order'
);
select pg_temp.assert_true(
  (select count(*) = 1
      and min(e.sequence_number) = 1
      and bool_and(e.kind = 'created')
      and bool_and(e.to_status = 'proposed')
      and bool_and(e.actor_id = '96100000-0000-0000-0000-000000000001')
      and bool_and(e.organization_id = '96200000-0000-0000-0000-000000000001')
   from sih26044.collaboration_engagement_events e
   where e.collaboration_engagement_id = (select id from pg_temp.proposal_id)),
  'proposal creation initializes exactly one attributable append-only created event'
);
select pg_temp.assert_true(
  (select count(*) = 1
   from sih26044.audit_events a
   where a.action = 'collaboration.proposal_created'
     and a.resource_id = (select id::text from pg_temp.proposal_id)
     and a.organization_id = '96200000-0000-0000-0000-000000000001'),
  'proposal creation records an authoritative minimized audit event'
);
select pg_temp.assert_true(
  (select count(*) = 0 from sih26044.evidence_records),
  'creating a collaboration proposal does not mint evidence'
);

-- Explicit partner membership provides read visibility, without creating host
-- membership or inferred participant identity.
set local role authenticated;
set local "request.jwt.claim.sub" = '96000000-0000-0000-0000-000000000002';
select pg_temp.assert_true(
  (select count(*) = 1
   from sih26044.collaboration_engagements c
   where c.id = (select id from pg_temp.proposal_id)),
  'member of an explicit partner organization can read the proposed engagement through RLS'
);
reset role;

-- An unrelated tenant cannot borrow host authority for directory or creation.
set local role authenticated;
set local "request.jwt.claim.sub" = '96000000-0000-0000-0000-000000000003';
select pg_temp.assert_blocked(
  $sql$select * from sih26044.list_collaboration_partner_organizations('96200000-0000-0000-0000-000000000001')$sql$,
  'unrelated faculty cannot use another tenant host to enumerate collaboration partners'
);
select pg_temp.assert_blocked(
  $sql$select sih26044.create_collaboration_proposal(
    '96200000-0000-0000-0000-000000000001', 'workshop',
    array['96200000-0000-0000-0000-000000000002'::uuid],
    array['Cross-tenant proposal must fail'], null, null, null
  )$sql$,
  'unrelated faculty cannot create a proposal for another host organization'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '96000000-0000-0000-0000-000000000001';
select pg_temp.assert_blocked(
  $sql$select sih26044.create_collaboration_proposal(
    '96200000-0000-0000-0000-000000000001', 'workshop',
    array['96200000-0000-0000-0000-000000000001'::uuid],
    array['Self partner must fail'], null, null, null
  )$sql$,
  'host organization cannot be recorded as its own partner'
);
select pg_temp.assert_blocked(
  $sql$select sih26044.create_collaboration_proposal(
    '96200000-0000-0000-0000-000000000001', 'workshop',
    array['96200000-0000-0000-0000-000000000004'::uuid],
    array['Suspended partner must fail'], null, null, null
  )$sql$,
  'suspended organization cannot be used as collaboration partner'
);
select pg_temp.assert_blocked(
  $sql$select sih26044.create_collaboration_proposal(
    '96200000-0000-0000-0000-000000000001', 'workshop',
    array['96200000-0000-0000-0000-000000000002'::uuid],
    array['Invalid date must fail'], '2026-12-31T17:00:00Z', '2026-12-01T09:00:00Z', null
  )$sql$,
  'proposal end time cannot precede start time'
);
select pg_temp.assert_blocked(
  $sql$select sih26044.create_collaboration_proposal(
    '96200000-0000-0000-0000-000000000001', 'workshop',
    array['96200000-0000-0000-0000-000000000002'::uuid],
    array[]::text[], null, null, null
  )$sql$,
  'proposal requires explicit literal objectives'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.collaboration_engagements (
    kind, host_organization_id, status, created_by_actor_id
  ) values (
    'workshop', '96200000-0000-0000-0000-000000000001', 'proposed', '96100000-0000-0000-0000-000000000001'
  )$sql$,
  'authenticated browser role cannot bypass atomic proposal RPC with direct engagement insert'
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.collaboration_engagements),
  'blocked invalid and cross-tenant proposal attempts leave no partial engagement residue'
);
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.collaboration_engagement_events),
  'blocked proposal attempts leave no partial append-only event residue'
);

rollback;
