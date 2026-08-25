import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canEnterAuthoritativeEvidenceState,
  canRepresentConnectorAsLive,
  classifyUnresolvedRequirement,
  resolveSkill,
  suggestSkillResolutions,
} from '../src/app/domain';
import type { EvidenceRecord } from '../src/app/domain';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = join(repositoryRoot, 'src', 'app');

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : Promise.resolve(extname(path).startsWith('.ts') ? [path] : []);
  }));
  return nested.flat();
}

const isEngineBModule = (path: string) => {
  const normalized = path.split(sep).join('/');
  return normalized.includes('/src/app/domain/')
    || normalized.includes('/engine-b/')
    || normalized.includes('/engineB/')
    || normalized.includes('/opportunity-readiness/')
    || /\/src\/app\/engine\/(opportunity|gapClosure|collaborationPolicies)/.test(normalized);
};

const prohibitedPatterns: ReadonlyArray<[RegExp, string]> = [
  [/from\s+['"][^'"]*(?:\/|^)(?:matching|weights|gaps)['"]/, 'imports an Engine A scoring/readiness module'],
  [/\bGapReport\b/, 'references legacy GapReport'],
  [/\bgapReport\s*\.\s*readiness\b/, 'references legacy GapReport.readiness'],
  [/\bcomputeGapReport\b/, 'references the Engine A gap computation'],
];

const violations: string[] = [];
for (const path of (await sourceFiles(sourceRoot)).filter(isEngineBModule)) {
  const source = await readFile(path, 'utf8');
  for (const [pattern, reason] of prohibitedPatterns) {
    if (pattern.test(source)) violations.push(`${relative(repositoryRoot, path)}: ${reason}`);
  }
}
assert.deepEqual(violations, [], `Engine B boundary violations:\n${violations.join('\n')}`);

const pottery = resolveSkill('Pottery & Ceramics');
assert.equal(pottery.matchKind, 'exact');
assert.equal(pottery.skillId, 'pottery');
const unresolved = resolveSkill('  Quantum Ceramics  ');
assert.deepEqual(unresolved, { label: 'Quantum Ceramics', matchKind: 'none' });
assert.equal(suggestSkillResolutions('Quantum Ceramics').every(item => item.reviewOnly), true,
  'similarity results may only be review suggestions');
assert.equal(classifyUnresolvedRequirement(false), 'UNKNOWN');
assert.notEqual(classifyUnresolvedRequirement(false), 'GAP');

const aiProposed = {
  provenance: 'ai_proposed',
  verificationState: 'proposed',
} as EvidenceRecord;
assert.equal(canEnterAuthoritativeEvidenceState(aiProposed), false);
assert.equal(canEnterAuthoritativeEvidenceState({
  ...aiProposed,
  verificationState: 'self_confirmed',
} as EvidenceRecord), true, 'explicit user confirmation must be the minimum transition for an AI proposal');

assert.equal(canRepresentConnectorAsLive({
  key: 'example',
  displayName: 'Example target',
  capabilityState: 'target_architecture',
  operationalState: 'live_connected',
  supportedOperations: [],
  liveAuthorizationReference: 'claimed-but-not-implemented',
}), false, 'target architecture must never be represented as a live connector');

console.log(JSON.stringify({
  engineBFilesInspected: (await sourceFiles(sourceRoot)).filter(isEngineBModule).length,
  boundaryViolations: violations,
  exactResolution: pottery,
  unresolvedResolution: unresolved,
  unknownIsNotGap: true,
  aiAuthorityGuard: true,
  connectorTruthGuard: true,
}, null, 2));
