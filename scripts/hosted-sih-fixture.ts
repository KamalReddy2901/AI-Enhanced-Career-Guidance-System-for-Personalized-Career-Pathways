/** Trusted idempotent controlled fixture authority graph. Never import client-side. */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const mode = process.argv[2] ?? 'bootstrap';
const url = process.env.SIH_SUPABASE_URL ?? '';
const serviceKey = process.env.SIH_SUPABASE_SERVICE_ROLE_KEY ?? '';
const password = process.env.SIH_CONTROLLED_FIXTURE_PASSWORD ?? '';
const confirmation = process.env.SIH_HOSTED_FIXTURE_CONFIRMATION;
const expectedHost = 'mmwgnsggnllwgshipnwh.supabase.co';
if (!['bootstrap', 'suspend'].includes(mode)) throw new Error('Usage: hosted-sih-fixture.ts [bootstrap|suspend]');
if (!url || new URL(url).hostname !== expectedHost) throw new Error(`Refusing an unexpected project; expected ${expectedHost}.`);
if (!serviceKey || password.length < 16) throw new Error('Trusted service key and a 16+ character controlled-fixture password are required.');
const expectedConfirmation = mode === 'bootstrap' ? 'CREATE_CONTROLLED_SIH_FIXTURES' : 'SUSPEND_CONTROLLED_SIH_FIXTURES';
if (confirmation !== expectedConfirmation) throw new Error(`Refusing ${mode}: set SIH_HOSTED_FIXTURE_CONFIRMATION=${expectedConfirmation}.`);
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const ids = {
  institutionA: 'f0440000-0000-4000-8000-000000000001', employerA: 'f0440000-0000-4000-8000-000000000002',
  issuerA: 'f0440000-0000-4000-8000-000000000003', employerB: 'f0440000-0000-4000-8000-000000000004',
} as const;
const organizations = [
  { id: ids.institutionA, legal_name: 'Controlled SIH Test Institute A', display_name: 'Controlled Test Institute A', kind: 'educational_institution' },
  { id: ids.employerA, legal_name: 'Controlled SIH Test Employer A', display_name: 'Controlled Test Employer A', kind: 'employer' },
  { id: ids.issuerA, legal_name: 'Controlled SIH Test Issuer A', display_name: 'Controlled Test Issuer A', kind: 'verification_issuer' },
  { id: ids.employerB, legal_name: 'Controlled SIH Isolation Employer B', display_name: 'Controlled Isolation Employer B', kind: 'employer' },
] as const;
const personas = [
  { slug: 'student', name: 'Controlled Student', orgId: ids.institutionA, role: 'learner' },
  { slug: 'faculty', name: 'Controlled Faculty Verifier', orgId: ids.institutionA, role: 'faculty' },
  { slug: 'issuer', name: 'Controlled Issuer Verifier', orgId: ids.issuerA, role: 'issuer_verifier' },
  { slug: 'recruiter', name: 'Controlled Recruiter A', orgId: ids.employerA, role: 'recruiter' },
  { slug: 'recruiter-b', name: 'Controlled Recruiter B', orgId: ids.employerB, role: 'recruiter' },
  { slug: 'institution-admin', name: 'Controlled Institution Admin', orgId: ids.institutionA, role: 'institution_admin' },
  { slug: 'policy-analyst', name: 'Controlled Policy Analyst', orgId: ids.institutionA, role: 'policy_program_analyst' },
] as const;
const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }); assert.ifError(listed.error);
const actorIds = new Map<string, string>();
for (const persona of personas) {
  const email = `sih26044-controlled-${persona.slug}@example.invalid`;
  let user = listed.data.users.find(candidate => candidate.email === email);
  if (!user && mode === 'bootstrap') { const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { fixture_namespace: 'sih26044-controlled-v1' } }); assert.ifError(created.error); user = created.data.user; }
  if (!user) continue;
  if (user.app_metadata?.fixture_namespace !== 'sih26044-controlled-v1') throw new Error(`Refusing to repurpose existing Auth user ${email}.`);
  if (mode === 'suspend') {
    const banned = await admin.auth.admin.updateUserById(user.id, { ban_duration: '876000h' }); assert.ifError(banned.error);
    const disabled = await admin.schema('sih26044').from('actors').update({ status: 'disabled' }).eq('auth_user_id', user.id); assert.ifError(disabled.error);
    console.log(`suspended controlled ${persona.slug}`); continue;
  }
  const unbanned = await admin.auth.admin.updateUserById(user.id, { ban_duration: 'none', password }); assert.ifError(unbanned.error);
  const existing = await admin.schema('sih26044').from('actors').select('id').eq('auth_user_id', user.id).maybeSingle(); assert.ifError(existing.error);
  let actorId = existing.data?.id as string | undefined;
  if (!actorId) { const inserted = await admin.schema('sih26044').from('actors').insert({ auth_user_id: user.id, display_name: persona.name, status: 'active' }).select('id').single(); assert.ifError(inserted.error); actorId = inserted.data.id; }
  else { const enabled = await admin.schema('sih26044').from('actors').update({ display_name: persona.name, status: 'active' }).eq('id', actorId); assert.ifError(enabled.error); }
  actorIds.set(persona.slug, actorId);
}
if (mode === 'suspend') { console.log('Controlled identities suspended; append-only history retained.'); process.exit(0); }
for (const organization of organizations) { const result = await admin.schema('sih26044').from('organizations').upsert({ ...organization, status: 'active' }, { onConflict: 'id' }); assert.ifError(result.error); }
for (const [index, persona] of personas.entries()) {
  const actorId = actorIds.get(persona.slug); assert.ok(actorId);
  const membershipId = `f0441000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
  const membership = await admin.schema('sih26044').from('organization_memberships').upsert({ id: membershipId, actor_id: actorId, organization_id: persona.orgId, status: 'active', valid_from: '2026-01-01T00:00:00.000Z', valid_until: null }, { onConflict: 'id' }); assert.ifError(membership.error);
  const role = await admin.schema('sih26044').from('organization_membership_roles').upsert({ membership_id: membershipId, role: persona.role }, { onConflict: 'membership_id,role' }); assert.ifError(role.error);
  console.log(`ensured controlled ${persona.slug} authority`);
}
console.log('Controlled two-tenant authority graph is ready. No endorsements, evidence, applications, decisions, or outcomes were fabricated.');
