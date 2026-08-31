import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const [theme, timeline, student, recruiter] = await Promise.all([
  readFile(join(root, 'src/styles/theme.css'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/application/ApplicationRecruitmentTimeline.tsx'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/student/application/StudentApplicationDetail.tsx'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/recruiter/HumanStageActionPanel.tsx'), 'utf8'),
]);
assert.match(theme, /:focus-visible/);
assert.match(theme, /prefers-reduced-motion/);
assert.match(theme, /min-height:\s*44px|min-h-11/);
assert.match(theme, /@media\s*\(max-width:\s*320px\)|320px/);
for (const surface of [timeline, student, recruiter]) {
  assert.match(surface, /aria-|<label|htmlFor|role=/, 'Interactive SIH surfaces need semantic labels or roles');
}
assert.match(student, /role="alert"/);
console.log('Accessibility static QA passed.');
