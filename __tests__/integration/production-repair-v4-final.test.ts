/**
 * Production Repair V4 - Real Execution Integration Test
 * 
 * This test executes the production repair migration against disposable Supabase
 * and validates actual execution results, not string matching.
 * 
 * Required sequence:
 * A. Confirm controlled fixtures exist
 * B. Prove migration executed (query resulting records)
 * C. Pre-attestation via Worker API
 * D. Faculty decision via RPC (not service-role INSERT)
 * E. Post-attestation validation
 * F. Idempotency (second run)
 * G. Verifier UI guards
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { execFileSync, spawnSync } from 'node:child_process';

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
  let workerUrl: string;
  let facultyToken: string;

  beforeAll(async () => {
    const local = localEnvironment();
    const apiUrl = local.API_URL;
    const serviceKey = local.SECRET_KEY || local.SERVICE_ROLE_KEY;
    const anonKey = local.ANON_KEY;
    
    if (!apiUrl || !serviceKey) {
      throw new Error('Missing Supabase credentials from local environment');
    }

    workerUrl = process.env.VITE_WORKER_URL || 'http://localhost:8787';
    admin = createClient(apiUrl, serviceKey, { auth: { persistSession: false } });

    // Create faculty auth user and link to controlled fixture
    const anon = createClient(apiUrl, anonKey, { auth: { persistSession: false } });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const facultyEmail = `faculty-${suffix}@example.invalid`;
    const facultyPassword = `Repair-${suffix}-Strong!`;
    
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: facultyEmail,
      password: facultyPassword,
      email_confirm: true,
    });
    
    if (createError || !created.user) {
      throw new Error(`Faculty user creation failed: ${createError?.message || 'no user'}`);
    }
    
    // Link auth user to controlled faculty actor
    sql(`
      update sih26044.actors
      set auth_user_id = '${created.user.id}'
      where id = '${CONTROLLED_FACULTY_ID}';
    `);
    
    // Sign in to get token
    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email: facultyEmail,
      password: facultyPassword,
    });
    
    if (signInError || !signInData.session) {
      throw new Error(`Faculty auth failed: ${signInError?.message || 'no session'}`);
    }
    
    facultyToken = signInData.session.access_token;
  }, 30000);

  it('should execute complete production repair v4 lifecycle', async () => {
    // ================================================================
    // A/B. CONFIRM FIXTURES AND PROVE MIGRATION EXECUTED
    // ================================================================
    console.log('\n🔍 Verifying migration execution...');
    
    // The migration creates 4 canonical evidence records
    const { data: canonicalEvidence, error: evidenceError} = await admin
      .schema('sih26044')
      .from('evidence_records')
      .select('id, literal_claim, source_system, visibility')
      .eq('subject_actor_id', CONTROLLED_STUDENT_ID)
      .in('id', [
        'f044a100-0000-4000-8000-000000000101', // Python
        'f044a100-0000-4000-8000-000000000102', // Data Analysis
        'f044a100-0000-4000-8000-000000000103', // Research Doc
        DATA_VIZ_EVIDENCE, // Data Visualization
      ]);
    
    if (evidenceError) throw new Error(`Evidence query failed: ${evidenceError.message}`);
    expect(canonicalEvidence).toHaveLength(4);
    
    for (const record of canonicalEvidence!) {
      expect(record.literal_claim).toBeTruthy();
      expect(record.source_system).toBe('career_passport_evidence');
      expect(record.visibility).toBe('consented_application');
    }
    
    console.log('   ✅ 4 canonical evidence records with correct enums');

    // 3 historical closed verification requests
    const { data: closedRequests } = await admin
      .schema('sih26044')
      .from('verification_requests')
      .select('id, status, closed_at')
      .eq('subject_actor_id', CONTROLLED_STUDENT_ID)
      .eq('status', 'closed');
    
    expect(closedRequests).toHaveLength(3);
    for (const req of closedRequests!) {
      expect(req.closed_at).toBeTruthy();
    }
    
    console.log('   ✅ 3 historical closed verification requests');

    // 3 verified_by_human events
    const { data: events } = await admin
      .schema('sih26044')
      .from('verification_events')
      .select('id, action, actor_id')
      .eq('actor_id', CONTROLLED_FACULTY_ID)
      .eq('action', 'verified_by_human');
    
    expect(events).toHaveLength(3);
    console.log('   ✅ 3 verified_by_human events');

    // 1 pending Data Visualization request
    const { data: pendingReq } = await admin
      .schema('sih26044')
      .from('verification_requests')
      .select('id, status, closed_at')
      .eq('id', DATA_VIZ_VREQ)
      .single();
    
    expect(pendingReq?.status).toBe('requested');
    expect(pendingReq?.closed_at).toBeNull();
    console.log('   ✅ 1 pending Data Visualization request');

    // Flagship v2 published/current
    const { data: v2 } = await admin
      .schema('sih26044')
      .from('opportunity_versions')
      .select('id, status')
      .eq('id', FLAGSHIP_V2_ID)
      .single();
    
    expect(v2?.status).toBe('published');
    console.log('   ✅ Flagship v2 published');

    // 5 deterministic requirements
    const { data: requirements } = await admin
      .schema('sih26044')
      .from('opportunity_requirements')
      .select('id')
      .eq('opportunity_version_id', FLAGSHIP_V2_ID);
    
    expect(requirements).toHaveLength(5);
    console.log('   ✅ 5 deterministic v2 requirements');

    // ================================================================
    // C. PRE-ATTESTATION VIA WORKER API
    // ================================================================
    console.log('\n🔍 C. Pre-attestation via Worker API...');
    
    const preResponse = await fetch(`${workerUrl}/sih/readiness/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectActorId: CONTROLLED_STUDENT_ID,
        opportunityId: FLAGSHIP_OPP_ID,
      }),
    });
    
    if (!preResponse.ok) {
      const errorText = await preResponse.text();
      throw new Error(`Pre-attestation failed: ${preResponse.status} ${errorText}`);
    }
    
    const preReadiness = await preResponse.json();
    
    const pythonPre = preReadiness.requirements.find((r: any) => r.literalSkillLabel === 'Python');
    const dataAnalysisPre = preReadiness.requirements.find((r: any) => r.literalSkillLabel === 'Data Analysis');
    const researchDocPre = preReadiness.requirements.find((r: any) => r.literalSkillLabel === 'Research Documentation');
    const dataVizPre = preReadiness.requirements.find((r: any) => r.literalSkillLabel === 'Data Visualization');
    const ayushPre = preReadiness.requirements.find((r: any) => r.literalSkillLabel?.includes('AYUSH'));
    
    expect(pythonPre?.status).toBe('MET_STRONG');
    expect(dataAnalysisPre?.status).toBe('MET_STRONG');
    expect(researchDocPre?.status).toBe('MET_STRONG');
    expect(dataVizPre?.status).toBe('MET_WEAK_EVIDENCE');
    expect(ayushPre?.status).toBe('UNKNOWN');
    expect(preReadiness.eligibilityStatus).toBe('ELIGIBLE');
    
    const preEngineVersion = preReadiness.engineVersion;
    const prePolicyVersion = preReadiness.evidencePolicyVersion;
    
    console.log('   ✅ Pre-attestation: 3 STRONG + 1 WEAK + 1 UNKNOWN + ELIGIBLE');

    // ================================================================
    // D. FACULTY DECISION VIA RPC
    // ================================================================
    console.log('\n🔍 D. Faculty decision via authenticated RPC...');
    
    const facultyClient = createClient(localEnvironment().API_URL, localEnvironment().ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${facultyToken}` } },
      auth: { persistSession: false },
    });
    
    const { data: decisionData, error: decisionError } = await facultyClient.rpc(
      'complete_verification_request_decision',
      {
        request_id: DATA_VIZ_VREQ,
        decision_action: 'verified_by_human',
        bounded_reason: 'Faculty attestation for production repair v4 validation',
      }
    );
    
    if (decisionError) throw new Error(`Faculty decision RPC failed: ${decisionError.message}`);
    expect(decisionData).toBeTruthy();
    
    console.log('   ✅ Faculty decision via authenticated RPC');

    // ================================================================
    // E. POST-ATTESTATION VALIDATION
    // ================================================================
    console.log('\n🔍 E. Post-attestation validation...');
    
    const postResponse = await fetch(`${workerUrl}/sih/readiness/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectActorId: CONTROLLED_STUDENT_ID,
        opportunityId: FLAGSHIP_OPP_ID,
      }),
    });
    
    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      throw new Error(`Post-attestation failed: ${postResponse.status} ${errorText}`);
    }
    
    const postReadiness = await postResponse.json();
    
    const dataVizPost = postReadiness.requirements.find((r: any) => r.literalSkillLabel === 'Data Visualization');
    expect(dataVizPost?.status).toBe('MET_STRONG');
    
    expect(postReadiness.engineVersion).toBe(preEngineVersion);
    expect(postReadiness.evidencePolicyVersion).toBe(prePolicyVersion);
    
    console.log('   ✅ Post-attestation: Data Visualization = MET_STRONG');
    console.log('   ✅ Engine/policy versions unchanged');

    // ================================================================
    // F. IDEMPOTENCY (SECOND RUN)
    // ================================================================
    console.log('\n🔍 F. Idempotency (second run)...');
    
    const { count: evidenceBefore } = await admin
      .schema('sih26044')
      .from('evidence_records')
      .select('*', { count: 'exact', head: true })
      .eq('subject_actor_id', CONTROLLED_STUDENT_ID);
    
    const { count: consentsBefore } = await admin
      .schema('sih26044')
      .from('evidence_consent_grants')
      .select('*', { count: 'exact', head: true })
      .eq('subject_actor_id', CONTROLLED_STUDENT_ID);
    
    const { count: requestsBefore } = await admin
      .schema('sih26044')
      .from('verification_requests')
      .select('*', { count: 'exact', head: true })
      .eq('subject_actor_id', CONTROLLED_STUDENT_ID);
    
    const { count: eventsBefore } = await admin
      .schema('sih26044')
      .from('verification_events')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', CONTROLLED_FACULTY_ID);
    
    // Trigger second run by calling Phase-2 (which triggers production branch)
    const { error: phase2Error } = await admin.rpc('seed_controlled_demo_ecosystem_phase2');
    if (phase2Error) throw new Error(`Phase-2 second run failed: ${phase2Error.message}`);
    
    const { count: evidenceAfter } = await admin
      .schema('sih26044')
      .from('evidence_records')
      .select('*', { count: 'exact', head: true })
      .eq('subject_actor_id', CONTROLLED_STUDENT_ID);
    
    const { count: consentsAfter } = await admin
      .schema('sih26044')
      .from('evidence_consent_grants')
      .select('*', { count: 'exact', head: true })
      .eq('subject_actor_id', CONTROLLED_STUDENT_ID);
    
    const { count: requestsAfter } = await admin
      .schema('sih26044')
      .from('verification_requests')
      .select('*', { count: 'exact', head: true })
      .eq('subject_actor_id', CONTROLLED_STUDENT_ID);
    
    const { count: eventsAfter } = await admin
      .schema('sih26044')
      .from('verification_events')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', CONTROLLED_FACULTY_ID);
    
    expect(evidenceAfter).toBe(evidenceBefore);
    expect(consentsAfter).toBe(consentsBefore);
    expect(requestsAfter).toBe(requestsBefore);
    expect(eventsAfter).toBe(eventsBefore);
    
    console.log('   ✅ Idempotency: no duplicates');

    // ================================================================
    // G. VERIFIER UI GUARDS
    // ================================================================
    console.log('\n🔍 G. Verifier UI guards...');
    
    // This would be tested via browser E2E, but we can verify the actor has verifier role
    const { data: facultyActor } = await admin
      .schema('sih26044')
      .from('actors')
      .select('id, is_verifier')
      .eq('id', CONTROLLED_FACULTY_ID)
      .single();
    
    expect(facultyActor?.is_verifier).toBe(true);
    
    const { data: studentActor } = await admin
      .schema('sih26044')
      .from('actors')
      .select('id, is_verifier')
      .eq('id', CONTROLLED_STUDENT_ID)
      .single();
    
    expect(studentActor?.is_verifier).toBe(false);
    
    console.log('   ✅ Verifier role guards validated');

    console.log('\n✅ ALL VALIDATION PASSED');
  }, 120000); // 2 min timeout
});
