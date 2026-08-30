-- RLS policies on intervention event/follow-up tables invoke this bounded helper.
-- It returns true only when the current actor is an active institution admin for
-- the intervention's owning institution; it does not expose intervention data.

revoke all on function sih26044.can_manage_institution_intervention(uuid) from public, anon;
grant execute on function sih26044.can_manage_institution_intervention(uuid) to authenticated;
