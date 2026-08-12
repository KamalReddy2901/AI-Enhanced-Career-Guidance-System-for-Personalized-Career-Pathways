import type { FitDimension, Segment } from './types';
export const DIMENSIONS: FitDimension[] = ['interest','aptitude','values','skill','transferable','experience','aspiration','market','progression','learningFeasibility','geographic'];
const base: Record<Segment, number[]> = { school_student:[.24,.22,.08,.04,.02,0,.12,.06,.08,.06,.08], college_student:[.18,.16,.08,.10,.04,.02,.12,.10,.08,.08,.04], job_seeker:[.10,.10,.06,.18,.10,.08,.08,.16,.06,.06,.02], career_switcher:[.08,.08,.10,.12,.22,.10,.08,.08,.04,.08,.02], professional:[.06,.06,.10,.16,.12,.20,.08,.08,.10,.02,.02] };
export function weightsFor(segment: Segment): Record<FitDimension, number> { return Object.fromEntries(DIMENSIONS.map((d,i)=>[d,base[segment][i]])) as Record<FitDimension,number>; }
