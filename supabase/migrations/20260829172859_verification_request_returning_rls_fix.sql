-- SIH26044 shared verification-request repair: permit an authenticated subject's
-- INSERT ... RETURNING row to satisfy SELECT RLS without recursively looking the
-- new row up through can_access_verification_request(). Verifier authorization
-- continues to use the existing bounded helper unchanged.

drop policy if exists verification_requests_select_bounded
on sih26044.verification_requests;

create policy verification_requests_select_bounded
on sih26044.verification_requests for select to authenticated
using (
  subject_actor_id = sih26044.current_actor_id()
  or sih26044.can_access_verification_request(id)
);

comment on policy verification_requests_select_bounded
on sih26044.verification_requests is
  'Subjects read their own request rows directly, including INSERT RETURNING. Assigned verifiers remain authorized only through can_access_verification_request().';
