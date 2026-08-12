import { validateKB } from '../src/app/data/knowledge/validate';
import { OCCUPATIONS } from '../src/app/data/knowledge';
import { matchCareers } from '../src/app/engine/matching';
import { buildPathwayPlan } from '../src/app/engine/pathways';
import { validateWeights } from '../src/app/engine/weights';
import type { CareerPassport } from '../src/app/engine/types';

const passport: CareerPassport = {
  segment: 'career_switcher', education: { level: 'undergraduate', field: 'Commerce' },
  experiences: [{ title: 'Retail Store Manager', occupationId: 'store-manager', years: 5, description: 'Led store operations, sales and inventory.' }],
  skills: [], riasec: { R:35,I:65,A:40,S:62,E:72,C:70 }, aptitude: { numerical:75,verbal:70,logical:78,spatial:48 }, values: { stability:18,growth:20,autonomy:14,impact:14,balance:18,compensation:16 },
  aspiration: { statement:'Move into analytical business work.', horizonYears:3, themes:['analytics','business'], dreamOccupationIds:['business-analyst'], entrepreneurialIntent:'curious', capturedVia:'form' },
  constraints: { location:'Test Region A', canRelocate:true, weeklyLearningHours:8, budgetLevel:'medium', languages:['English'], needsIncomeContinuity:true }, completeness:90, version:1, updatedAt:new Date(0).toISOString(),
};

const failures=[...validateKB(),...validateWeights()];
let routesWithThree=0;
for(const occupation of OCCUPATIONS){try{const plan=buildPathwayPlan(passport,occupation.id);if(plan.routes.length===3&&new Set(plan.routes.map(route=>route.kind)).size===3)routesWithThree++;else failures.push(`${occupation.id}: expected three distinct routes`);if(plan.gapReport.readiness!==100-plan.gapReport.sgi)failures.push(`${occupation.id}: readiness mismatch`)}catch(error){failures.push(`${occupation.id}: pathway crash ${String(error)}`)}}

const identities=[['Aarav','Test Region A'],['Ananya','Test Region B'],['Faizan','Test Region C'],['సాయి','Test Region D'],['किरण','Test Region E'],['Mizo User','Test Region F']];
const outputs=identities.map(([,location])=>matchCareers({...passport,constraints:{...passport.constraints,location}}).recommendations.map(item=>`${item.occupationId}:${item.totalScore}`).join('|'));
if(!outputs.every(output=>output===outputs[0]))failures.push('Fairness check: identity/location-only personas changed output');

const landscape=matchCareers(passport);
if(!landscape.recommendations.some(item=>item.group==='vocational_entrepreneurial'))failures.push('Landscape missing vocational/entrepreneurial option');
if(!landscape.recommendations.some(item=>item.group==='exploration'))failures.push('Landscape missing exploration option');

console.log(JSON.stringify({kbViolations:validateKB().length,weightViolations:validateWeights().length,occupationsTested:OCCUPATIONS.length,routesWithThree,fairnessPersonas:identities.length,recommendations:landscape.recommendations.length,failures},null,2));
if(failures.length)process.exitCode=1;
