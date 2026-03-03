import jsPDF from 'jspdf';
import type { JobData } from '../data/jobs';
import type { WorkLifeBalance, LearnMoreResources } from '../services/ai';

// ─── Shared helpers ────────────────────────────────────────────

function addFooters(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 160);
    doc.text('Career Simulation  ·  careersim.app', margin, pageHeight - 10);
    doc.text(`${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
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
  const lineH = 5.5;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin - 16) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Top rule
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, contentWidth, 1.2, 'F');
  y += 5;

  // ── Eyebrow
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `CAREER SIMULATION  ·  FULL DOSSIER  ·  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}`,
    margin,
    y
  );
  y += 9;

  // ── Job title (big serif)
  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(job.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 11 + 2;

  // ── Meta row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`${job.category}   ·   ${job.avgSalary}`, margin, y);
  y += 10;

  // ── Thick rule
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Section helper
  const section = (title: string) => {
    checkPage(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(title.toUpperCase(), margin, y);
    y += 1.5;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // Body text helper
  const body = (text: string) => {
    const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\n\n/g, '\n');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(45, 45, 45);
    const lines = doc.splitTextToSize(clean, contentWidth);
    checkPage(lines.length * lineH + 4);
    doc.text(lines, margin, y);
    y += lines.length * lineH + 7;
  };

  // ── Sections
  section('About the Role');
  body(job.fullDescription);

  section('Required Skills');
  // Render skills as a grid-like bullet list
  const skillCols = 2;
  const colW = contentWidth / skillCols;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(45, 45, 45);
  const skillRows = Math.ceil(job.skills.length / skillCols);
  for (let r = 0; r < skillRows; r++) {
    checkPage(lineH + 2);
    for (let c = 0; c < skillCols; c++) {
      const idx = r * skillCols + c;
      if (idx < job.skills.length) {
        doc.text(`· ${job.skills[idx]}`, margin + c * colW, y);
      }
    }
    y += lineH;
  }
  y += 5;

  section('Education & Qualifications');
  job.education.forEach((edu, i) => {
    checkPage(lineH + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(45, 45, 45);
    const eduLines = doc.splitTextToSize(`${i + 1}.  ${edu}`, contentWidth - 6);
    doc.text(eduLines, margin + 4, y);
    y += eduLines.length * lineH + 2;
  });
  y += 4;

  section('Work Environment');
  body(job.workEnvironment);

  section('Career Progression');
  body(job.careerPath);

  section('Did You Know?');
  // Italic style for fun fact
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  const factLines = doc.splitTextToSize(job.funFact, contentWidth);
  checkPage(factLines.length * lineH + 8);
  doc.text(factLines, margin, y);
  y += factLines.length * lineH + 10;

  section('Life in the Role - A Week');
  body(job.weekOverview);

  section('Life in the Role - A Quarter');
  body(job.quarterOverview);

  section('Life in the Role - A Year');
  body(job.yearOverview);

  addFooters(doc, pageWidth, pageHeight, margin);
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
  const alignmentPercent = totalScenarios > 0 ? Math.round((correctCount / totalScenarios) * 100) : 0;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 22;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const lineH = 5.5;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin - 16) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Top rule
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, contentWidth, 1.2, 'F');
  y += 5;

  // ── Eyebrow
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `CAREER SIMULATION  ·  ASSESSMENT REPORT  ·  ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}`,
    margin,
    y
  );
  y += 10;

  // ── Title block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('A Day in the Life of', margin, y);
  y += 8;

  doc.setFont('times', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(jobTitle, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 12 + 6;

  // ── Rule
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // ── Stats box
  const boxH = 30;
  doc.setFillColor(247, 247, 247);
  doc.rect(margin, y, contentWidth, boxH, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(margin, y, contentWidth, boxH, 'S');

  // Vertical dividers
  doc.setLineWidth(0.2);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin + contentWidth / 3, y + 4, margin + contentWidth / 3, y + boxH - 4);
  doc.line(margin + (2 * contentWidth) / 3, y + 4, margin + (2 * contentWidth) / 3, y + boxH - 4);

  const cols = [
    { val: String(totalScenarios), label: 'SCENARIOS', x: margin + contentWidth / 6 },
    { val: String(correctCount), label: 'PROFESSIONAL', x: margin + contentWidth / 2 },
    { val: `${alignmentPercent}%`, label: 'ALIGNMENT', x: margin + (5 * contentWidth) / 6 },
  ];

  cols.forEach(({ val, label, x }) => {
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text(val, x, y + 16, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    doc.text(label, x, y + 24, { align: 'center' });
  });

  y += boxH + 14;

  // ── AI Assessment
  if (aiSummary) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('AI ASSESSMENT', margin, y);
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    const summaryLines = doc.splitTextToSize(aiSummary.replace(/\n\n/g, '\n'), contentWidth);
    checkPage(summaryLines.length * lineH + 12);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * lineH + 14;
  }

  // ── Day Timeline
  checkPage(24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('DAY TIMELINE', margin, y);
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.25);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  scenarios.forEach((s) => {
    checkPage(lineH + 3);

    // Time
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(s.time.padEnd(8), margin, y);

    // Circle indicator
    const cx = margin + 22;
    const cy = y - 1.8;
    if (s.wasCorrect) {
      doc.setFillColor(0, 0, 0);
      doc.circle(cx, cy, 1.8, 'F');
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.4);
      doc.circle(cx, cy, 1.8, 'S');
    }

    // Scenario title
    doc.setFont('helvetica', s.wasCorrect ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(s.wasCorrect ? 0 : 130, s.wasCorrect ? 0 : 130, s.wasCorrect ? 0 : 130);
    const stLines = doc.splitTextToSize(s.title, contentWidth - 28);
    doc.text(stLines, margin + 28, y);
    y += stLines.length * (lineH - 0.5) + 3;
  });

  y += 6;

  // ── Performance bar
  checkPage(28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('OVERALL PERFORMANCE', margin, y);
  y += 5;

  // Bar
  const barW = contentWidth;
  const barH = 8;
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y, barW, barH, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, barW * (alignmentPercent / 100), barH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  // White text on filled black bar, dark text on empty gray bar
  doc.setTextColor(alignmentPercent > 15 ? 255 : 0, alignmentPercent > 15 ? 255 : 0, alignmentPercent > 15 ? 255 : 0);
  doc.text(`${alignmentPercent}%`, margin + 4, y + 5.5);
  y += barH + 10;

  // ── Footer note
  doc.setFont('times', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  const footerNote = `This assessment reflects your instincts as a ${jobTitle}. The simulation is powered by AI and designed to give you a realistic feel for the profession.`;
  const fnLines = doc.splitTextToSize(footerNote, contentWidth);
  checkPage(fnLines.length * lineH + 5);
  doc.text(fnLines, margin, y);

  addFooters(doc, pageWidth, pageHeight, margin);
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
    if (y + needed > pageHeight - margin - 16) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Top rule
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, contentWidth, 1.2, 'F');
  y += 5;

  // ── Eyebrow
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `CAREER SIMULATION  ·  INTERVIEW PREP  ·  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}`,
    margin,
    y
  );
  y += 10;

  // ── Title
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(`Interview Preparation: ${jobTitle}`, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 10 + 4;

  // ── Sub
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${questions.length} questions  ·  ${preparedCount} prepared`, margin, y);
  y += 10;

  // ── Rule
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // ── Questions
  questions.forEach((q, i) => {
    checkPage(40);

    // Q number + category
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text(`Q${i + 1}  ·  ${q.category.toUpperCase()}`, margin, y);
    y += 5;

    // Question text
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const qLines = doc.splitTextToSize(q.question, contentWidth);
    checkPage(qLines.length * 6 + 8);
    doc.text(qLines, margin, y);
    y += qLines.length * 6 + 5;

    // Approach label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('SUGGESTED APPROACH', margin, y);
    y += 4;

    // Approach text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    const aLines = doc.splitTextToSize(q.approach, contentWidth);
    checkPage(aLines.length * lineH + 6);
    doc.text(aLines, margin, y);
    y += aLines.length * lineH + 5;

    // Key points
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('KEY POINTS', margin, y);
    y += 4;

    q.keyPoints.forEach((pt) => {
      checkPage(lineH + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      const ptLines = doc.splitTextToSize(`· ${pt}`, contentWidth - 4);
      doc.text(ptLines, margin + 2, y);
      y += ptLines.length * lineH + 1;
    });

    // Divider between questions
    y += 5;
    if (i < questions.length - 1) {
      checkPage(6);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;
    }
  });

  addFooters(doc, pageWidth, pageHeight, margin);
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
  const colW = (pageWidth - margin * 2 - 30) / 2;
  const midX = margin + colW + 5;
  const colBX = midX + 20;
  let y = margin;
  const lineH = 5.2;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin - 16) {
      doc.addPage();
      y = margin;
    }
  };

  const writeCell = (text: string, x: number, maxW: number, fontSize = 9.5, color: [number, number, number] = [60, 60, 60]) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text || '—', maxW);
    doc.text(lines, x, y);
    return lines.length * lineH;
  };

  // Top rule
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, pageWidth - margin * 2, 1, 'F');
  y += 5;

  // Eyebrow
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `CAREER COMPARISON  ·  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}`,
    margin,
    y
  );
  y += 9;

  // Job titles
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  const titlesH = Math.max(
    doc.splitTextToSize(jobA.title, colW).length,
    doc.splitTextToSize(jobB.title, colW).length
  ) * 8;
  doc.text(doc.splitTextToSize(jobA.title, colW), margin, y);
  doc.text(doc.splitTextToSize(jobB.title, colW), colBX, y);
  y += titlesH + 2;

  // VS divider
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(180, 180, 180);
  doc.text('vs', midX, y - titlesH / 2);

  // Meta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`${jobA.category}  ·  ${jobA.avgSalary}`, margin, y);
  doc.text(`${jobB.category}  ·  ${jobB.avgSalary}`, colBX, y);
  y += 10;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  const rows: Array<{ label: string; a: string; b: string }> = [
    { label: 'OVERVIEW', a: jobA.shortDescription, b: jobB.shortDescription },
    { label: 'ENVIRONMENT', a: jobA.workEnvironment, b: jobB.workEnvironment },
    { label: 'DAILY LIFE', a: jobA.dailyRoutine, b: jobB.dailyRoutine },
    { label: 'CAREER PATH', a: jobA.careerPath, b: jobB.careerPath },
    { label: 'EDUCATION', a: jobA.education.join(', '), b: jobB.education.join(', ') },
    { label: 'SKILLS', a: jobA.skills.join(', '), b: jobB.skills.join(', ') },
    {
      label: 'WORK-LIFE BALANCE',
      a: extras.wlbA ? `Score: ${extras.wlbA.overallScore}/100 — ${extras.wlbA.summary}` : '—',
      b: extras.wlbB ? `Score: ${extras.wlbB.overallScore}/100 — ${extras.wlbB.summary}` : '—',
    },
    {
      label: 'CERTIFICATIONS',
      a: extras.learnMoreA ? extras.learnMoreA.certifications.slice(0, 3).join(' / ') : '—',
      b: extras.learnMoreB ? extras.learnMoreB.certifications.slice(0, 3).join(' / ') : '—',
    },
    { label: 'FUN FACT', a: jobA.funFact, b: jobB.funFact },
  ];

  rows.forEach(({ label, a, b }) => {
    const aLines = doc.splitTextToSize(a || '—', colW);
    const bLines = doc.splitTextToSize(b || '—', colW);
    const cellH = Math.max(aLines.length, bLines.length) * lineH + 10;
    checkPage(cellH + 8);

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(label, margin, y);
    y += 4;

    // Values
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    doc.text(aLines, margin, y);
    doc.text(bLines, colBX, y);
    y += Math.max(aLines.length, bLines.length) * lineH + 6;

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  });

  addFooters(doc, pageWidth, pageHeight, margin);
  const safeTitleA = jobA.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const safeTitleB = jobB.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`compare-${safeTitleA}-vs-${safeTitleB}.pdf`);
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
    if (y + needed > pageHeight - margin - 16) { doc.addPage(); y = margin; }
  };

  // Header
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, contentWidth, 1.2, 'F');
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`CAREER ROADMAP  ·  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}`, margin, y);
  y += 9;
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(`${roadmap.title} Roadmap`, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 10 + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(roadmap.totalYears, margin, y);
  y += 10;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Stages
  roadmap.stages.forEach((stage, i) => {
    checkPage(40);
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(`${i + 1}. ${stage.stage}`, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`${stage.yearsRange}  ·  ${stage.role}  ·  ${stage.salary}`, margin, y);
    y += 7;

    stage.milestones.forEach(m => {
      checkPage(lineH + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      const ml = doc.splitTextToSize(`· ${m}`, contentWidth - 6);
      doc.text(ml, margin + 3, y);
      y += ml.length * lineH + 1;
    });

    if (stage.skills.length > 0) {
      checkPage(lineH + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Skills: ${stage.skills.join(', ')}`, margin + 3, y);
      y += lineH + 2;
    }
    y += 4;
  });

  // Key decisions
  if (roadmap.keyDecisions?.length) {
    checkPage(20);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('Key Career Decisions', margin, y);
    y += 8;

    roadmap.keyDecisions.forEach((kd, i) => {
      checkPage(18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);
      const dl = doc.splitTextToSize(`${i + 1}. ${kd.decision}`, contentWidth - 4);
      doc.text(dl, margin, y);
      y += dl.length * lineH + 1;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const il = doc.splitTextToSize(`${kd.timing} — ${kd.impact}`, contentWidth - 4);
      doc.text(il, margin + 2, y);
      y += il.length * lineH + 4;
    });
  }

  // Industry outlook
  if (roadmap.industryOutlook) {
    checkPage(18);
    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(70, 70, 70);
    const ol = doc.splitTextToSize(roadmap.industryOutlook, contentWidth);
    doc.text(ol, margin, y);
    y += ol.length * lineH + 4;
  }

  addFooters(doc, pageWidth, pageHeight, margin);
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
    if (y + needed > pageHeight - margin - 16) { doc.addPage(); y = margin; }
  };

  // Header
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, contentWidth, 1.2, 'F');
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`CAREER TRANSITION PLAN  ·  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}`, margin, y);
  y += 9;

  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  const titleText = `${plan.fromTitle} → ${plan.toTitle}`;
  const ttl = doc.splitTextToSize(titleText, contentWidth);
  doc.text(ttl, margin, y);
  y += ttl.length * 9 + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Difficulty: ${plan.difficulty}  ·  Timeframe: ${plan.timeframe}  ·  Salary Impact: ${plan.salaryImpact}`, margin, y);
  y += 10;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Overview
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  const ovl = doc.splitTextToSize(plan.overview, contentWidth);
  doc.text(ovl, margin, y);
  y += ovl.length * lineH + 6;

  // Transferable skills
  checkPage(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('TRANSFERABLE SKILLS', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  plan.transferableSkills.forEach(s => {
    checkPage(lineH + 1);
    doc.text(`✓ ${s}`, margin + 2, y);
    y += lineH + 1;
  });
  y += 4;

  // Skill gaps
  checkPage(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('SKILL GAPS', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  plan.skillGaps.forEach(s => {
    checkPage(lineH + 1);
    doc.text(`✗ ${s}`, margin + 2, y);
    y += lineH + 1;
  });
  y += 6;

  // Phases
  plan.steps.forEach((step, i) => {
    checkPage(24);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Phase ${i + 1}: ${step.phase}`, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(step.duration, margin, y);
    y += 6;

    step.actions.forEach(a => {
      checkPage(lineH + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      const al = doc.splitTextToSize(`· ${a}`, contentWidth - 6);
      doc.text(al, margin + 3, y);
      y += al.length * lineH + 1.5;
    });
    y += 3;
  });

  // Success story
  if (plan.successStory) {
    checkPage(18);
    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(70, 70, 70);
    const sl = doc.splitTextToSize(`"${plan.successStory}"`, contentWidth);
    doc.text(sl, margin, y);
    y += sl.length * lineH + 4;
  }

  addFooters(doc, pageWidth, pageHeight, margin);
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

  // Background
  ctx.fillStyle = '#f9f8f7';
  ctx.fillRect(0, 0, W, H);

  // Top rule
  ctx.fillStyle = '#000';
  ctx.fillRect(24, 20, W - 48, 2);

  // Eyebrow
  ctx.font = '10px Inter, Helvetica, sans-serif';
  ctx.fillStyle = '#999';
  ctx.fillText('CAREER SIMULATION  ·  DOSSIER', 24, 42);

  // Title
  ctx.font = 'bold 32px Georgia, serif';
  ctx.fillStyle = '#000';
  const titleText = job.title.length > 28 ? job.title.slice(0, 28) + '…' : job.title;
  ctx.fillText(titleText, 24, 88);

  // Category + Salary
  ctx.font = '14px Inter, Helvetica, sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText(`${job.category}  ·  ${job.avgSalary}`, 24, 116);

  // Skills
  ctx.font = '12px Inter, Helvetica, sans-serif';
  ctx.fillStyle = '#888';
  const skillText = job.skills.slice(0, 5).join('  ·  ');
  ctx.fillText(skillText.length > 60 ? skillText.slice(0, 60) + '…' : skillText, 24, 150);

  // Bottom bar
  ctx.fillStyle = '#000';
  ctx.fillRect(0, H - 40, W, 40);
  ctx.font = '11px Inter, Helvetica, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('careersim.app', 24, H - 16);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate share card'));
    }, 'image/png');
  });
}