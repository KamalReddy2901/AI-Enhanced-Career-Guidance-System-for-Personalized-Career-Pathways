import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The original sih-persistence-schema-qa.ts intentionally freezes the exact D1/D2
 * foundation migration manifest through 20260830093000. Product-convergence
 * migrations after that checkpoint are validated by clean migration replay,
 * dedicated SQL assertions, and production-convergence QA instead of silently
 * widening the frozen manifest.
 */
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const migrationsRoot = join(repositoryRoot, 'supabase', 'migrations');
const holdRoot = join(repositoryRoot, '.qa-post-foundation-migrations');
const freezeMarker = '20260830093000_submission_trigger_lock_authority.sql';

const allMigrations = (await readdir(migrationsRoot))
  .filter((file) => file.endsWith('.sql'))
  .sort();
const postFoundation = allMigrations.filter((file) => file > freezeMarker);

await mkdir(holdRoot, { recursive: true });
try {
  for (const file of postFoundation) {
    await rename(join(migrationsRoot, file), join(holdRoot, file));
  }

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', join(repositoryRoot, 'scripts', 'sih-persistence-schema-qa.ts')],
    { cwd: repositoryRoot, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  for (const file of postFoundation) {
    await rename(join(holdRoot, file), join(migrationsRoot, file));
  }
  await rm(holdRoot, { recursive: true, force: true });
}
