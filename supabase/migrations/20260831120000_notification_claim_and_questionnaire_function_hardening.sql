-- Close the browser-visible notification lease surface and harden immutable
-- questionnaire trigger functions discovered by the hosted security advisor.

revoke execute on function sih26044.claim_notification_outbox(integer, integer)
  from public, anon, authenticated;
grant execute on function sih26044.claim_notification_outbox(integer, integer)
  to service_role;

alter function sih26044.block_published_questionnaire_mutation()
  set search_path = pg_catalog, sih26044;
alter function sih26044.block_published_question_mutation()
  set search_path = pg_catalog, sih26044;
alter function sih26044.block_submitted_submission_mutation()
  set search_path = pg_catalog, sih26044;

revoke execute on function sih26044.block_published_questionnaire_mutation()
  from public, anon, authenticated;
revoke execute on function sih26044.block_published_question_mutation()
  from public, anon, authenticated;
revoke execute on function sih26044.block_submitted_submission_mutation()
  from public, anon, authenticated;
