import type { WorkValues } from './types';

export type ValueDimension = keyof WorkValues;
export interface ValueChoice { id: string; left: { label: string; dimension: ValueDimension }; right: { label: string; dimension: ValueDimension }; }
export const VALUE_CHOICES: ValueChoice[] = [
  { id:'v1', left:{label:'Predictable work and steady income',dimension:'stability'}, right:{label:'Rapid growth and new challenges',dimension:'growth'} },
  { id:'v2', left:{label:'Freedom to decide how I work',dimension:'autonomy'}, right:{label:'A role that improves people’s lives',dimension:'impact'} },
  { id:'v3', left:{label:'Higher pay with longer hours',dimension:'compensation'}, right:{label:'Balanced hours with moderate pay',dimension:'balance'} },
  { id:'v4', left:{label:'A secure organisation',dimension:'stability'}, right:{label:'Building new skills quickly',dimension:'growth'} },
  { id:'v5', left:{label:'Choose my own methods',dimension:'autonomy'}, right:{label:'Serve a community or cause',dimension:'impact'} },
  { id:'v6', left:{label:'Better pay and performance rewards',dimension:'compensation'}, right:{label:'Time for family and rest',dimension:'balance'} },
  { id:'v7', left:{label:'Long-term job security',dimension:'stability'}, right:{label:'A steep learning curve',dimension:'growth'} },
  { id:'v8', left:{label:'Independent ownership of work',dimension:'autonomy'}, right:{label:'Visible positive change',dimension:'impact'} },
  { id:'v9', left:{label:'Earn the highest available income',dimension:'compensation'}, right:{label:'Keep evenings predictable',dimension:'balance'} },
  { id:'v10', left:{label:'A known career ladder',dimension:'stability'}, right:{label:'Stretch assignments',dimension:'growth'} },
  { id:'v11', left:{label:'Work with minimal supervision',dimension:'autonomy'}, right:{label:'Mentor and support others',dimension:'impact'} },
  { id:'v12', left:{label:'Commission and bonus potential',dimension:'compensation'}, right:{label:'Flexible hours and boundaries',dimension:'balance'} },
  { id:'v13', left:{label:'Benefits and dependable policies',dimension:'stability'}, right:{label:'Experiment with new directions',dimension:'growth'} },
  { id:'v14', left:{label:'Be accountable for my own decisions',dimension:'autonomy'}, right:{label:'Work on a meaningful public need',dimension:'impact'} },
  { id:'v15', left:{label:'Maximise financial upside',dimension:'compensation'}, right:{label:'Protect personal wellbeing',dimension:'balance'} },
];

export function scoreValues(choices: Record<string, 'left' | 'right'>): WorkValues {
  const tally: Record<ValueDimension, number> = { stability:0, growth:0, autonomy:0, impact:0, balance:0, compensation:0 };
  for (const choice of VALUE_CHOICES) tally[choice[choices[choice.id] ?? 'left'].dimension] += 1;
  const total = VALUE_CHOICES.length;
  return Object.fromEntries(Object.entries(tally).map(([key, value]) => [key, Math.round(value / total * 100)])) as WorkValues;
}

