// ══════════════════════════════════════════════════════════════════════════════
// CareerCase RIASEC Assessment Engine — Interest Inventory
// 36-item O*NET-style work-activity assessment
// ══════════════════════════════════════════════════════════════════════════════

import type { RiasecScores } from './types';

export type RiasecDimension = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export interface RiasecItem {
  id: string;
  dimension: RiasecDimension;
  textKey: string; // i18n key
  text: string; // English default
}

// ─── 36 Work Activity Items (6 per dimension) ─────────────────────────────────

export const RIASEC_ITEMS: RiasecItem[] = [
  // Realistic (R) — hands-on, practical, mechanical
  { id: 'r1', dimension: 'R', textKey: 'riasec.r1', text: 'Repair an electrical appliance or vehicle' },
  { id: 'r2', dimension: 'R', textKey: 'riasec.r2', text: 'Build furniture or construct something with your hands' },
  { id: 'r3', dimension: 'R', textKey: 'riasec.r3', text: 'Operate machinery or technical equipment' },
  { id: 'r4', dimension: 'R', textKey: 'riasec.r4', text: 'Work outdoors on a farm or in nature' },
  { id: 'r5', dimension: 'R', textKey: 'riasec.r5', text: 'Install or troubleshoot computer hardware' },
  { id: 'r6', dimension: 'R', textKey: 'riasec.r6', text: 'Do physical work that keeps you active' },

  // Investigative (I) — analytical, scientific, problem-solving
  { id: 'i1', dimension: 'I', textKey: 'riasec.i1', text: 'Analyze data to find patterns or insights' },
  { id: 'i2', dimension: 'I', textKey: 'riasec.i2', text: 'Conduct a scientific experiment or research study' },
  { id: 'i3', dimension: 'I', textKey: 'riasec.i3', text: 'Solve complex mathematical or logical problems' },
  { id: 'i4', dimension: 'I', textKey: 'riasec.i4', text: 'Study how things work or why they happen' },
  { id: 'i5', dimension: 'I', textKey: 'riasec.i5', text: 'Program software or write code' },
  { id: 'i6', dimension: 'I', textKey: 'riasec.i6', text: 'Read scientific articles or technical documentation' },

  // Artistic (A) — creative, expressive, aesthetic
  { id: 'a1', dimension: 'A', textKey: 'riasec.a1', text: 'Design graphics, websites, or visual content' },
  { id: 'a2', dimension: 'A', textKey: 'riasec.a2', text: 'Write stories, articles, or creative content' },
  { id: 'a3', dimension: 'A', textKey: 'riasec.a3', text: 'Perform music, dance, or act in front of an audience' },
  { id: 'a4', dimension: 'A', textKey: 'riasec.a4', text: 'Create original artwork, crafts, or designs' },
  { id: 'a5', dimension: 'A', textKey: 'riasec.a5', text: 'Edit videos or produce multimedia content' },
  { id: 'a6', dimension: 'A', textKey: 'riasec.a6', text: 'Express yourself through creative projects' },

  // Social (S) — helping, teaching, caring
  { id: 's1', dimension: 'S', textKey: 'riasec.s1', text: 'Teach someone a new skill or concept' },
  { id: 's2', dimension: 'S', textKey: 'riasec.s2', text: 'Help people solve their personal problems' },
  { id: 's3', dimension: 'S', textKey: 'riasec.s3', text: 'Care for children, elderly, or patients' },
  { id: 's4', dimension: 'S', textKey: 'riasec.s4', text: 'Organize community events or volunteer activities' },
  { id: 's5', dimension: 'S', textKey: 'riasec.s5', text: 'Listen and provide emotional support to others' },
  { id: 's6', dimension: 'S', textKey: 'riasec.s6', text: 'Work in a team where collaboration is key' },

  // Enterprising (E) — persuading, leading, business
  { id: 'e1', dimension: 'E', textKey: 'riasec.e1', text: 'Convince others to buy a product or idea' },
  { id: 'e2', dimension: 'E', textKey: 'riasec.e2', text: 'Lead a team or project' },
  { id: 'e3', dimension: 'E', textKey: 'riasec.e3', text: 'Start your own business or venture' },
  { id: 'e4', dimension: 'E', textKey: 'riasec.e4', text: 'Negotiate deals or manage client relationships' },
  { id: 'e5', dimension: 'E', textKey: 'riasec.e5', text: 'Make decisions that affect a team or organization' },
  { id: 'e6', dimension: 'E', textKey: 'riasec.e6', text: 'Take risks to achieve ambitious goals' },

  // Conventional (C) — organizing, detail work, structure
  { id: 'c1', dimension: 'C', textKey: 'riasec.c1', text: 'Organize files, records, or data systematically' },
  { id: 'c2', dimension: 'C', textKey: 'riasec.c2', text: 'Follow detailed procedures and checklists' },
  { id: 'c3', dimension: 'C', textKey: 'riasec.c3', text: 'Manage budgets, accounts, or financial records' },
  { id: 'c4', dimension: 'C', textKey: 'riasec.c4', text: 'Work with spreadsheets and databases' },
  { id: 'c5', dimension: 'C', textKey: 'riasec.c5', text: 'Ensure accuracy and quality in repetitive tasks' },
  { id: 'c6', dimension: 'C', textKey: 'riasec.c6', text: 'Maintain order and structure in a workspace' },
];

// ─── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Calculate RIASEC scores from responses (1-5 scale: strongly dislike to strongly like)
 * Each dimension gets 6 items; sum and normalize to 0-100
 */
export function scoreRiasec(responses: Record<string, number>): RiasecScores {
  const sums: Record<RiasecDimension, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const counts: Record<RiasecDimension, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  RIASEC_ITEMS.forEach(item => {
    const response = responses[item.id];
    if (response !== undefined && response >= 1 && response <= 5) {
      sums[item.dimension] += response;
      counts[item.dimension] += 1;
    }
  });

  // Normalize to 0-100 scale (1-5 sum of 6 items = 6-30 range)
  const scores: RiasecScores = {
    R: counts.R > 0 ? Math.round(((sums.R - 6) / 24) * 100) : 0,
    I: counts.I > 0 ? Math.round(((sums.I - 6) / 24) * 100) : 0,
    A: counts.A > 0 ? Math.round(((sums.A - 6) / 24) * 100) : 0,
    S: counts.S > 0 ? Math.round(((sums.S - 6) / 24) * 100) : 0,
    E: counts.E > 0 ? Math.round(((sums.E - 6) / 24) * 100) : 0,
    C: counts.C > 0 ? Math.round(((sums.C - 6) / 24) * 100) : 0,
  };

  return scores;
}

/**
 * Get top 3 RIASEC code (e.g., "ISA")
 */
export function getTopCode(scores: RiasecScores): string {
  const sorted = (Object.entries(scores) as [RiasecDimension, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([dim]) => dim);
  
  return sorted.join('');
}

/**
 * Simple interpretation for top dimension
 */
export function interpretTopDimension(dimension: RiasecDimension): string {
  const interpretations: Record<RiasecDimension, string> = {
    R: 'You enjoy hands-on work with tools, machines, or nature. Practical problem-solving energizes you.',
    I: "You're drawn to analysis, research, and understanding how things work. Curiosity drives you.",
    A: 'You value creativity and self-expression. Original ideas and aesthetic work fulfill you.',
    S: 'You find meaning in helping others and working with people. Connection and care matter to you.',
    E: "You're motivated by leadership, persuasion, and making things happen. You thrive on influence.",
    C: 'You appreciate structure, accuracy, and organization. Systematic work gives you satisfaction.',
  };
  return interpretations[dimension];
}
