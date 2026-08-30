/** Credential-gated authenticated authority and isolation smoke matrix. */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const url = process.env.SIH_SUPABASE_URL ?? ''; const anonKey = process.env.SIH_SUPABASE_ANON_KEY ?? ''; const password = process.env.SIH_CONTROLLED_FIXTURE_PASSWORD ?? '';
if (!url || !anonKey || password.length < 16) throw new Error('SIH_SUPABASE_URL, SIH_SUPABASE_ANON_KEY and controlled fixture password are required.');
const ids = { institutionA: 'f0440000-0000-4000-8000-000000000001', employerA: 'f0440000-0000-4000-8000-000000000002', issuerA: 'f0440000-0000-4000-8000-000000000003', employerB: 'f0440000-0000-4000-8000-000000000004' };
const roles = [['student', ids.institutionA, 'learner'], ['faculty', ids.institutionA, 'faculty'], ['issuer', ids.issuerA, 'issuer_verifier'], ['recruiter', ids.employerA, 'recruiter'], ['recruiter-b', ids.employerB, 'recruiter'], ['institution-admin', ids.institutionA, 'institution_admin'], ['policy-analyst', ids.institutionA, 'policy_program_analyst']] as const;
let assertions = 0;
for (const [slug, organizationId, role] of roles) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signedIn = await client.auth.signInWithPassword({ email: `sih26044-controlled-${slug}@example.invalid`, password }); assert.ifError(signedIn.error); assertions++;
  const actor = await client.schema('sih26044').rpc('current_actor_id'); assert.ifError(actor.error); assert.ok(actor.data); assertions++;
  const ownRole = await client.schema('sih26044').rpc('has_active_organization_role', { requested_organization_id: organizationId, requested_role: role }); assert.ifError(ownRole.error); assert.equal(ownRole.data, true); assertions++;
  if (slug === 'recruiter') { const other = await client.schema('sih26044').rpc('has_active_organization_role', { requested_organization_id: ids.employerB, requested_role: 'recruiter' }); assert.ifError(other.error); assert.equal(other.data, false); assertions++; }
  if (slug === 'student') { const privileged = await client.schema('sih26044').rpc('record_authoritative_audit', { p_actor_id: actor.data, p_system_principal: null, p_organization_id: organizationId, p_action: 'forbidden_fixture_probe', p_resource_type: 'actor', p_resource_id: actor.data, p_purpose: 'application_review', p_metadata: {} }); assert.ok(privileged.error); assertions++; }
  await client.auth.signOut();
}
console.log(`Authenticated hosted SIH authority smoke passed: ${assertions} assertions`);
