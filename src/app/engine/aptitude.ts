import type { AptitudeScores } from './types';

export type AptitudeDimension = keyof AptitudeScores;
export interface AptitudeQuestion { id: string; dimension: AptitudeDimension; prompt: string; options: string[]; answer: number; }

// Two short forms per dimension. Questions are intentionally transparent screeners,
// not a claim of clinical or psychometric measurement.
export const APTITUDE_QUESTIONS: AptitudeQuestion[] = [
  { id:'n1', dimension:'numerical', prompt:'A ₹800 course is discounted by 15%. What is the sale price?', options:['₹680','₹700','₹720','₹740'], answer:0 },
  { id:'n2', dimension:'numerical', prompt:'A team finishes 3 jobs in 6 hours. At the same rate, how many jobs in 10 hours?', options:['4','5','6','8'], answer:1 },
  { id:'n3', dimension:'numerical', prompt:'A recipe uses 2 cups of rice for 5 people. How much for 15 people?', options:['4 cups','5 cups','6 cups','8 cups'], answer:2 },
  { id:'n4', dimension:'numerical', prompt:'A machine makes 120 parts in 4 hours. How many per hour?', options:['20','25','30','40'], answer:2 },
  { id:'n5', dimension:'numerical', prompt:'What is 3/4 of 64?', options:['36','42','48','56'], answer:2 },
  { id:'n6', dimension:'numerical', prompt:'If 5 notebooks cost ₹175, what does one cost?', options:['₹25','₹30','₹35','₹40'], answer:2 },
  { id:'n7', dimension:'numerical', prompt:'A ₹1,500 item rises 10% then falls 10%. Final price?', options:['₹1,485','₹1,500','₹1,510','₹1,650'], answer:0 },
  { id:'n8', dimension:'numerical', prompt:'A bus travels 180 km in 3 hours. Average speed?', options:['45','50','60','90'], answer:2 },
  { id:'n9', dimension:'numerical', prompt:'What is 25% of 240?', options:['40','50','60','80'], answer:2 },
  { id:'n10', dimension:'numerical', prompt:'A ratio is 2:3 and the total is 25. The smaller part is?', options:['8','10','12','15'], answer:1 },
  { id:'n11', dimension:'numerical', prompt:'A worker saves ₹400 each month. Savings after 9 months?', options:['₹3,200','₹3,600','₹4,000','₹4,400'], answer:1 },
  { id:'n12', dimension:'numerical', prompt:'If 8 metres of wire cost ₹320, cost per metre?', options:['₹30','₹35','₹40','₹45'], answer:2 },
  { id:'v1', dimension:'verbal', prompt:'Complete: Reliable is to dependable as rapid is to…', options:['slow','quick','careful','late'], answer:1 },
  { id:'v2', dimension:'verbal', prompt:'Which word is closest to “brief”?', options:['short','bright','broken','broad'], answer:0 },
  { id:'v3', dimension:'verbal', prompt:'A person who designs buildings is an…', options:['artisan','architect','accountant','analyst'], answer:1 },
  { id:'v4', dimension:'verbal', prompt:'Complete: The report was clear, ___ it used simple examples.', options:['because','although','unless','while'], answer:0 },
  { id:'v5', dimension:'verbal', prompt:'Which does not belong?', options:['Hindi','Telugu','Python','Marathi'], answer:2 },
  { id:'v6', dimension:'verbal', prompt:'“Practical” most nearly means…', options:['useful in real life','imaginary','expensive','automatic'], answer:0 },
  { id:'v7', dimension:'verbal', prompt:'Complete: Seed is to plant as idea is to…', options:['plan','soil','water','tool'], answer:0 },
  { id:'v8', dimension:'verbal', prompt:'Which is the clearest instruction?', options:['Do it soon','Submit the form by Friday','Maybe send it','Try your best'], answer:1 },
  { id:'v9', dimension:'verbal', prompt:'Opposite of “expand” is…', options:['extend','enlarge','contract','explain'], answer:2 },
  { id:'v10', dimension:'verbal', prompt:'A “priority” is something…', options:['chosen first','hidden away','repeated twice','never needed'], answer:0 },
  { id:'v11', dimension:'verbal', prompt:'Which pair has the closest relationship?', options:['book–read','chair–sing','road–drink','rain–write'], answer:0 },
  { id:'v12', dimension:'verbal', prompt:'Complete: The technician checked the cable ___ switching on the unit.', options:['before','inside','between','under'], answer:0 },
  { id:'l1', dimension:'logical', prompt:'What comes next: 2, 4, 8, 16, …?', options:['18','24','30','32'], answer:3 },
  { id:'l2', dimension:'logical', prompt:'All roses are flowers. Some flowers fade. Which must be true?', options:['All roses fade','Some roses fade','Roses are flowers','No flowers are roses'], answer:2 },
  { id:'l3', dimension:'logical', prompt:'Which is the odd one out?', options:['triangle','square','circle','cube'], answer:3 },
  { id:'l4', dimension:'logical', prompt:'What comes next: A, C, F, J, …?', options:['K','L','N','O'], answer:2 },
  { id:'l5', dimension:'logical', prompt:'If every red card is marked and this card is red, it is…', options:['marked','blue','blank','large'], answer:0 },
  { id:'l6', dimension:'logical', prompt:'Which number is different?', options:['9','16','25',' thirty-six'], answer:3 },
  { id:'l7', dimension:'logical', prompt:'What comes next: 1, 1, 2, 3, 5, …?', options:['6','7','8','10'], answer:2 },
  { id:'l8', dimension:'logical', prompt:'If A is taller than B and B taller than C, who is shortest?', options:['A','B','C','cannot tell'], answer:2 },
  { id:'l9', dimension:'logical', prompt:'Which pair follows the same rule as 2:4?', options:['3:6','3:8','4:6','4:10'], answer:0 },
  { id:'l10', dimension:'logical', prompt:'A meeting is after lunch and before dinner. It is likely in the…', options:['morning','afternoon','night','midnight'], answer:1 },
  { id:'l11', dimension:'logical', prompt:'What comes next: 10, 8, 6, 4, …?', options:['1','2','3','5'], answer:1 },
  { id:'l12', dimension:'logical', prompt:'If today is Monday, what day is 3 days later?', options:['Tuesday','Wednesday','Thursday','Friday'], answer:2 },
  { id:'s1', dimension:'spatial', prompt:'A paper arrow points up. Rotate it 90° clockwise. It points…', options:['up','right','down','left'], answer:1 },
  { id:'s2', dimension:'spatial', prompt:'A cube has 6 faces. How many faces meet at one corner?', options:['2','3','4','6'], answer:1 },
  { id:'s3', dimension:'spatial', prompt:'Which shape has no corners?', options:['triangle','rectangle','circle','pentagon'], answer:2 },
  { id:'s4', dimension:'spatial', prompt:'A map scale says 1 cm = 5 km. 4 cm represents…', options:['9 km','15 km','20 km','25 km'], answer:2 },
  { id:'s5', dimension:'spatial', prompt:'A rectangle folded once in half has how many layers?', options:['1','2','3','4'], answer:1 },
  { id:'s6', dimension:'spatial', prompt:'Which object can roll?', options:['ball','book','brick','table'], answer:0 },
  { id:'s7', dimension:'spatial', prompt:'A square turned 45° looks most like a…', options:['diamond','circle','line','triangle'], answer:0 },
  { id:'s8', dimension:'spatial', prompt:'If north is up on a map, east is to the…', options:['left','right','bottom','centre'], answer:1 },
  { id:'s9', dimension:'spatial', prompt:'How many equal sides does a regular hexagon have?', options:['4','5','6','8'], answer:2 },
  { id:'s10', dimension:'spatial', prompt:'A 3×3 grid has how many small squares?', options:['6','8','9','12'], answer:2 },
  { id:'s11', dimension:'spatial', prompt:'Which view shows the top of a cylinder?', options:['circle','triangle','square','star'], answer:0 },
  { id:'s12', dimension:'spatial', prompt:'A road goes east, then north. It now points…', options:['south-east','north-east','north-west','south-west'], answer:1 },
];

export function selectAptitudeForm(form: 0 | 1 = 0): AptitudeQuestion[] {
  return (['numerical','verbal','logical','spatial'] as AptitudeDimension[]).flatMap(d => APTITUDE_QUESTIONS.filter(q => q.dimension === d).slice(form * 6, form * 6 + 6));
}

export function scoreAptitude(answers: Record<string, number>, elapsedSeconds: number, totalSeconds = 300): AptitudeScores {
  const result: AptitudeScores = { numerical: 0, verbal: 0, logical: 0, spatial: 0 };
  for (const dimension of Object.keys(result) as AptitudeDimension[]) {
    const questions = APTITUDE_QUESTIONS.filter(q => q.dimension === dimension).slice(0, 6);
    const correct = questions.filter(q => answers[q.id] === q.answer).length;
    const speedBonus = Math.min(10, Math.max(0, Math.round(10 * Math.max(0, totalSeconds - elapsedSeconds) / totalSeconds)));
    result[dimension] = Math.min(100, Math.round(100 * correct / 6) + speedBonus);
  }
  return result;
}

