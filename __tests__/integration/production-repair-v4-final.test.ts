/**
 * Production Repair V4 - Real Execution Integration Test
 * 
 * This test executes the production repair migration against disposable Supabase
 * and validates actual execution results.
 * 
 * Required sequence:
 * 1. Provision controlled Phase-1 fixture prerequisites
 * 2. Confirm student/faculty actors exist and are active
 * 3. Create disposable auth users
 * 4. Bind auth_user_id to existing controlled actors
 * 5. Assert current_actor_id() returns expected IDs
 * 6. Execute production repair v4 migration
 * 7. Pre-attestation via Worker recompute
 * 8. Faculty authenticated RPC decision
 * 9. Post-attestation validation (Data Viz MET_STRONG)
 * 10. Idempotency (second repair execution)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { handleSihRequest } from '../../worker/src/sih/routes';

function localEnvironment() {
  const output = execFileSync('npx', ['--yes', 'supabase@latest', 'status', '-o', 'env'], { encoding: 'utf8' });
  return Object.fromEntries(output.split('\n').flatMap(line => {
    const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    return match ? [[match[1], match[2]]] : [];
  })) as Record<string, string>;
}

function sql(source: string) {
  const run = spawnSync('docker', [
    'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-q',
  ], { input: source, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr || run.stdout);
}

const CONTROLLED_STUDENT_ID = 'ef04e316-39b6-4641-8d18-f3564c00f144';
const CONTROLLED_FACULTY_ID = '27e18338-ec21-40da-a6aa-2facacc7bd6e';
const CONTROLLED_INSTITUTION_ID = 'f0440000-0000-4000-8000-000000000001';
const FLAGSHIP_OPP_ID = 'f0442000-0000-4000-8000-000000000001';
const FLAGSHIP_V2_ID = 'f0443000-0000-4000-8000-000000000002';
const DATA_VIZ_EVIDENCE = 'f044a100-0000-4000-8000-000000000104';
const DATA_VIZ_VREQ = 'f044d200-0000-4000-8000-000000000100';

describe('Production Repair V4 Final - Real Execution', () => {
  let admin: SupabaseClient;
  let studentClient: SupabaseClient;
  let studentToken: string;
  let facultyClient: SupabaseClient;
  let workerEnv: any;
  const respond = (data: unknown, status = 200) => Response.json(data, { status });

  beforeAll(async () => {
    const local = localEnvironment();
    const apiUrl = local.API_URL;
    const serviceKey = local.SECRET_KEY || local.SERVICE_ROLE_KEY;
    const anonKey = local.ANON_KEY;
    
    if (!apiUrl || !serviceKey) {
      throw new Error('Missing Supabase credentials');
    }

    admin = createClient(apiUrl, serviceKey, { auth: { persistSession: false } });
    workerEnv = { SUPABASE_URL: apiUrl, SUPABASE_ANON_KEY: anonKey, SUPABASE_ELEVATED_KEY: serviceKey };

    // STEP 1: Provision controlled fixture prerequisites
    console.log('\n📦 Provisioning controlled fixtures...');
    sql(`
      -- Actors
      insert into sih26044.actors (id, display_name, status) values
        ('${CONTROLLED_STUDENT_ID}', 'Ananya Rao', 'active'),
        ('${CONTROLLED_FACULTY_ID}', 'Dr. Sharma', 'active'),
        ('359de147-6dd1-41a9-aa06-8dd1a62d5080', 'Recruiter A', 'active')
      on conflict (id) do nothing;
      
      -- Organization
      insert into sih26044.organizations (id, legal_name, display_name, kind, status) values
        ('${CONTROLLED_INSTITUTION_ID}', 'AIIMS Delhi', 'AIIMS Delhi', 'educational_institution', 'active')
      on conflict (id) do nothing;
      
      -- Student membership
      insert into sih26044.organization_memberships (id, actor_id, organization_id, status, valid_from) values
        ('f0440000-0000-4000-8000-300000000001', '${CONTROLLED_STUDENT_ID}', '${CONTROLLED_INSTITUTION_ID}', 'active', now())
      on conflict (id) do nothing;
      
      -- Faculty membership with faculty role for verification
      insert into sih26044.organization_memberships (id, actor_id, organization_id, status, valid_from) values
        ('f0440000-0000-4000-8000-300000000002', '${CONTROLLED_FACULTY_ID}', '${CONTROLLED_INSTITUTION_ID}', 'active', now())
      on conflict (id) do nothing;
      
      insert into sih26044.organization_membership_roles (membership_id, role) values
        ('f0440000-0000-4000-8000-300000000002', 'faculty')
      on conflict (membership_id, role) do nothing;
      
      -- Flagship opportunity v1 (prerequisite for v4 migration which creates v2 from v1)
      insert into sih26044.opportunities (
        id, owner_organization_id, status, created_by_actor_id, created_at
      ) values (
        '${FLAGSHIP_OPP_ID}', '${CONTROLLED_INSTITUTION_ID}', 'published',
        '359de147-6dd1-41a9-aa06-8dd1a62d5080', now()
      ) on conflict (id) do nothing;
      
      insert into sih26044.opportunity_versions (
        id, opportunity_id, version_number, status,
        title, description, opportunity_type, audiences,
        source_system, source_literal_text, source_captured_at,
        created_by_actor_id, published_at, created_at
      ) values (
        'f0443000-0000-4000-8000-000000000001', '${FLAGSHIP_OPP_ID}', 1, 'published',
        'Clinical Research Data & Standardization Intern', 'Test opportunity v1',
        'internship', array['student']::sih26044.opportunity_audience[],
        'controlled_test', 'Test v1', now(),
        '359de147-6dd1-41a9-aa06-8dd1a62d5080', now(), now()
      ) on conflict (id) do nothing;
      
      update sih26044.opportunities set current_version_id = 'f0443000-0000-4000-8000-000000000001'
      where id = '${FLAGSHIP_OPP_ID}';
      
      -- Subject facts for readiness
      insert into sih26044.readiness_subject_facts (
        subject_actor_id, education_level, education_level_confirmed,
        physical_presence_locations_complete, relevant_languages_complete
      ) values (
        '${CONTROLLED_STUDENT_ID}', 'undergraduate', true, true, true
      ) on conflict (subject_actor_id) do nothing;
    `);

    // STEP 2: Confirm actors exist and are active
    const actorCheck = spawnSync('docker', [
      'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
      'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-c',
      `select count(*) from sih26044.actors where id in ('${CONTROLLED_STUDENT_ID}', '${CONTROLLED_FACULTY_ID}') and status = 'active';`
    ], { encoding: 'utf8' });
    const activeCount = parseInt(actorCheck.stdout.trim());
    if (activeCount !== 2) {
      throw new Error(`Expected 2 active controlled actors, found ${activeCount}`);
    }
    console.log('   ✅ Controlled actors exist and are active');

    // STEP 3 & 4: Create auth users and bind to existing actors
    const anon = createClient(apiUrl, anonKey, { auth: { persistSession: false } });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    
    const studentEmail = `student-${suffix}@example.invalid`;
    const studentPassword = `Repair-${suffix}-Strong!`;
    const { data: studentCreated, error: studentCreateError } = await admin.auth.admin.createUser({
      email: studentEmail, password: studentPassword, email_confirm: true,
    });
    if (studentCreateError || !studentCreated.user) {
      throw new Error(`Student creation failed: ${studentCreateError?.message}`);
    }
    
    // Bind auth_user_id to EXISTING actor
    sql(`update sih26044.actors set auth_user_id = '${studentCreated.user.id}' where id = '${CONTROLLED_STUDENT_ID}';`);
    
    const { data: studentSignIn, error: studentSignInError } = await anon.auth.signInWithPassword({
      email: studentEmail, password: studentPassword,
    });
    if (studentSignInError || !studentSignIn.session) {
      throw new Error(`Student auth failed: ${studentSignInError?.message}`);
    }
    studentToken = studentSignIn.session.access_token;
    studentClient = createClient(apiUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${studentToken}` } },
      auth: { persistSession: false },
    });
    
    const facultyEmail = `faculty-${suffix}@example.invalid`;
    const facultyPassword = `Repair-${suffix}-Strong!`;
    const { data: facultyCreated, error: facultyCreateError } = await admin.auth.admin.createUser({
      email: facultyEmail, password: facultyPassword, email_confirm: true,
    });
    if (facultyCreateError || !facultyCreated.user) {
      throw new Error(`Faculty creation failed: ${facultyCreateError?.message}`);
    }
    
    // Bind auth_user_id to EXISTING actor
    sql(`update sih26044.actors set auth_user_id = '${facultyCreated.user.id}' where id = '${CONTROLLED_FACULTY_ID}';`);
    
    const { data: facultySignIn, error: facultySignInError } = await anon.auth.signInWithPassword({
      email: facultyEmail, password: facultyPassword,
    });
    if (facultySignInError || !facultySignIn.session) {
      throw new Error(`Faculty auth failed: ${facultySignInError?.message}`);
    }
    facultyClient = createClient(apiUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${facultySignIn.session.access_token}` } },
      auth: { persistSession: false },
    });
    
    console.log('   ✅ Auth users created and linked');

    // STEP 5: Assert current_actor_id() resolution
    const { data: studentActorId, error: studentActorError } = await studentClient
      .schema('sih26044')
      .rpc('current_actor_id');
    if (studentActorError) throw new Error(`Student current_actor_id failed: ${studentActorError.message}`);
    if (studentActorId !== CONTROLLED_STUDENT_ID) {
      throw new Error(`Student actor ID mismatch: expected ${CONTROLLED_STUDENT_ID}, got ${studentActorId}`);
    }
    
    const { data: facultyActorId, error: facultyActorError } = await facultyClient
      .schema('sih26044')
      .rpc('current_actor_id');
    if (facultyActorError) throw new Error(`Faculty current_actor_id failed: ${facultyActorError.message}`);
    if (facultyActorId !== CONTROLLED_FACULTY_ID) {
      throw new Error(`Faculty actor ID mismatch: expected ${CONTROLLED_FACULTY_ID}, got ${facultyActorId}`);
    }
    
    console.log('   ✅ current_actor_id() resolution verified');
  }, 30000);

  it('should execute production repair v4 and validate complete lifecycle', async () => {
    console.log('\n🔍 A. Executing production repair v4 migration...');
    
    // STEP 6: Execute the ACTUAL v4 repair migration
    const migrationPath = 'supabase/migrations/20260905150000_production_repair_v4_final.sql';
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    sql(migrationSQL);

    const baselineRepairPath = 'supabase/migrations/20260905210755_repair_v4_data_viz_self_confirmation.sql';
    const baselineRepairSQL = readFileSync(baselineRepairPath, 'utf8');
    sql(baselineRepairSQL);
    
    // Verify migration executed: 4 canonical evidence records
    const evidenceCount = parseInt(spawnSync('docker', [
      'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
      'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-c',
      `select count(*) from sih26044.evidence_records where subject_actor_id = '${CONTROLLED_STUDENT_ID}';`
    ], { encoding: 'utf8' }).stdout.trim());
    if (evidenceCount < 4) {
      throw new Error(`V4 repair migration did not create evidence - expected 4+, found ${evidenceCount}`);
    }
    
    // Verify flagship v2 exists with 5 requirements
    const requirementCount = parseInt(spawnSync('docker', [
      'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
      'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-c',
      `select count(*) from sih26044.opportunity_requirements where opportunity_version_id = '${FLAGSHIP_V2_ID}';`
    ], { encoding: 'utf8' }).stdout.trim());
    if (requirementCount !== 5) {
      throw new Error(`Expected 5 flagship v2 requirements, found ${requirementCount}`);
    }
    
    // Verify 3 closed historical vreqs + 1 pending
    const closedVreqCount = parseInt(spawnSync('docker', [
      'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
      'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-c',
      `select count(*) from sih26044.verification_requests where subject_actor_id = '${CONTROLLED_STUDENT_ID}' and status = 'closed';`
    ], { encoding: 'utf8' }).stdout.trim());
    if (closedVreqCount !== 3) {
      throw new Error(`Expected 3 closed vreqs, found ${closedVreqCount}`);
    }
    
    const pendingVreqCount = parseInt(spawnSync('docker', [
      'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
      'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-c',
      `select count(*) from sih26044.verification_requests where id = '${DATA_VIZ_VREQ}' and status = 'requested';`
    ], { encoding: 'utf8' }).stdout.trim());
    if (pendingVreqCount !== 1) {
      throw new Error(`Expected 1 pending Data Viz vreq, found ${pendingVreqCount}`);
    }
    
    console.log('   ✅ V4 repair executed: 4 evidence + 5 requirements + 3 closed + 1 pending vreq');

    console.log('\n🔍 B. Pre-attestation via Worker recompute...');
    
    // STEP 7: Student authenticated recompute
    const preRequest = new Request('http://localhost/sih/readiness/recompute', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ opportunityVersionId: FLAGSHIP_V2_ID }),
    });
    
    const preResponse = await handleSihRequest(preRequest, workerEnv, respond);
    if (!preResponse.ok) {
      const preError = await preResponse.text();
      throw new Error(`Pre-attestation failed (${preResponse.status}): ${preError}`);
    }
    
    const preData = await preResponse.json();
    const preReadiness = preData.result;
    
    // Validate the exact requirement-level baseline. The Data Visualization
    // request is pending, so its learner self-confirmation is weak—not strong.
    expect(preReadiness.evidenceCoverage.strong).toBeGreaterThanOrEqual(3);
    expect(preReadiness.requiredCoverage.met).toBe(3);
    expect(preReadiness.requiredCoverage.total).toBe(3);
    expect(preReadiness.eligibilityStatus).toBe('ELIGIBLE');
    const preRequirements = Object.fromEntries([
      ...preReadiness.requiredRequirementResults,
      ...preReadiness.preferredRequirementResults,
    ].map((result: { literalSourceWording: string; state: string }) => [
      result.literalSourceWording,
      result.state,
    ]));
    expect(preRequirements).toMatchObject({
      'Python data cleaning and preprocessing': 'MET_STRONG',
      'Structured data analysis and interpretation': 'MET_STRONG',
      'Research methodology documentation': 'MET_STRONG',
      'Data visualization for research reports': 'MET_WEAK_EVIDENCE',
      'Familiarity with AYUSH healthcare and traditional medicine terminology': 'UNKNOWN',
    });
    
    // Verify projection count matches migration (4 evidence records = 4 projections)
    const preProjectionCount = parseInt(spawnSync('docker', [
      'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
      'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-c',
      `select count(*) from sih26044.readiness_evidence_projections where subject_actor_id = '${CONTROLLED_STUDENT_ID}';`
    ], { encoding: 'utf8' }).stdout.trim());
    expect(preProjectionCount).toBe(4);
    
    console.log('   ✅ Pre: 3 STRONG + met 3/3 + ELIGIBLE + 4 projections');

    console.log('\n🔍 C. Faculty authenticated RPC decision...');
    
    // STEP 8: Faculty decision on pending Data Viz vreq
    const { data: decisionData, error: decisionError } = await facultyClient
      .schema('sih26044')
      .rpc('complete_verification_request_decision', {
        requested_verification_request_id: DATA_VIZ_VREQ,
        requested_evidence_record_id: DATA_VIZ_EVIDENCE,
        requested_action: 'verified_by_human',
        requested_actor_organization_id: CONTROLLED_INSTITUTION_ID,
        requested_reason: 'Observed Ananya independently create the visualization layer for the Sales Analytics Dashboard and explain the design choices.',
      });
    
    if (decisionError) throw new Error(`Faculty RPC failed: ${decisionError.message}`);
    expect(decisionData).toBeTruthy();
    
    // Verify vreq closed
    const vreqClosed = parseInt(spawnSync('docker', [
      'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
      'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-c',
      `select count(*) from sih26044.verification_requests where id = '${DATA_VIZ_VREQ}' and status = 'closed';`
    ], { encoding: 'utf8' }).stdout.trim());
    expect(vreqClosed).toBe(1);
    
    console.log('   ✅ Faculty decision executed, vreq closed');

    console.log('\n🔍 D. Post-attestation validation...');
    
    // STEP 9: Student recompute after attestation
    const postRequest = new Request('http://localhost/sih/readiness/recompute', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ opportunityVersionId: FLAGSHIP_V2_ID }),
    });
    
    const postResponse = await handleSihRequest(postRequest, workerEnv, respond);
    if (!postResponse.ok) throw new Error(`Post-attestation failed: ${postResponse.status}`);
    
    const postData = await postResponse.json();
    const postReadiness = postData.result;
    
    // The faculty decision is the causal state change for the same requirement.
    expect(postReadiness.evidenceCoverage.strong).toBeGreaterThanOrEqual(3);
    expect(postReadiness.requiredCoverage.met).toBe(3);
    const postRequirements = Object.fromEntries([
      ...postReadiness.requiredRequirementResults,
      ...postReadiness.preferredRequirementResults,
    ].map((result: { literalSourceWording: string; state: string }) => [
      result.literalSourceWording,
      result.state,
    ]));
    expect(postRequirements['Data visualization for research reports']).toBe('MET_STRONG');
    
    console.log(`   ✅ Post: ${postReadiness.evidenceCoverage.strong} STRONG after verification`);

    console.log('\n🔍 E. Idempotency validation...');
    
    // STEP 10: Execute v4 repair a SECOND time
    sql(migrationSQL);
    sql(baselineRepairSQL);
    
    // Verify counts unchanged (no duplicates)
    const evidenceCount2 = parseInt(spawnSync('docker', [
      'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
      'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-c',
      `select count(*) from sih26044.evidence_records where subject_actor_id = '${CONTROLLED_STUDENT_ID}';`
    ], { encoding: 'utf8' }).stdout.trim());
    expect(evidenceCount2).toBe(evidenceCount); // Same count as first run
    
    const vreqCount2 = parseInt(spawnSync('docker', [
      'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
      'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-c',
      `select count(*) from sih26044.verification_requests where subject_actor_id = '${CONTROLLED_STUDENT_ID}';`
    ], { encoding: 'utf8' }).stdout.trim());
    expect(vreqCount2).toBe(4); // Still 4 total (3 closed + 1 now closed)

    const selfConfirmationCount = parseInt(spawnSync('docker', [
      'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
      'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-c',
      `select count(*) from sih26044.verification_events where verification_request_id = '${DATA_VIZ_VREQ}' and action = 'self_confirmed';`
    ], { encoding: 'utf8' }).stdout.trim());
    expect(selfConfirmationCount).toBe(1);
    
    console.log('   ✅ Idempotency: second execution created no duplicates');

    console.log('\n✅ Production Repair V4 lifecycle complete');
  }, 60000);
});
