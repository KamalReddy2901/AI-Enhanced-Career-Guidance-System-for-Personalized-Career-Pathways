import assert from 'node:assert/strict';
import {
  navigateWhenPresentationAuthorityIsReady,
  waitForPresentationAuthority,
  type PresentationAuthoritySnapshot,
} from '../src/app/sih/presentationAuthority';
import {
  presentationVerificationActorLabel,
  presentationVerificationReason,
} from '../src/app/components/evidence/presentationVerification';

const expected = {
  userId: 'fixture-user',
  email: 'sih26044-controlled-student@example.invalid',
};
const ready: PresentationAuthoritySnapshot = {
  ...expected,
  fixtureNamespace: 'sih26044-controlled-v1',
  actorId: 'student-actor',
  membershipCount: 1,
  roleReadSucceeded: true,
};

let releaseProbe!: (snapshot: PresentationAuthoritySnapshot) => void;
const pendingProbe = new Promise<PresentationAuthoritySnapshot>((resolve) => {
  releaseProbe = resolve;
});
let navigated = false;
const opening = navigateWhenPresentationAuthorityIsReady(
  () => pendingProbe,
  expected,
  () => { navigated = true; },
  [0],
  async () => undefined,
);
await Promise.resolve();
assert.equal(navigated, false, 'protected navigation must wait for SIH authority');
releaseProbe(ready);
await opening;
assert.equal(navigated, true, 'protected navigation proceeds after SIH authority is ready');

let attempts = 0;
await waitForPresentationAuthority(
  async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('transient authority read');
    return ready;
  },
  expected,
  [0, 1],
  async () => undefined,
);
assert.equal(attempts, 2, 'authority retry is bounded and recovers once ready');

await assert.rejects(
  waitForPresentationAuthority(
    async () => ({ ...ready, userId: 'wrong-user' }),
    expected,
    [0, 1, 1],
    async () => undefined,
  ),
);

assert.equal(presentationVerificationActorLabel('self_confirmed'), 'Recorded by learner');
assert.equal(presentationVerificationActorLabel('verified_by_human'), 'Recorded by authorized faculty');
assert.equal(presentationVerificationActorLabel('verified_by_issuer'), 'Recorded by authorized issuer');
assert.equal(presentationVerificationActorLabel('corrected'), 'Recorded in verification history');

const storedReason = 'Observed Ananya independently create the visualization layer for the Sales Analytics Dashboard and explain the design choices.';
const displayedReason = presentationVerificationReason('verified_by_human', storedReason);
assert.equal(displayedReason, 'Observed Ananya independently create the visualization layer and explain the design choices.');
assert.equal(storedReason.includes('Sales Analytics Dashboard'), true, 'display normalization must not mutate persisted history input');
assert.equal(presentationVerificationReason('self_confirmed', storedReason), storedReason);

console.log('Presentation reliability QA passed.');
