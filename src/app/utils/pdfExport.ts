import jsPDF from 'jspdf';
import type { JobData } from '../data/jobs';
import type { WorkLifeBalance, LearnMoreResources } from '../services/ai';

// ─── Design tokens ─────────────────────────────────────────────
const T = {
  black:     [0,   0,   0]   as [number, number, number],
  ink:       [25,  25,  25]  as [number, number, number],
  darkGray:  [55,  55,  55]  as [number, number, number],
  midGray:   [100, 100, 100] as [number, number, number],
  lightGray: [170, 170, 170] as [number, number, number],
  whisper:   [210, 210, 210] as [number, number, number],
  fillLight: [245, 244, 242] as [number, number, number],
  fillMid:   [236, 234, 230] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  green:     [40,  120, 70]  as [number, number, number],
  red:       [180, 50,  50]  as [number, number, number],
};

// ─── Shared helpers ────────────────────────────────────────────

function masthead(doc: jsPDF, label: string, margin: number, pageWidth: number, y: number): number {
  const cw = pageWidth - margin * 2;
  doc.setFillColor(...T.black);
  doc.rect(margin, y, cw, 2, 'F');
  y += 3;
  doc.setDrawColor(...T.lightGray);
  doc.setLineWidth(0.35);
  doc.line(margin, y, margin + cw, y);
  y += 1.5;
  doc.setDrawColor(...T.whisper);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + cw, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...T.lightGray);
  doc.text(
    `${label}  ·  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}`,
    margin, y
  );
  y += 8;
  return y;
}

function sectionHeader(doc: jsPDF, title: string, margin: number, pageWidth: number, y: number): number {
  const cw = pageWidth - margin * 2;
  const h = 7.5;
  doc.setFillColor(...T.black);
  doc.rect(margin, y, cw, h, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...T.white);
  doc.text(title.toUpperCase(), margin + 3, y + 5.2);
  return y + h + 6;
}

function subLabel(doc: jsPDF, title: string, margin: number, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...T.midGray);
  doc.text(title.toUpperCase(), margin, y);
  y += 2;
  doc.setDrawColor(...T.whisper);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + 30, y);
  y += 5;
  return y;
}

function bodyText(
  doc: jsPDF, text: string, margin: number, pageWidth: number, y: number,
  checkPage: (n: number) => void, lineH = 5.6, maxWidth?: number
): number {
  const cw = maxWidth ?? (pageWidth - margin * 2);
  const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\n\n/g, '\n').trim();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.darkGray);
  const lines = doc.splitTextToSize(clean, cw);
  checkPage(lines.length * lineH + 6);
  doc.text(lines, margin, y);
  return y + lines.length * lineH + 7;
}

function pullQuote(
  doc: jsPDF, text: string, label: string, margin: number, pageWidth: number, y: number,
  checkPage: (n: number) => void
): number {
  const cw = pageWidth - margin * 2;
  const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').trim();
  const lines = doc.splitTextToSize(`"${clean}"`, cw - 10);
  const boxH = lines.length * 6 + 14;
  checkPage(boxH + 8);
  doc.setFillColor(...T.fillLight);
  doc.rect(margin, y, cw, boxH, 'F');
  doc.setFillColor(...T.black);
  doc.rect(margin, y, 3, boxH, 'F');
  if (label) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...T.midGray);
    doc.text(label.toUpperCase(), margin + 8, y + 5.5);
  }
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(...T.darkGray);
  doc.text(lines, margin + 8, y + (label ? 11 : 7));
  return y + boxH + 7;
}

function statsBox(
  doc: jsPDF, stats: Array<{ val: string; label: string }>, margin: number, pageWidth: number, y: number
): number {
  const cw = pageWidth - margin * 2;
  const boxH = 28;
  doc.setFillColor(...T.fillMid);
  doc.rect(margin, y, cw, boxH, 'F');
  doc.setDrawColor(...T.black);
  doc.setLineWidth(0.35);
  doc.rect(margin, y, cw, boxH, 'S');
  const colW = cw / stats.length;
  stats.forEach(({ val, label }, i) => {
    const cx = margin + colW * i + colW / 2;
    if (i > 0) {
      doc.setDrawColor(...T.whisper);
      doc.setLineWidth(0.2);
      doc.line(margin + colW * i, y + 4, margin + colW * i, y + boxH - 4);
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...T.black);
    doc.text(val, cx, y + 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...T.midGray);
    doc.text(label.toUpperCase(), cx, y + 22.5, { align: 'center' });
  });
  return y + boxH + 10;
}

function skillBadges(
  doc: jsPDF, skills: string[], margin: number, pageWidth: number, y: number,
  checkPage: (n: number) => void
): number {
  const cw = pageWidth - margin;
  let cx = margin;
  const badgeH = 6.5;
  const padX = 4;

  skills.forEach(skill => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const tw = doc.getTextWidth(skill) + padX * 2;
    if (cx + tw > cw) {
      cx = margin;
      y += badgeH + 3;
      checkPage(badgeH + 6);
    }
    doc.setFillColor(...T.fillMid);
    doc.rect(cx, y - badgeH + 1.5, tw, badgeH, 'F');
    doc.setDrawColor(...T.lightGray);
    doc.setLineWidth(0.2);
    doc.rect(cx, y - badgeH + 1.5, tw, badgeH, 'S');
    doc.setTextColor(...T.darkGray);
    doc.text(skill, cx + padX, y);
    cx += tw + 3;
  });
  return y + badgeH + 5;
}

function addFooters(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number, title = 'Career Simulation') {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...T.lightGray);
    doc.setLineWidth(0.35);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...T.lightGray);
    doc.text('careersim.app', margin, pageHeight - 9);
    doc.text(title, pageWidth / 2, pageHeight - 9, { align: 'center' });
    doc.text(`${i} / ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }
}

// ─── Dossier PDF ───────────────────────────────────────────────

export function downloadDossierPDF(job: {
  title: string;
  category: string;
  avgSalary: string;
  fullDescription: string;
  skills: string[];
  education: string[];
  workEnvironment: string;
  careerPath: string;
  funFact: string;
  weekOverview: string;
  quarterOverview: string;
  yearOverview: string;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 22;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin - 18) { doc.addPage(); y = margin; }
  };

  y = masthead(doc, 'CAREER SIMULATION  ·  FULL DOSSIER', margin, pageWidth, y);

  doc.setFont('times', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...T.black);
  const titleLines = doc.splitTextToSize(job.title, contentWidth);
  checkPage(titleLines.length * 13 + 6);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 13 + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...T.midGray);
  doc.text(job.category, margin, y);
  y += 8;

  y = statsBox(doc, [
    { val: job.avgSalary, label: 'Average Salary' },
    { val: String(job.skills.length), label: 'Core Skills' },
    { val: String(job.education.length), label: 'Qualifications' },
  ], margin, pageWidth, y);

  checkPage(22);
  y = sectionHeader(doc, 'About the Role', margin, pageWidth, y);
  y = bodyText(doc, job.fullDescription, margin, pageWidth, y, checkPage);

  checkPage(22);
  y = sectionHeader(doc, 'Required Skills', margin, pageWidth, y);
  y = skillBadges(doc, job.skills, margin, pageWidth, y, checkPage);
  y += 6;

  checkPage(22);
  y = sectionHeader(doc, 'Education & Qualifications', margin, pageWidth, y);
  job.education.forEach((edu, i) => {
    checkPage(8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...T.darkGray);
    const el = doc.splitTextToSize(`${i + 1}.  ${edu}`, contentWidth - 4);
    doc.text(el, margin + 2, y);
    y += el.length * 5.6 + 2.5;
  });
  y += 5;

  checkPage(22);
  y = sectionHeader(doc, 'Work Environment', margin, pageWidth, y);
  y = bodyText(doc, job.workEnvironment, margin, pageWidth, y, checkPage);

  checkPage(22);
  y = sectionHeader(doc, 'Career Progression', margin, pageWidth, y);
  y = bodyText(doc, job.careerPath, margin, pageWidth, y, checkPage);

  checkPage(22);
  y = sectionHeader(doc, 'Did You Know?', margin, pageWidth, y);
  y = pullQuote(doc, job.funFact, 'Fun Fact', margin, pageWidth, y, checkPage);

  checkPage(22);
  y = sectionHeader(doc, 'Life in the Role — A Week', margin, pageWidth, y);
  y = bodyText(doc, job.weekOverview, margin, pageWidth, y, checkPage);

  checkPage(22);
  y = sectionHeader(doc, 'Life in the Role — A Quarter', margin, pageWidth, y);
  y = bodyText(doc, job.quarterOverview, margin, pageWidth, y, checkPage);

  checkPage(22);
  y = sectionHeader(doc, 'Life in the Role — A Year', margin, pageWidth, y);
  y = bodyText(doc, job.yearOverview, margin, pageWidth, y, checkPage);

  addFooters(doc, pageWidth, pageHeight, margin, `${job.title} — Full Dossier`);
  doc.save(`${job.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-dossier.pdf`);
}

// ─── Assessment PDF ────────────────────────────────────────────

export function downloadAssessmentPDF(params: {
  jobTitle: string;
  totalScenarios: number;
  correctCount: number;
  aiSummary: string;
  scenarios: Array<{ time: string; title: string; wasCorrect: boolean }>;
}) {
  const { jobTitle, totalScenarios, correctCount, aiSummary, scenarios } = params;
  const differentCount = totalScenarios - correctCount;
  const alignmentPercent = totalScenarios > 0 ? Math.round((correctCount / totalScenarios) * 100) : 0;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 22;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const lineH = 5.5;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin - 18) { doc.addPage(); y = margin; }
  };

  y = masthead(doc, 'CAREER SIMULATION  ·  ASSESSMENT REPORT', margin, pageWidth, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...T.midGray);
  doc.text('A Day in the Life of', margin, y);
  y += 8;

  doc.setFont('times', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(...T.black);
  const titleLines = doc.splitTextToSize(jobTitle, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 12 + 6;

  y = statsBox(doc, [
    { val: String(totalScenarios), label: 'Scenarios' },
    { val: String(correctCount), label: 'Professional' },
    { val: String(differentCount), label: 'Different' },
    { val: `${alignmentPercent}%`, label: 'Alignment' },
  ], margin, pageWidth, y);

  checkPage(22);
  y = subLabel(doc, 'Overall Alignment', margin, y);
  const barW = contentWidth;
  const barH = 9;
  doc.setFillColor(...T.whisper);
  doc.rect(margin, y, barW, barH, 'F');
  const fillColor: [number, number, number] = alignmentPercent >= 60 ? T.green : alignmentPercent >= 35 ? T.ink : T.red;
  doc.setFillColor(...fillColor);
  doc.rect(margin, y, barW * (alignmentPercent / 100), barH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  if (alignmentPercent > 12) {
    doc.text(`${alignmentPercent}%`, margin + 4, y + 6.2);
  }
  y += barH + 12;

  if (aiSummary) {
    checkPage(22);
    y = sectionHeader(doc, 'AI Assessment', margin, pageWidth, y);
    y = bodyText(doc, aiSummary, margin, pageWidth, y, checkPage);
  }

  checkPage(22);
  y = sectionHeader(doc, 'Your Day Timeline', margin, pageWidth, y);

  const tlX = margin + 18;

  scenarios.forEach((s, idx) => {
    checkPage(lineH + 5);
    const cy = y - 1.5;

    if (idx > 0) {
      doc.setDrawColor(...T.whisper);
      doc.setLineWidth(0.5);
      doc.line(tlX, cy - lineH - 3, tlX, cy);
    }

    if (s.wasCorrect) {
      doc.setFillColor(...T.black);
      doc.circle(tlX, cy, 2.2, 'F');
    } else {
      doc.setFillColor(...T.white);
      doc.setDrawColor(...T.lightGray);
      doc.setLineWidth(0.5);
      doc.circle(tlX, cy, 2.2, 'FD');
    }

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...T.midGray);
    doc.text(s.time, margin, y);

    doc.setFont('helvetica', s.wasCorrect ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...(s.wasCorrect ? T.ink : T.lightGray));
    const stl = doc.splitTextToSize(s.title, contentWidth - 26);
    doc.text(stl, tlX + 6, y);
    y += stl.length * lineH + 3;
  });

  y += 6;

  checkPage(18);
  const insight = `This simulation reflects your instincts as a ${jobTitle}. Professional choices indicate strong alignment; different choices show where your perspective diverges from the norm.`;
  y = pullQuote(doc, insight, 'Insight', margin, pageWidth, y, checkPage);

  addFooters(doc, pageWidth, pageHeight, margin, `${jobTitle} — Assessment`);
  doc.save(`${jobTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-assessment.pdf`);
}

// ─── Interview Prep PDF ────────────────────────────────────────

export function downloadInterviewPDF(params: {
  jobTitle: string;
  questions: Array<{
    question: string;
    category: string;
    approach: string;
    keyPoints: string[];
  }>;
  preparedCount: number;
}) {
  const { jobTitle, questions, preparedCount } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 22;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const lineH = 5.5;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin - 18) { doc.addPage(); y = margin; }
  };

  y = masthead(doc, 'CAREER SIMULATION  ·  INTERVIEW PREP', margin, pageWidth, y);

  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...T.black);
  const titleLines = doc.splitTextToSize(`Interview Prep: ${jobTitle}`, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 11 + 4;

  const categories = [...new Set(questions.map(q => q.category))];
  y = statsBox(doc, [
    { val: String(questions.length), label: 'Questions' },
    { val: String(preparedCount), label: 'Prepared' },
    { val: String(questions.length - preparedCount), label: 'To Review' },
    { val: String(categories.length), label: 'Categories' },
  ], margin, pageWidth, y);

  checkPage(18);
  y = subLabel(doc, 'Question Categories', margin, y);
  y = skillBadges(doc, categories, margin, pageWidth, y, checkPage);
  y += 8;

  questions.forEach((q, i) => {
    checkPage(45);

    doc.setFillColor(...T.fillMid);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...T.midGray);
    doc.text(`Q${String(i + 1).padStart(2, '0')}`, margin + 3, y + 6);
    doc.setTextColor(...T.darkGray);
    doc.text(q.category.toUpperCase(), margin + 14, y + 6);
    y += 9 + 5;

    doc.setFont('times', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...T.ink);
    const qLines = doc.splitTextToSize(q.question, contentWidth);
    checkPage(qLines.length * 6.5 + 8);
    doc.text(qLines, margin, y);
    y += qLines.length * 6.5 + 7;

    y = subLabel(doc, 'Suggested Approach', margin, y);
    y = bodyText(doc, q.approach, margin, pageWidth, y, checkPage);

    y = subLabel(doc, 'Key Points', margin, y);
    q.keyPoints.forEach(pt => {
      checkPage(lineH + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...T.darkGray);
      const ptl = doc.splitTextToSize(`·  ${pt}`, contentWidth - 5);
      doc.text(ptl, margin + 3, y);
      y += ptl.length * lineH + 1.5;
    });

    y += 8;
    if (i < questions.length - 1) {
      checkPage(4);
      doc.setDrawColor(...T.whisper);
      doc.setLineWidth(0.25);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;
    }
  });

  addFooters(doc, pageWidth, pageHeight, margin, `${jobTitle} — Interview Prep`);
  doc.save(`${jobTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-interview-prep.pdf`);
}

// ─── Comparison PDF ────────────────────────────────────────────

export function downloadComparisonPDF(
  jobA: JobData,
  jobB: JobData,
  extras: {
    wlbA?: WorkLifeBalance | null;
    wlbB?: WorkLifeBalance | null;
    learnMoreA?: LearnMoreResources | null;
    learnMoreB?: LearnMoreResources | null;
  } = {}
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const cw = pageWidth - margin * 2;
  const colW = (cw - 16) / 2;
  const colAX = margin;
  const colBX = margin + colW + 16;
  let y = margin;
  const lineH = 5.2;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin - 18) { doc.addPage(); y = margin; }
  };

  y = masthead(doc, 'CAREER SIMULATION  ·  CAREER COMPARISON', margin, pageWidth, y);

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...T.black);
  const aTitles = doc.splitTextToSize(jobA.title, colW);
  const bTitles = doc.splitTextToSize(jobB.title, colW);
  const titlesH = Math.max(aTitles.length, bTitles.length) * 9;
  checkPage(titlesH + 20);
  doc.text(aTitles, colAX, y);
  doc.text(bTitles, colBX, y);

  const vsX = margin + colW + 8;
  const vsY = y + titlesH / 2 - 3;
  doc.setFillColor(...T.black);
  doc.circle(vsX, vsY, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...T.white);
  doc.text('VS', vsX, vsY + 1.5, { align: 'center' });
  y += titlesH + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...T.midGray);
  doc.text(`${jobA.category}  ·  ${jobA.avgSalary}`, colAX, y);
  doc.text(`${jobB.category}  ·  ${jobB.avgSalary}`, colBX, y);
  y += 10;

  if (extras.wlbA || extras.wlbB) {
    checkPage(32);
    y = statsBox(doc, [
      { val: extras.wlbA ? `${extras.wlbA.overallScore}/100` : '—', label: `${jobA.title} WLB` },
      { val: extras.wlbB ? `${extras.wlbB.overallScore}/100` : '—', label: `${jobB.title} WLB` },
    ], margin, pageWidth, y);
  }

  const rows: Array<{ label: string; a: string; b: string }> = [
    { label: 'Overview', a: jobA.shortDescription, b: jobB.shortDescription },
    { label: 'Environment', a: jobA.workEnvironment, b: jobB.workEnvironment },
    { label: 'Daily Life', a: jobA.dailyRoutine, b: jobB.dailyRoutine },
    { label: 'Career Path', a: jobA.careerPath, b: jobB.careerPath },
    { label: 'Education', a: jobA.education.join(', '), b: jobB.education.join(', ') },
    { label: 'Core Skills', a: jobA.skills.join(', '), b: jobB.skills.join(', ') },
    {
      label: 'Work-Life Balance',
      a: extras.wlbA ? `${extras.wlbA.overallScore}/100  —  ${extras.wlbA.summary}` : '—',
      b: extras.wlbB ? `${extras.wlbB.overallScore}/100  —  ${extras.wlbB.summary}` : '—',
    },
    {
      label: 'Certifications',
      a: extras.learnMoreA ? extras.learnMoreA.certifications.slice(0, 3).join(' / ') : '—',
      b: extras.learnMoreB ? extras.learnMoreB.certifications.slice(0, 3).join(' / ') : '—',
    },
    { label: 'Fun Fact', a: jobA.funFact, b: jobB.funFact },
  ];

  rows.forEach(({ label, a, b }, idx) => {
    const aLines = doc.splitTextToSize(a || '—', colW);
    const bLines = doc.splitTextToSize(b || '—', colW);
    const cellH = Math.max(aLines.length, bLines.length) * lineH + 12;
    checkPage(cellH + 4);

    if (idx % 2 === 0) {
      doc.setFillColor(...T.fillLight);
      doc.rect(margin, y - 1, cw, cellH, 'F');
    }

    doc.setFillColor(...T.black);
    doc.rect(margin, y - 1, cw, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...T.white);
    doc.text(label.toUpperCase(), margin + 3, y + 4.2);
    y += 9;

    doc.setDrawColor(...T.whisper);
    doc.setLineWidth(0.3);
    doc.line(margin + colW + 8, y - 2, margin + colW + 8, y + cellH - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...T.darkGray);
    doc.text(aLines, colAX, y);
    doc.text(bLines, colBX, y);
    y += Math.max(aLines.length, bLines.length) * lineH + 6;
  });

  addFooters(doc, pageWidth, pageHeight, margin, `${jobA.title} vs ${jobB.title}`);
  const safe = (s: string) => s.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`compare-${safe(jobA.title)}-vs-${safe(jobB.title)}.pdf`);
}

// ─── Roadmap PDF ───────────────────────────────────────────────

export function downloadRoadmapPDF(roadmap: {
  title: string;
  totalYears: string;
  stages: Array<{ stage: string; yearsRange: string; role: string; salary: string; milestones: string[]; skills: string[] }>;
  keyDecisions: Array<{ decision: string; timing: string; impact: string }>;
  industryOutlook: string;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 22;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const lineH = 5.5;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin - 18) { doc.addPage(); y = margin; }
  };

  y = masthead(doc, 'CAREER SIMULATION  ·  CAREER ROADMAP', margin, pageWidth, y);

  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...T.black);
  const titleLines = doc.splitTextToSize(`${roadmap.title} Career Roadmap`, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 11 + 3;

  y = statsBox(doc, [
    { val: roadmap.totalYears, label: 'Total Duration' },
    { val: String(roadmap.stages.length), label: 'Stages' },
    { val: String(roadmap.keyDecisions?.length ?? 0), label: 'Key Decisions' },
  ], margin, pageWidth, y);

  checkPage(22);
  y = sectionHeader(doc, 'Career Stages', margin, pageWidth, y);

  const tlX = margin + 8;
  roadmap.stages.forEach((stage, i) => {
    checkPage(48);

    const stageStartY = y;

    doc.setFillColor(...T.black);
    doc.circle(tlX, y + 1, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...T.white);
    doc.text(String(i + 1), tlX, y + 2.2, { align: 'center' });

    const textX = tlX + 10;
    const textW = contentWidth - 18;

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...T.ink);
    doc.text(stage.stage, textX, y + 2);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...T.midGray);
    doc.text(`${stage.yearsRange}  ·  ${stage.role}  ·  ${stage.salary}`, textX, y);
    y += 7;

    stage.milestones.forEach(m => {
      checkPage(lineH + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...T.darkGray);
      const ml = doc.splitTextToSize(`·  ${m}`, textW - 2);
      doc.text(ml, textX + 2, y);
      y += ml.length * lineH + 1.5;
    });

    if (stage.skills.length > 0) {
      y += 3;
      y = skillBadges(doc, stage.skills, textX, pageWidth - (textX - margin + margin), y, checkPage);
    }

    if (i < roadmap.stages.length - 1) {
      checkPage(8);
      doc.setDrawColor(...T.lightGray);
      doc.setLineWidth(0.5);
      doc.line(tlX, stageStartY + 6, tlX, y + 4);
    }

    y += 8;
  });

  if (roadmap.keyDecisions?.length) {
    checkPage(22);
    y = sectionHeader(doc, 'Key Career Decisions', margin, pageWidth, y);
    roadmap.keyDecisions.forEach((kd, i) => {
      checkPage(20);
      doc.setFillColor(...T.fillMid);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...T.ink);
      const dl = doc.splitTextToSize(`${i + 1}.  ${kd.decision}`, contentWidth - 6);
      doc.text(dl, margin + 3, y + 5);
      y += 7 + 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...T.darkGray);
      const il = doc.splitTextToSize(`${kd.timing}  —  ${kd.impact}`, contentWidth - 4);
      doc.text(il, margin + 2, y);
      y += il.length * lineH + 6;
    });
  }

  if (roadmap.industryOutlook) {
    checkPage(22);
    y = sectionHeader(doc, 'Industry Outlook', margin, pageWidth, y);
    y = pullQuote(doc, roadmap.industryOutlook, 'Outlook', margin, pageWidth, y, checkPage);
  }

  addFooters(doc, pageWidth, pageHeight, margin, `${roadmap.title} — Career Roadmap`);
  doc.save(`${roadmap.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-roadmap.pdf`);
}

// ─── Transition PDF ────────────────────────────────────────────

export function downloadTransitionPDF(plan: {
  fromTitle: string;
  toTitle: string;
  difficulty: string;
  timeframe: string;
  overview: string;
  transferableSkills: string[];
  skillGaps: string[];
  steps: Array<{ phase: string; duration: string; actions: string[] }>;
  salaryImpact: string;
  successStory: string;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 22;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const lineH = 5.5;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin - 18) { doc.addPage(); y = margin; }
  };

  y = masthead(doc, 'CAREER SIMULATION  ·  TRANSITION PLAN', margin, pageWidth, y);

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...T.black);
  const titleText = `${plan.fromTitle}  to  ${plan.toTitle}`;
  const ttl = doc.splitTextToSize(titleText, contentWidth);
  doc.text(ttl, margin, y);
  y += ttl.length * 10 + 3;

  y = statsBox(doc, [
    { val: plan.difficulty, label: 'Difficulty' },
    { val: plan.timeframe, label: 'Timeframe' },
    { val: plan.salaryImpact, label: 'Salary Impact' },
    { val: String(plan.steps.length), label: 'Phases' },
  ], margin, pageWidth, y);

  checkPage(22);
  y = sectionHeader(doc, 'Overview', margin, pageWidth, y);
  y = bodyText(doc, plan.overview, margin, pageWidth, y, checkPage);

  checkPage(22);
  y = sectionHeader(doc, 'Skills Analysis', margin, pageWidth, y);
  const halfW = (contentWidth - 10) / 2;
  const colBX2 = margin + halfW + 10;
  const skillsStartY = y;

  y = subLabel(doc, 'Transferable Skills', margin, y);
  const tsStartY = y;
  plan.transferableSkills.forEach(s => {
    checkPage(lineH + 1);
    doc.setFillColor(...T.green);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...T.green);
    doc.text('✓', margin, y);
    doc.setTextColor(...T.darkGray);
    const sl = doc.splitTextToSize(s, halfW - 8);
    doc.text(sl, margin + 5, y);
    y += sl.length * lineH + 1.5;
  });
  const tsEndY = y;

  let gy = skillsStartY;
  gy = subLabel(doc, 'Skill Gaps to Fill', colBX2, gy);
  plan.skillGaps.forEach(s => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...T.red);
    doc.text('✗', colBX2, gy);
    doc.setTextColor(...T.darkGray);
    const gl = doc.splitTextToSize(s, halfW - 8);
    doc.text(gl, colBX2 + 5, gy);
    gy += gl.length * lineH + 1.5;
  });

  const divX = margin + halfW + 5;
  doc.setDrawColor(...T.whisper);
  doc.setLineWidth(0.3);
  doc.line(divX, skillsStartY - 2, divX, Math.max(tsEndY, gy) + 2);

  y = Math.max(tsEndY, gy) + 8;

  checkPage(22);
  y = sectionHeader(doc, 'Transition Phases', margin, pageWidth, y);

  plan.steps.forEach((step, i) => {
    checkPage(30);
    const phStartY = y;

    doc.setFillColor(...T.black);
    doc.rect(margin, y - 2, 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...T.white);
    doc.text(String(i + 1), margin + 5, y + 5.5, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...T.ink);
    doc.text(`Phase ${i + 1}: ${step.phase}`, margin + 14, y + 3);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...T.midGray);
    doc.text(step.duration, margin + 14, y);
    y += 7;

    step.actions.forEach(a => {
      checkPage(lineH + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...T.darkGray);
      const al = doc.splitTextToSize(`·  ${a}`, contentWidth - 14);
      doc.text(al, margin + 16, y);
      y += al.length * lineH + 1.5;
    });

    if (i < plan.steps.length - 1) {
      checkPage(6);
      doc.setDrawColor(...T.lightGray);
      doc.setLineWidth(0.5);
      doc.line(margin + 5, phStartY + 8, margin + 5, y + 4);
    }
    y += 8;
  });

  if (plan.successStory) {
    checkPage(22);
    y = sectionHeader(doc, 'Success Story', margin, pageWidth, y);
    y = pullQuote(doc, plan.successStory, 'Real-World Example', margin, pageWidth, y, checkPage);
  }

  addFooters(doc, pageWidth, pageHeight, margin, `${plan.fromTitle} to ${plan.toTitle}`);
  const safe = (s: string) => s.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`transition-${safe(plan.fromTitle)}-to-${safe(plan.toTitle)}.pdf`);
}

// ─── Share Card (Canvas PNG) ───────────────────────────────────

export async function generateShareCard(job: {
  title: string;
  category: string;
  avgSalary: string;
  skills: string[];
}): Promise<Blob> {
  const W = 600, H = 315;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f2ece0';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#000';
  ctx.fillRect(24, 20, W - 48, 2.5);
  ctx.fillStyle = '#bbb';
  ctx.fillRect(24, 25, W - 48, 0.5);
  ctx.fillStyle = '#ddd';
  ctx.fillRect(24, 27.5, W - 48, 0.5);

  ctx.font = '10px Inter, Helvetica, sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText('CAREER SIMULATION  ·  CAREER DOSSIER', 24, 46);

  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillStyle = '#111';
  const titleText = job.title.length > 26 ? job.title.slice(0, 26) + '\u2026' : job.title;
  ctx.fillText(titleText, 24, 96);

  ctx.font = '13px Inter, Helvetica, sans-serif';
  ctx.fillStyle = '#777';
  ctx.fillText(`${job.category}  ·  ${job.avgSalary}`, 24, 122);

  let bx = 24;
  const by = 155;
  ctx.font = '11px Inter, Helvetica, sans-serif';
  for (const skill of job.skills.slice(0, 6)) {
    const tw = ctx.measureText(skill).width + 16;
    if (bx + tw > W - 24) break;
    ctx.fillStyle = '#e8e3d8';
    ctx.fillRect(bx, by - 14, tw, 20);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by - 14, tw, 20);
    ctx.fillStyle = '#444';
    ctx.fillText(skill, bx + 8, by);
    bx += tw + 6;
  }

  ctx.fillStyle = '#111';
  ctx.fillRect(0, H - 44, W, 44);
  ctx.font = '11px Inter, Helvetica, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('careersim.app', 24, H - 17);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate share card'));
    }, 'image/png');
  });
}
