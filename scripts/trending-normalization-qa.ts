import assert from 'node:assert/strict';
import { normalizeTrendingCareers } from '../src/app/services/trendingSchemas';

const complete = normalizeTrendingCareers({
  rising: [{ title: 'Data Analyst', reason: 'Demand remains strong.' }],
  emerging: [{ title: 'AI Safety Specialist', reason: 'New governance needs.' }],
  declining: [{ title: 'Data Entry Clerk', reason: 'Automation replaces routine tasks.' }],
});
assert.equal(complete.rising[0].title, 'Data Analyst');
assert.equal(complete.emerging.length, 1);
assert.equal(complete.declining.length, 1);

const legacyOrMalformed = normalizeTrendingCareers({
  rising: [{ title: '  Solar Technician  ', reason: 42 }, null],
  emerging: 'not-an-array',
});
assert.deepEqual(legacyOrMalformed, {
  rising: [{ title: 'Solar Technician', reason: '' }],
  emerging: [],
  declining: [],
});

assert.deepEqual(normalizeTrendingCareers(null), { rising: [], emerging: [], declining: [] });

console.log(JSON.stringify({ scenarios: 3, failures: [] }));
