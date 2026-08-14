import type { ProviderLink, Qualification } from './schema';

export const PROVIDER_PORTALS = {
  skillIndia: { label: 'Skill India Digital Hub', url: 'https://courses.skillindiadigital.gov.in/courses/' },
  swayam: { label: 'SWAYAM', urlFor: (q: string) => `https://swayam.gov.in/explorer?searchText=${encodeURIComponent(q)}` },
  nptel: { label: 'NPTEL', url: 'https://nptel.ac.in/courses' },
  ncs: { label: 'National Career Service', url: 'https://www.ncs.gov.in/' },
  pmkvy: { label: 'PMKVY via Skill India', url: 'https://www.skillindiadigital.gov.in/home' },
  eSkillIndia: { label: 'eSkill India (NSDC)', url: 'https://nsdcindia.org/node/33593' },
  nielit: { label: 'NIELIT', url: 'https://www.nielit.gov.in/' },
  iti: { label: 'DGT Skill India (ITI)', url: 'https://dgt.skillindiadigital.gov.in/' },
  ugc: { label: 'UGC DEB (Degrees)', url: 'https://deb.ugc.ac.in/' },
  apprenticeship: { label: 'Apprenticeship India', url: 'https://www.apprenticeshipindia.gov.in/' },
} as const;

/** Maps every route to durable public portals instead of brittle course pages. */
export function providerLinksForQualification(qualification: Pick<Qualification, 'name' | 'type'>): ProviderLink[] {
  const p = PROVIDER_PORTALS;
  const swayam = { label: p.swayam.label, url: p.swayam.urlFor(qualification.name) };
  const isItRoute = /computer|software|web|mobile|graphic|digital|data|technology|electronics|iot/i.test(qualification.name);
  switch (qualification.type) {
    case 'iti': return [p.iti, p.skillIndia];
    case 'diploma': return [p.skillIndia, isItRoute ? p.nielit : p.ncs];
    case 'degree': return [swayam, p.ugc];
    case 'certification': return [swayam, p.eSkillIndia];
    case 'apprenticeship': return [p.apprenticeship];
    case 'nsqf_course': return [p.skillIndia, p.eSkillIndia, swayam];
  }
}
