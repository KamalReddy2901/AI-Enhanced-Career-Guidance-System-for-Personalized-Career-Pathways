-- The submission sequencing trigger must lock the application row atomically.
-- Browser roles intentionally have no UPDATE privilege on applications, so the
-- internal trigger requires definer authority. Direct RPC execution stays revoked.
alter function sih26044.enforce_application_event_sequence() security definer;
revoke all on function sih26044.enforce_application_event_sequence()
from public, anon, authenticated;
