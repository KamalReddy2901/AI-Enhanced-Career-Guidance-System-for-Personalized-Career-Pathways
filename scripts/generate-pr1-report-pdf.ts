/**
 * generate-pr1-report-pdf.ts  v2
 * Reads the PR1 inspection report markdown → writes a fully self-contained HTML
 * (no external fonts, no CDN) → Edge headless prints it to PDF.
 *
 * Run:  npx tsx scripts/generate-pr1-report-pdf.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const MD_PATH = join(
  'C:\\Users\\harsh\\.gemini\\antigravity-ide\\brain\\3130be11-dd49-4877-a2d1-70b79e8d3f86',
  'CareerCase_SIH26044_PR1_Inspection_Report.md',
);
const HTML_OUT = join(root, 'CareerCase_SIH26044_PR1_Inspection_Report.html');
const PDF_OUT  = join(root, 'CareerCase_SIH26044_PR1_Inspection_Report.pdf');

// ─── 1. Read source ────────────────────────────────────────────────────────
const md = readFileSync(MD_PATH, 'utf8');

// ─── 2. Markdown → HTML ────────────────────────────────────────────────────
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(raw: string): string {
  // First escape HTML entities, then apply markdown inline rules
  let s = esc(raw);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // strip link URLs but keep the text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '<span class="lnk">$1</span>');
  return s;
}

function mdToHtml(src: string): string {
  const lines = src.split(/\r?\n/);
  const out: string[] = [];
  let inCode  = false;
  let inTable = false;
  let codeBuf: string[] = [];
  let codeLang = '';
  let inList  = false;

  function flushTable() {
    if (inTable) { out.push('</tbody></table>'); inTable = false; }
  }
  function flushList() {
    if (inList) { out.push('</ul>'); inList = false; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trim = line.trimEnd();

    // ── Fenced code ─────────────────────────────────────────────────────────
    if (/^```/.test(trim)) {
      if (!inCode) {
        flushTable(); flushList();
        codeLang = trim.slice(3).trim();
        inCode = true; codeBuf = [];
      } else {
        const langClass = codeLang ? ` class="language-${codeLang}"` : '';
        out.push(`<pre><code${langClass}>${esc(codeBuf.join('\n'))}</code></pre>`);
        inCode = false;
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    // ── HR ──────────────────────────────────────────────────────────────────
    if (/^-{3,}\s*$/.test(trim) || /^\*{3,}\s*$/.test(trim)) {
      flushTable(); flushList();
      out.push('<hr>');
      continue;
    }

    // ── Headings ────────────────────────────────────────────────────────────
    const hm = trim.match(/^(#{1,4})\s+(.*)/);
    if (hm) {
      flushTable(); flushList();
      const lvl = hm[1].length;
      const txt = hm[2];
      const id  = txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      out.push(`<h${lvl} id="${id}">${inline(txt)}</h${lvl}>`);
      continue;
    }

    // ── Table ───────────────────────────────────────────────────────────────
    if (trim.startsWith('|') && trim.endsWith('|')) {
      flushList();
      const rawCells = trim.slice(1, -1).split('|').map(c => c.trim());
      const isSep = rawCells.every(c => /^[-:]+$/.test(c));
      if (isSep) continue; // skip separator row

      if (!inTable) {
        // peek ahead: next line should be separator
        out.push('<table><thead><tr>' +
          rawCells.map(c => `<th>${inline(c)}</th>`).join('') +
          '</tr></thead><tbody>');
        inTable = true;
        // skip separator line
        if (i + 1 < lines.length && /^\|[-| :]+\|/.test(lines[i + 1])) i++;
        continue;
      }
      out.push('<tr>' + rawCells.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>');
      continue;
    }

    // ── Bullet list ─────────────────────────────────────────────────────────
    const bm = trim.match(/^[-*]\s+(.*)/);
    if (bm) {
      flushTable();
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(bm[1])}</li>`);
      continue;
    }

    // ── Ordered list ────────────────────────────────────────────────────────
    const om = trim.match(/^\d+\.\s+(.*)/);
    if (om) {
      flushTable();
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(om[1])}</li>`);
      continue;
    }

    // ── Blank line ──────────────────────────────────────────────────────────
    if (!trim) {
      flushTable(); flushList();
      continue;
    }

    // ── Paragraph ───────────────────────────────────────────────────────────
    flushTable(); flushList();
    out.push(`<p>${inline(trim)}</p>`);
  }

  flushTable(); flushList();
  if (inCode) out.push(`<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`);
  return out.join('\n');
}

const body = mdToHtml(md);

// ─── 3. HTML shell ─────────────────────────────────────────────────────────
// Fonts are declared inline as system-stack — no CDN calls needed.
const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

body{
  font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.7;
  color: #111;
  background: #fff;
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 52px 60px;
}

/* ── Cover ─────────────────────────────────────────────────── */
.cover{
  background:#111;color:#fff;
  padding:32px 40px;
  margin:-40px -52px 44px;
  border-bottom:5px solid #d63c1d;
  page-break-after:avoid;
}
.cover-eye{
  font-family: "Courier New", monospace;
  font-size:8.5pt;font-weight:700;
  letter-spacing:.18em;text-transform:uppercase;
  color:#e7ff57;margin-bottom:10px;
}
.cover h1{
  font-size:22pt;font-weight:900;
  line-height:1.1;letter-spacing:-.02em;
  color:#fff;margin-bottom:14px;
}
.cover-meta{
  display:flex;flex-wrap:wrap;gap:18px 32px;
  font-family:"Courier New",monospace;
  font-size:8.5pt;color:rgba(255,255,255,.6);
}
.cover-meta strong{color:#fff}
.verdict{
  display:inline-block;
  background:#16a34a;color:#fff;
  font-family:"Courier New",monospace;
  font-size:9.5pt;font-weight:700;
  padding:5px 14px;margin-top:18px;
  letter-spacing:.04em;
}

/* ── Headings ──────────────────────────────────────────────── */
h1{display:none}
h2{
  font-size:14pt;font-weight:900;
  color:#111;margin:38px 0 10px;
  padding-bottom:5px;
  border-bottom:3px solid #d63c1d;
  page-break-after:avoid;
}
h3{
  font-size:11pt;font-weight:700;
  color:#d63c1d;margin:22px 0 8px;
  page-break-after:avoid;
}
h4{
  font-family:"Courier New",monospace;
  font-size:9pt;font-weight:700;
  text-transform:uppercase;letter-spacing:.06em;
  color:#555;margin:16px 0 6px;
  page-break-after:avoid;
}

/* ── Body text ─────────────────────────────────────────────── */
p{margin-bottom:9px}
strong{font-weight:700}
em{font-style:italic}

code{
  font-family:"Courier New",monospace;
  font-size:8.8pt;
  background:#f0ede6;
  padding:1px 4px;border-radius:3px;
  color:#c0392b;
}
pre{
  background:#111;color:#e7ff57;
  font-family:"Courier New",monospace;
  font-size:8.8pt;
  padding:16px 18px;margin:14px 0;
  border-left:4px solid #d63c1d;
  white-space:pre-wrap;word-break:break-word;
  page-break-inside:avoid;
}
pre code{background:none;color:inherit;padding:0;border-radius:0}

/* ── Lists ─────────────────────────────────────────────────── */
ul{margin:8px 0 10px 0;padding:0;list-style:none}
li{
  padding-left:20px;
  position:relative;
  margin-bottom:4px;
}
li::before{
  content:'→';
  position:absolute;left:0;
  color:#d63c1d;font-weight:700;
}

/* ── Tables ────────────────────────────────────────────────── */
table{
  width:100%;border-collapse:collapse;
  margin:14px 0 18px;font-size:9pt;
  page-break-inside:auto;
}
th{
  background:#111;color:#fff;
  font-family:"Courier New",monospace;
  font-size:7.5pt;font-weight:700;
  letter-spacing:.07em;text-transform:uppercase;
  padding:7px 9px;text-align:left;
  border:1px solid #333;
}
td{
  padding:6px 9px;
  border:1px solid #ccc;
  vertical-align:top;line-height:1.5;
}
tr:nth-child(even) td{background:#f7f4ed}
tr{page-break-inside:avoid}

/* ── Links ─────────────────────────────────────────────────── */
.lnk{color:#d63c1d;font-weight:600;text-decoration:underline;text-decoration-color:rgba(214,60,29,.3)}

/* ── HR ────────────────────────────────────────────────────── */
hr{border:none;border-top:1px solid #ddd;margin:28px 0}

/* ── Footer ────────────────────────────────────────────────── */
.footer{
  font-family:"Courier New",monospace;
  font-size:7.5pt;color:#aaa;
  text-align:center;margin-top:40px;
  border-top:1px solid #eee;padding-top:12px;
}

/* ── Print ─────────────────────────────────────────────────── */
@page{margin:0.4in 0.5in}
@media print{
  body{padding:0;max-width:100%}
  .cover{margin:0 0 32px;padding:28px 36px}
  h2{page-break-before:auto}
  pre,table,li{page-break-inside:avoid}
}
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CareerCase × SIH26044 — PR1 Pre-Implementation Inspection Report</title>
<style>${css}</style>
</head>
<body>

<div class="cover">
  <p class="cover-eye">CareerCase × SIH26044 &nbsp;|&nbsp; PR1 Pre-Implementation Inspection Report</p>
  <h1>Opportunity Authoring &amp; Recruiter Applicant Workspace</h1>
  <div class="cover-meta">
    <span><strong>Owner:</strong> Harsh</span>
    <span><strong>Branch:</strong> feature/harsh/opportunity-authoring-recruiter-pr1</span>
    <span><strong>Base:</strong> integration/sih26044-product-v0.2</span>
    <span><strong>Generated:</strong> 2026-08-29</span>
    <span><strong>Status:</strong> Inspection only — zero files modified</span>
  </div>
  <div class="verdict">✅ SAFE TO START WITHIN CURRENT CONTRACTS</div>
</div>

${body}

<div class="footer">
  CareerCase × SIH26044 &nbsp;·&nbsp; PR1 Inspection Report &nbsp;·&nbsp; 2026-08-29 &nbsp;·&nbsp; Inspection only — no files modified
</div>

</body>
</html>`;

writeFileSync(HTML_OUT, html, 'utf8');
console.log(`✅  HTML written → ${HTML_OUT}`);

// ─── 4. Convert HTML → PDF via Edge headless ───────────────────────────────
const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

function findBrowser(): string | null {
  for (const p of [...edgePaths, ...chromePaths]) {
    try {
      execSync(`if exist "${p}" echo found`, { shell: 'cmd.exe', stdio: 'pipe' });
      const result = execSync(`if exist "${p}" echo found`, { shell: 'cmd.exe', encoding: 'utf8' });
      if (result.includes('found')) return p;
    } catch { /* skip */ }
  }
  return null;
}

const browser = findBrowser();
if (!browser) {
  console.warn('⚠️  Edge/Chrome not found. Open the HTML file in a browser and use Ctrl+P → Save as PDF.');
  console.log(`   HTML: ${HTML_OUT}`);
  process.exit(0);
}

try {
  execSync(
    `"${browser}" --headless=new --disable-gpu --no-sandbox ` +
    `--print-to-pdf="${PDF_OUT}" ` +
    `--print-to-pdf-no-header ` +
    `--no-pdf-header-footer ` +
    `"${HTML_OUT}"`,
    { timeout: 30000, stdio: 'pipe' },
  );
  const { statSync } = await import('node:fs');
  const sz = Math.round(statSync(PDF_OUT).size / 1024);
  console.log(`✅  PDF written  → ${PDF_OUT}  (${sz} KB)`);
} catch (err) {
  console.error('Edge/Chrome headless failed:', (err as Error).message);
  console.log('Falling back: open the HTML in a browser and use Ctrl+P → Save as PDF.');
  console.log(`   HTML: ${HTML_OUT}`);
}
