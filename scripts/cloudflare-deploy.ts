/** Deterministic credential-gated Pages + Worker deployment driver. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const target = process.argv[2];
if (!['preview', 'production'].includes(target)) throw new Error('Usage: cloudflare-deploy.ts [preview|production]');
if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) throw new Error('Cloudflare API token and account ID are required.');
if (target === 'production' && process.env.SIH_DEPLOY_CONFIRMATION !== 'DEPLOY_SIH26044_PRODUCTION') throw new Error('Production deployment requires SIH_DEPLOY_CONFIRMATION=DEPLOY_SIH26044_PRODUCTION.');
assert.ok(existsSync('dist/index.html'), 'run the production build first');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const workerName = target === 'preview' ? process.env.SIH_PREVIEW_WORKER_NAME : process.env.SIH_PRODUCTION_WORKER_NAME;
if (!workerName) throw new Error(`SIH_${target.toUpperCase()}_WORKER_NAME is required and must name a pre-provisioned Worker with encrypted secrets.`);
execFileSync('npx', ['--prefix', 'worker', 'wrangler', 'deploy', '--cwd', 'worker', '--name', workerName, '--keep-vars', '--strict', '--message', `SIH26044 ${target} ${sha}`], { stdio: 'inherit' });
execFileSync('npx', ['--prefix', 'worker', 'wrangler', 'pages', 'deploy', 'dist', '--project-name', 'careercase', '--branch', target === 'preview' ? `sih-preview-${sha.slice(0, 8)}` : 'main', '--commit-hash', sha, '--commit-dirty=false'], { stdio: 'inherit' });
console.log(`${target} deployment submitted for ${sha}; run deployment-smoke.ts against the returned origins.`);
