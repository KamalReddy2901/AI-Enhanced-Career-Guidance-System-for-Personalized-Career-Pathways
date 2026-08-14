import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRetryWithoutJsonMode } from '../src/responsePolicy.ts';

test('retries Groq strict JSON validation failures without response_format', () => {
  assert.equal(shouldRetryWithoutJsonMode(400, true, {
    error: { message: 'Failed to validate JSON', code: 'json_validate_failed', failed_generation: '{}' },
  }), true);
});

test('does not retry unrelated request or authentication failures', () => {
  assert.equal(shouldRetryWithoutJsonMode(400, true, { error: { message: 'Invalid temperature' } }), false);
  assert.equal(shouldRetryWithoutJsonMode(401, true, { error: { message: 'Unauthorized' } }), false);
  assert.equal(shouldRetryWithoutJsonMode(400, false, { error: { message: 'Failed to validate JSON' } }), false);
});
