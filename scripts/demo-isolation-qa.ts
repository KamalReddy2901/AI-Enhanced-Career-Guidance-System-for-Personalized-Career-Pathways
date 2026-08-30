import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const appRoot = join(repositoryRoot, 'src', 'app');

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : Promise.resolve(['.ts', '.tsx'].includes(extname(path)) ? [path] : []);
  }));
  return nested.flat();
}

const demoRuntimeFiles = [
  ...(await sourceFiles(join(appRoot, 'demo'))),
  ...(await sourceFiles(join(appRoot, 'components', 'demo'))),
  join(appRoot, 'context', 'DemoSihContext.tsx'),
  join(appRoot, 'services', 'recruiterProjection.ts'),
];

const prohibited: ReadonlyArray<[RegExp, string]> = [
  [/AuthContext|AuthProvider|useAuth/, 'production authentication context'],
  [/GuidanceContext|GuidanceProvider|useGuidance/, 'Career Guidance context'],
  [/AppContext|AppProvider/, 'legacy application context'],
  [/services\/supabase|\bsupabase\b/i, 'production Supabase service'],
  [/guidanceDb/, 'production guidance database'],
  [/services\/ai|\bGroq\b|Cloudflare/i, 'production AI or Worker adapter'],
  [/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bIDBDatabase\b/, 'browser persistence'],
  [/\bfetch\s*\(/, 'network domain-data request'],
  [/\bDate\.now\s*\(|\bMath\.random\s*\(|\brandomUUID\s*\(/, 'nondeterministic fixture identity or time'],
  [/CareerPassport|RecommendationSet|GapReport/, 'Engine A or full Career Passport contract'],
];

const violations: string[] = [];
for (const path of demoRuntimeFiles) {
  const source = await readFile(path, 'utf8');
  for (const [pattern, label] of prohibited) {
    if (pattern.test(source)) violations.push(`${relative(repositoryRoot, path)}: ${label}`);
  }
}
assert.deepEqual(violations, [], `Controlled demo isolation violations:\n${violations.join('\n')}`);

const appSource = await readFile(join(appRoot, 'App.tsx'), 'utf8');
assert.doesNotMatch(appSource, /AuthProvider|GuidanceProvider|AppProvider/,
  'global App shell must not mount production state providers');
const routeSource = await readFile(join(appRoot, 'routes.ts'), 'utf8');
assert.match(routeSource, /Component:\s*LegacyCareerCaseRuntime/);
assert.match(routeSource, /path:\s*['"]\/demo['"][\s\S]*Component:\s*DemoSihRuntime/);
const demoRouteIndex = Math.max(routeSource.indexOf("path: '/demo'"), routeSource.indexOf('path: "/demo"'));
assert.equal(demoRouteIndex > routeSource.indexOf('Component: LegacyCareerCaseRuntime'), true,
  'controlled demo must be a top-level sibling runtime');
const rootLayoutSource = await readFile(join(appRoot, 'pages', 'RootLayout.tsx'), 'utf8');
assert.doesNotMatch(rootLayoutSource, /['"]\/demo(?:\/|['"])/,
  'RootLayout auth exceptions must not contain the controlled demo');
const demoRuntimeSource = await readFile(join(appRoot, 'demo', 'DemoSihRuntime.tsx'), 'utf8');
assert.match(demoRuntimeSource, /DemoSihProvider/);
assert.doesNotMatch(demoRuntimeSource, /LegacyCareerCaseRuntime|RootLayout/);

const mainSource = await readFile(join(repositoryRoot, 'src', 'main.tsx'), 'utf8');
assert.match(mainSource, /!isControlledDemoPath/,
  'optional production analytics injection must remain disabled for controlled demo paths');

console.log(JSON.stringify({
  demoRuntimeFilesInspected: demoRuntimeFiles.length,
  violations,
  globalProviderShellSafe: true,
  demoSiblingRoute: true,
  rootAuthBoundaryUnchanged: true,
  demoAnalyticsInjectionDisabled: true,
}, null, 2));
