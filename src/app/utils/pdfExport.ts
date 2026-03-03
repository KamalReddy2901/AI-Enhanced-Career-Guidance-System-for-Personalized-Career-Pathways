import jsPDF from 'jspdf';

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