/** Controlled synthetic identity bootstrap. It is intentionally opt-in and
 * requires trusted Auth-admin + service credentials; never import this client-side. */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SIH_SUPABASE_URL ?? '';
const serviceKey = process.env.SIH_SUPABASE_SERVICE_ROLE_KEY ?? '';
const password = process.env.SIH_CONTROLLED_FIXTURE_PASSWORD ?? '';
const confirmation = process.env.SIH_HOSTED_FIXTURE_CONFIRMATION;
const ref = 'mmwgnsggnllwgshipnwh';
if (confirmation !== 'CREATE_CONTROLLED_SIH_FIXTURES') throw new Error('Refusing fixture mutation: set SIH_HOSTED_FIXTURE_CONFIRMATION=CREATE_CONTROLLED_SIH_FIXTURES.');
if (new URL(url).hostname !== `${ref}.supabase.co`) throw new Error('Refusing fixture mutation against an unexpected Supabase project.');
if (!serviceKey || password.length < 16) throw new Error('SIH_SUPABASE_SERVICE_ROLE_KEY and a 16+ character SIH_CONTROLLED_FIXTURE_PASSWORD are required.');
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const roles = [
  ['student', 'Controlled Student', null],
  ['faculty', 'Controlled Faculty Verifier', 'faculty'],
  ['issuer', 'Controlled Issuer Verifier', 'issuer_verifier'],
  ['recruiter', 'Controlled Recruiter', 'recruiter'],
  ['institution-admin', 'Controlled Institution Admin', 'institution_admin'],
  ['policy-analyst', 'Controlled Policy Analyst', 'policy_program_analyst'],
] as const;
for (const [slug, displayName, role] of roles) {
  const email = `sih26044-controlled-${slug}@example.invalid`;
  const { data: listed, error: listedError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.ifError(listedError);
  let user = listed.users.find(candidate => candidate.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { controlled_fixture: true } });
    assert.ifError(error); user = data.user;
  }
  assert.ok(user, `could not provision ${slug}`);
  const { data: actor, error: actorError } = await admin.schema('sih26044').from('actors')
    .select('id').eq('auth_user_id', user.id).maybeSingle();
  assert.ifError(actorError);
  if (!actor) {
    const { error } = await admin.schema('sih26044').from('actors').insert({ auth_user_id: user.id, display_name: displayName });
    assert.ifError(error);
  }
  console.log(`ensured controlled ${slug} identity`);
  // Organization memberships are deliberately not fabricated here. An operator
  // must run the accompanying schema-aware scenario loader after migration
  // reconciliation; this prevents accidental creation of misleading employer
  // or issuer authority when the hosted schema is not current.
  void role;
}
console.log('Controlled identities created or reused. No real organizations, endorsements, opportunities, evidence, or outcomes were invented.');
