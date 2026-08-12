import type { CareerPassport, CareerRecommendation, ComponentScore } from './types';
import { skillName } from './gaps';
export function reasons(components: ComponentScore[]): string[] { return [...components].sort((a,b)=>b.score*a.weight-a.score*b.weight).slice(0,3).map(c=>c.dimension+' signal: '+Math.round(c.score)+'/100'+(c.dataAvailable?'':' · take this module to sharpen it')); }
export function counterfactualDelta(_passport:CareerPassport,_occupationId:string,skillId:string,newProficiency:number):number{return Math.min(20,Math.max(1,Math.round(newProficiency*3)));}
export function whyNotHigher(components:ComponentScore[]):string[]{return [...components].sort((a,b)=>a.score-b.score).slice(0,2).map(c=>c.dimension+' is currently '+Math.round(c.score)+'/100; adding evidence or learning here could lift this route.');}
export function attachExplanation(rec:CareerRecommendation, components:ComponentScore):CareerRecommendation{return {...rec,topReasons:reasons(rec.components),whyNotHigher:whyNotHigher(rec.components),skillGapPreview:rec.skillGapPreview.map(g=>({...g,skillId:skillName(g.skillId)}))};}
