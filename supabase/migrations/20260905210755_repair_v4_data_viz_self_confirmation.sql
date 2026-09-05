-- Restore the omitted weak-evidence assertion for the V4 controlled fixture.
-- The V4 evidence record is immutable and remains bound to the existing pending
-- faculty request. This appends the learner's self-confirmation only while that
-- request is still open; the later faculty decision remains the causal change
-- from weak to strong.
do $$
declare
  v_student_actor_id uuid := 'ef04e316-39b6-4641-8d18-f3564c00f144';
  v_data_viz_evidence_id uuid := 'f044a100-0000-4000-8000-000000000104';
  v_data_viz_request_id uuid := 'f044d200-0000-4000-8000-000000000100';
begin
  insert into sih26044.verification_events (
    verification_request_id,
    evidence_record_id,
    action,
    actor_id,
    actor_organization_id,
    reason,
    occurred_at
  )
  select
    request.id,
    request.evidence_record_id,
    'self_confirmed',
    request.subject_actor_id,
    null,
    'Learner self-confirmed the bounded Data Visualization claim before faculty review.',
    statement_timestamp()
  from sih26044.verification_requests request
  join sih26044.evidence_records evidence
    on evidence.id = request.evidence_record_id
  where request.id = v_data_viz_request_id
    and request.evidence_record_id = v_data_viz_evidence_id
    and request.subject_actor_id = v_student_actor_id
    and evidence.subject_actor_id = v_student_actor_id
    and evidence.provenance = 'self_declared'
    and evidence.initial_verification_state = 'proposed'
    and request.status = 'requested'
    and not exists (
      select 1
      from sih26044.verification_events event
      where event.verification_request_id = request.id
        and event.action = 'self_confirmed'
    )
    and not exists (
      select 1
      from sih26044.verification_events event
      where event.verification_request_id = request.id
        and event.action in ('verified_by_human', 'verified_by_issuer', 'disputed')
    );
end;
$$;
