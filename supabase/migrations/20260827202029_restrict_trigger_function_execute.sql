-- Trigger functions are internal database machinery, not Data API RPCs.
-- PostgreSQL grants EXECUTE to PUBLIC when a function is created, so revoke
-- that default explicitly. Triggers continue to invoke these functions.

revoke all on function sih26044.reject_historical_mutation() from public, anon, authenticated;
revoke all on function sih26044.protect_published_opportunity_version() from public, anon, authenticated;
revoke all on function sih26044.protect_published_opportunity_child() from public, anon, authenticated;
revoke all on function sih26044.validate_verification_request_scope() from public, anon, authenticated;
revoke all on function sih26044.append_initial_consent_event() from public, anon, authenticated;
revoke all on function sih26044.validate_application_opportunity_boundary() from public, anon, authenticated;
revoke all on function sih26044.enforce_application_event_sequence() from public, anon, authenticated;
revoke all on function sih26044.protect_finalized_snapshot() from public, anon, authenticated;
revoke all on function sih26044.protect_finalized_snapshot_link() from public, anon, authenticated;
revoke all on function sih26044.enforce_authenticated_requirement_confirmation() from public, anon, authenticated;
revoke all on function sih26044.enforce_authenticated_eligibility_confirmation() from public, anon, authenticated;
revoke all on function sih26044.protect_artifact_core_metadata() from public, anon, authenticated;
revoke all on function sih26044.validate_application_linked_outcome() from public, anon, authenticated;
revoke all on function sih26044.validate_readiness_evidence_projection() from public, anon, authenticated;
