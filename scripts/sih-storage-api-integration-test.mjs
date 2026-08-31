#!/usr/bin/env node
/**
 * SIH26044 Storage API integration test.
 *
 * Exercises authenticated Storage lifecycle assertions that cannot be tested
 * through direct SQL mutation (modern Supabase blocks direct Storage writes).
 *
 * Required preconditions:
 * - Local Supabase is running with all migrations applied
 * - Disposable local Auth users and SIH actors have been seeded
 *
 * Assertions:
 * A. Learner A can upload to own actor path
 * B. Learner A cannot upload into learner B's actor path
 * C. Owner can delete orphan upload through Storage API
 * D. Learner A can read their own registered artifact
 * E. Normal client cannot overwrite/upsert registered artifact
 * F. Normal client cannot delete registered artifact
 * G. Learner B cannot read learner A's private artifact
 * H. Bucket is private
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Controlled test user credentials (disposable local-only).
const LEARNER_A_EMAIL = 'learner-a-test@careercase.local';
const LEARNER_A_PASS = 'test-password-learner-a';
const LEARNER_A_ACTOR_ID = '20000000-0000-0000-0000-000000000001';

const LEARNER_B_EMAIL = 'learner-b-test@careercase.local';
const LEARNER_B_PASS = 'test-password-learner-b';
const LEARNER_B_ACTOR_ID = '20000000-0000-0000-0000-000000000002';

const BUCKET = 'career-evidence-private';

let assertionCount = 0;

function assert(condition, message) {
  assertionCount++;
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function setupTestUsers() {
  console.log('Setting up disposable local Auth users...');
  
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Create learner A
  const { data: learnerA, error: errorA } = await adminClient.auth.signUp({
    email: LEARNER_A_EMAIL,
    password: LEARNER_A_PASS,
  });
  
  if (errorA && !errorA.message.includes('already registered')) {
    throw new Error(`Failed to create learner A: ${errorA.message}`);
  }
  
  const learnerAUserId = learnerA?.user?.id || '10000000-0000-0000-0000-000000000001';
  
  // Create learner B
  const { data: learnerB, error: errorB } = await adminClient.auth.signUp({
    email: LEARNER_B_EMAIL,
    password: LEARNER_B_PASS,
  });
  
  if (errorB && !errorB.message.includes('already registered')) {
    throw new Error(`Failed to create learner B: ${errorB.message}`);
  }
  
  const learnerBUserId = learnerB?.user?.id || '10000000-0000-0000-0000-000000000002';
  
  // Create SIH actors through privileged SQL fixture
  execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
    INSERT INTO auth.users (id, email) 
    VALUES 
      ('${learnerAUserId}', '${LEARNER_A_EMAIL}'),
      ('${learnerBUserId}', '${LEARNER_B_EMAIL}')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO sih26044.actors (id, auth_user_id, display_name) 
    VALUES 
      ('${LEARNER_A_ACTOR_ID}', '${learnerAUserId}', 'Learner A Test'),
      ('${LEARNER_B_ACTOR_ID}', '${learnerBUserId}', 'Learner B Test')
    ON CONFLICT (id) DO NOTHING;
  " 2>&1`, { encoding: 'utf-8' });
  
  console.log('✓ Test users and actors created');
}

async function getAuthenticatedClient(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw new Error(`Auth failed for ${email}: ${error.message}`);
  }
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
  });
}

async function runTests() {
  console.log('\nRunning Storage API assertions...\n');
  
  // Get authenticated clients
  const learnerAClient = await getAuthenticatedClient(LEARNER_A_EMAIL, LEARNER_A_PASS);
  const learnerBClient = await getAuthenticatedClient(LEARNER_B_EMAIL, LEARNER_B_PASS);
  
  // A. Learner A can upload to own actor path
  const orphanArtifactId = '90100000-0000-0000-0000-000000000001';
  const orphanPath = `${LEARNER_A_ACTOR_ID}/${orphanArtifactId}/orphan.txt`;
  const orphanContent = new Blob(['Orphan upload content'], { type: 'text/plain' });
  
  const { error: uploadError } = await learnerAClient.storage
    .from(BUCKET)
    .upload(orphanPath, orphanContent);
  
  assert(!uploadError, `learner A can upload to own actor path (error: ${uploadError?.message})`);
  console.log('✓ A. Learner A can upload to own actor path');
  
  // B. Learner A cannot upload into learner B's actor path
  const crossActorPath = `${LEARNER_B_ACTOR_ID}/artifact-x/cross-actor-attempt.txt`;
  const crossActorContent = new Blob(['Unauthorized cross-actor upload'], { type: 'text/plain' });
  
  const { error: crossUploadError } = await learnerAClient.storage
    .from(BUCKET)
    .upload(crossActorPath, crossActorContent);
  
  assert(crossUploadError !== null, 'learner A cannot upload into learner B actor path');
  console.log('✓ B. Learner A cannot upload into learner B actor path');
  
  // C. Owner can delete orphan upload through Storage API
  const { error: deleteOrphanError } = await learnerAClient.storage
    .from(BUCKET)
    .remove([orphanPath]);

  assert(!deleteOrphanError, `owner can delete orphan upload (error: ${deleteOrphanError?.message})`);

  // Postcondition: verify orphan is actually deleted
  const { error: postDeleteCheck } = await learnerAClient.storage
    .from(BUCKET)
    .download(orphanPath);

  assert(postDeleteCheck !== null, 'orphan upload is actually deleted');
  console.log('✓ C. Owner can delete orphan upload');
  
  // Setup: Create registered artifact fixture
  const registeredArtifactId = '90000000-0000-0000-0000-000000000001';
  const registeredPath = `${LEARNER_A_ACTOR_ID}/${registeredArtifactId}/evidence-a.txt`;
  const registeredContent = new Blob(['Registered evidence artifact'], { type: 'text/plain' });
  
  const { error: setupUploadError } = await learnerAClient.storage
    .from(BUCKET)
    .upload(registeredPath, registeredContent);
  
  if (setupUploadError) {
    throw new Error(`Setup failed: could not upload registered artifact (${setupUploadError.message})`);
  }
  
  // Register the artifact through privileged SQL
  execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
    INSERT INTO sih26044.evidence_records (
      id, subject_actor_id, literal_claim, provenance, initial_verification_state,
      scope_kind, scope_literal_skill_label, source_system, source_captured_at
    ) VALUES (
      '60000000-0000-0000-0000-000000000001', '${LEARNER_A_ACTOR_ID}',
      'Storage API test evidence', 'self_reported', 'self_confirmed',
      'global_skill', 'Test Skill', 'local_test', now()
    ) ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO sih26044.artifacts (
      id, subject_actor_id, storage_object_path, media_type, display_name,
      integrity_fingerprint, scan_status
    ) VALUES (
      '${registeredArtifactId}', '${LEARNER_A_ACTOR_ID}',
      '${registeredPath}', 'text/plain', 'Evidence A',
      'sha256:test-storage-api', 'pending'
    ) ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO sih26044.evidence_artifact_links (
      evidence_record_id, artifact_id, linked_by_actor_id
    ) VALUES (
      '60000000-0000-0000-0000-000000000001', '${registeredArtifactId}',
      '${LEARNER_A_ACTOR_ID}'
    ) ON CONFLICT DO NOTHING;
  " 2>&1`, { encoding: 'utf-8' });
  
  console.log('  (registered artifact fixture created)');
  
  // D. Learner A can read their own registered artifact
  const { data: readOwnData, error: readOwnError } = await learnerAClient.storage
    .from(BUCKET)
    .download(registeredPath);
  
  assert(!readOwnError && readOwnData, 'learner A can read their own registered artifact');
  console.log('✓ D. Learner A can read their own registered artifact');
  
  // E. Normal client cannot overwrite/upsert registered artifact
  const overwriteContent = new Blob(['Overwrite attempt'], { type: 'text/plain' });

  const { error: overwriteError } = await learnerAClient.storage
    .from(BUCKET)
    .upload(registeredPath, overwriteContent, { upsert: true });

  // Postcondition: verify original content is unchanged
  const { data: afterOverwriteAttempt } = await learnerAClient.storage
    .from(BUCKET)
    .download(registeredPath);

  const afterOverwriteText = await afterOverwriteAttempt.text();
  assert(afterOverwriteText === 'Registered evidence artifact', 'normal client cannot overwrite registered artifact');
  console.log('✓ E. Normal client cannot overwrite registered artifact');
  
  // F. Normal client cannot delete registered artifact
  const { error: deleteRegisteredError } = await learnerAClient.storage
    .from(BUCKET)
    .remove([registeredPath]);

  // Postcondition: verify object still exists and is readable
  const { data: stillExists, error: postDeleteReadError } = await learnerAClient.storage
    .from(BUCKET)
    .download(registeredPath);

  assert(stillExists !== null && !postDeleteReadError, 'normal client cannot delete registered artifact');
  console.log('✓ F. Normal client cannot delete registered artifact');
  
  // G. Learner B cannot read learner A's private artifact
  const { error: crossReadError } = await learnerBClient.storage
    .from(BUCKET)
    .download(registeredPath);
  
  assert(crossReadError !== null, 'learner B cannot read learner A private artifact');
  console.log('✓ G. Learner B cannot read learner A private artifact');
  
  // H. Bucket is private (implicit through all above assertions requiring auth)
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: anonReadError } = await anonClient.storage
    .from(BUCKET)
    .download(registeredPath);
  
  assert(anonReadError !== null, 'bucket is private (anonymous read blocked)');
  console.log('✓ H. Bucket is private');
}

async function main() {
  try {
    console.log('SIH26044 Storage API Integration Test\n');
    console.log(`Target: ${SUPABASE_URL}`);
    console.log(`Bucket: ${BUCKET}\n`);
    
    // Verify we're targeting local Supabase
    if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
      throw new Error('SAFETY: This test must only run against local Supabase');
    }
    
    await setupTestUsers();
    await runTests();
    
    console.log(`\n✓ All Storage API assertions passed (${assertionCount} assertions)\n`);
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Storage API test failed:', error.message);
    process.exit(1);
  }
}

main();
