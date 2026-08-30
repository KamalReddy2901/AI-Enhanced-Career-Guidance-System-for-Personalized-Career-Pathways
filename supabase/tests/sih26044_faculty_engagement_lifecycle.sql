-- SIH26044 faculty/industry collaboration lifecycle assertions.
-- Transactional and leaves no residue.

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
  ('96100000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001', 'Host Faculty'),
  ('96100000-0000-0000-0000-000000000002', '96000000-0000-0000-0000-000000000002', 'Participant Faculty'),
  ('96100000-0000-0000-0000-000000000003', '96000000-0000-0000-0000-000000000003', 'Unrelated Faculty');

insert into sih26044.organizations (id, legal_name, display_name, kind) values
  ('96200000-0000-0000-0000-000000000001', 'Host Institution', 'Host Institution', 'educational_institution'),
  ('96200000-0000-0000-0000-000000000002', 'Partner Employer', 'Partner Employer', 'employer'),
  ('96200000-0000-0000-0000-000000000003', 'Unrelated Institution', 'Unrelated Institution', 'educational_institution');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status) values
  ('96300000-0000-0000-0000-000000000001', '96100000-0000-0000-0000-000000000001', '96200000-0000-0000-0000-000000000001', 'active'),
  ('96300000-0000-0000-0000-000000000002', '96100000-0000-0000-0000-000000000002', '96200000-0000-0000-0000-000000000002', 'active'),
  ('96300000-0000-0000-0000-000000000003', '96100000-0000-0000-0000-000000000003', '96200000-0000-0000-0000-000000000003', 'active');
insert into sih26044.organization_membership_roles (membership_id, role) values
  ('96300000-0000-0000-0000-000000000001', 'faculty'),
  ('96300000-0000-0000-0000-000000000002', 'faculty'),
  ('96300000-0000-0000-0000-000000000003', 'faculty');

create temporary table pg_temp.faculty_lifecycle_ids (
  collaboration_id uuid primary key,
  participant_actor_id uuid not null,
  evidence_count_before bigint not null
) on commit drop;
grant select, insert on pg_temp.faculty_lifecycle_ids to authenticated;

-- Seed the canonical engagement as test setup. This slice changes lifecycle
-- authority, not collaboration creation RLS.
with created as (
  insert into sih26044.collaboration_engagements (
    kind, host_organization_id, status, created_by_actor_id
  ) values (
    'collaborative_research',
    '96200000-0000-0000-0000-000000000001',
    'proposed',
    '96100000-0000-0000-0000-000000000001'
  ) returning id
)
insert into pg_temp.faculty_lifecycle_ids
select id, '96100000-0000-0000-0000-000000000002', (select count(*) from sih26044.evidence_records) from created;

insert into sih26044.collaboration_participants (collaboration_engagement_id, actor_id)
select collaboration_id, participant_actor_id from pg_temp.faculty_lifecycle_ids;

select pg_temp.assert_true(
  (select count(*) = 1
   from sih26044.collaboration_engagement_events e
   join pg_temp.faculty_lifecycle_ids x on x.collaboration_id = e.collaboration_engagement_id
   where e.kind = 'created'),
  'new engagement receives one immutable created event'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '96000000-0000-0000-0000-000000000001';
select sih26044.append_collaboration_engagement_event(
  (select collaboration_id from pg_temp.faculty_lifecycle_ids),
  'status_transition', 'approved', null, 'Institution approval recorded'
);
reset role;

select pg_temp.assert_true(
  (select status = 'approved' from sih26044.collaboration_engagements c
   join pg_temp.faculty_lifecycle_ids x on x.collaboration_id = c.id),
  'host faculty can approve the engagement through authoritative transition'
);
select pg_temp.assert_true(
  (select count(*) = 2 and max(sequence_number) = 2
   from sih26044.collaboration_engagement_events e
   join pg_temp.faculty_lifecycle_ids x on x.collaboration_id = e.collaboration_engagement_id),
  'approval appends sequence 2 without replacing creation history'
);

-- A recorded participant may append approved/active activity, but cannot own status authority.
set local role authenticated;
set local "request.jwt.claim.sub" = '96000000-0000-0000-0000-000000000002';
select sih26044.append_collaboration_engagement_event(
  (select collaboration_id from pg_temp.faculty_lifecycle_ids),
  'milestone', null, 'Research scope agreed', 'Scoped faculty-industry milestone'
);
select pg_temp.assert_blocked(
  format($sql$select sih26044.append_collaboration_engagement_event('%s','status_transition','active',null,null)$sql$,
    (select collaboration_id from pg_temp.faculty_lifecycle_ids)),
  'participant without host-organization authority cannot change engagement status'
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.collaboration_engagement_events e
   join pg_temp.faculty_lifecycle_ids x on x.collaboration_id = e.collaboration_engagement_id
   where e.kind = 'milestone' and e.actor_id = x.participant_actor_id),
  'participant milestone retains exact actor attribution'
);

-- An unrelated tenant cannot append any event or infer write authority.
set local role authenticated;
set local "request.jwt.claim.sub" = '96000000-0000-0000-0000-000000000003';
select pg_temp.assert_blocked(
  format($sql$select sih26044.append_collaboration_engagement_event('%s','milestone',null,'Unauthorized milestone',null)$sql$,
    (select collaboration_id from pg_temp.faculty_lifecycle_ids)),
  'unrelated tenant cannot append collaboration activity'
);
reset role;

-- Invalid skips and direct materialized-state mutation fail closed.
set local role authenticated;
set local "request.jwt.claim.sub" = '96000000-0000-0000-0000-000000000001';
select pg_temp.assert_blocked(
  format($sql$select sih26044.append_collaboration_engagement_event('%s','status_transition','completed',null,null)$sql$,
    (select collaboration_id from pg_temp.faculty_lifecycle_ids)),
  'approved engagement cannot skip active and jump to completed'
);
select pg_temp.assert_blocked(
  format($sql$update sih26044.collaboration_engagements set status='completed' where id='%s'$sql$,
    (select collaboration_id from pg_temp.faculty_lifecycle_ids)),
  'authenticated clients cannot mutate materialized collaboration status directly'
);
select sih26044.append_collaboration_engagement_event(
  (select collaboration_id from pg_temp.faculty_lifecycle_ids),
  'status_transition', 'active', null, null
);
select sih26044.append_collaboration_engagement_event(
  (select collaboration_id from pg_temp.faculty_lifecycle_ids),
  'deliverable', null, 'Interim research brief', 'Deliverable recorded without claiming universal verification'
);
select sih26044.append_collaboration_engagement_event(
  (select collaboration_id from pg_temp.faculty_lifecycle_ids),
  'status_transition', 'completed', null, 'Human-confirmed engagement completion'
);
reset role;

select pg_temp.assert_true(
  (select status = 'completed' from sih26044.collaboration_engagements c
   join pg_temp.faculty_lifecycle_ids x on x.collaboration_id = c.id),
  'valid approved to active to completed lifecycle updates materialized status'
);
select pg_temp.assert_true(
  (select count(*) = 6 and max(sequence_number) = 6
   from sih26044.collaboration_engagement_events e
   join pg_temp.faculty_lifecycle_ids x on x.collaboration_id = e.collaboration_engagement_id),
  'valid lifecycle and activity events form a gap-free append-only sequence'
);

-- Completed engagement can receive a bounded outcome note; it creates no evidence automatically.
set local role authenticated;
set local "request.jwt.claim.sub" = '96000000-0000-0000-0000-000000000002';
select sih26044.append_collaboration_engagement_event(
  (select collaboration_id from pg_temp.faculty_lifecycle_ids),
  'outcome', null, 'Joint research brief delivered', 'Recorded outcome; evidence requires a separate scoped confirmation flow'
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.collaboration_engagement_events e
   join pg_temp.faculty_lifecycle_ids x on x.collaboration_id = e.collaboration_engagement_id
   where e.kind = 'outcome' and e.actor_id = x.participant_actor_id),
  'completed engagement outcome is append-only and participant-attributed'
);
select pg_temp.assert_true(
  (select (select count(*) from sih26044.evidence_records) = x.evidence_count_before
   from pg_temp.faculty_lifecycle_ids x),
  'collaboration outcome does not automatically mint evidence'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '96000000-0000-0000-0000-000000000001';
select pg_temp.assert_blocked(
  format($sql$update sih26044.collaboration_engagement_events set title='mutated' where collaboration_engagement_id='%s'$sql$,
    (select collaboration_id from pg_temp.faculty_lifecycle_ids)),
  'collaboration event history cannot be updated'
);
select pg_temp.assert_blocked(
  format($sql$delete from sih26044.collaboration_engagement_events where collaboration_engagement_id='%s'$sql$,
    (select collaboration_id from pg_temp.faculty_lifecycle_ids)),
  'collaboration event history cannot be deleted'
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 7 and count(distinct sequence_number) = 7
   from sih26044.collaboration_engagement_events e
   join pg_temp.faculty_lifecycle_ids x on x.collaboration_id = e.collaboration_engagement_id),
  'blocked writes leave the seven-event history intact'
);

rollback;
