import type { Language } from './index';
import type { PathwayRoute, PathwayStep } from '../engine/types';
import { occupationById, qualificationById } from '../data/knowledge';
import { skillName } from '../engine/gaps';
import { occupationName } from './occupationNames';

const dimensions: Record<string, { hi: string; te: string }> = {
  interest:{hi:'रुचि',te:'ఆసక్తి'}, aptitude:{hi:'योग्यता',te:'సామర్థ్యం'}, values:{hi:'काम की प्राथमिकताएँ',te:'పని విలువలు'}, skill:{hi:'कौशल',te:'నైపుణ్యం'}, transferable:{hi:'स्थानांतरण योग्य अनुभव',te:'బదిలీ చేయగల అనుభవం'}, experience:{hi:'संबंधित अनुभव',te:'సంబంధిత అనుభవం'}, aspiration:{hi:'आकांक्षा',te:'ఆకాంక్ష'}, market:{hi:'बाज़ार संकेत',te:'మార్కెట్ సంకేతం'}, progression:{hi:'प्रगति विकल्प',te:'పురోగతి అవకాశాలు'}, learningFeasibility:{hi:'सीखने की व्यवहार्यता',te:'నేర్చుకునే సాధ్యత'}, geographic:{hi:'स्थान अनुकूलता',te:'ప్రాంత అనుకూలత'},
  'interest fit':{hi:'रुचि का मेल',te:'ఆసక్తి సరిపోలిక'}, 'aptitude fit':{hi:'योग्यता का मेल',te:'సామర్థ్య సరిపోలిక'}, 'values fit':{hi:'काम की प्राथमिकताओं का मेल',te:'పని విలువల సరిపోలిక'}, 'current skill coverage':{hi:'मौजूदा कौशल कवरेज',te:'ప్రస్తుత నైపుణ్య కవరేజ్'}, 'transferable experience':{hi:'स्थानांतरण योग्य अनुभव',te:'బదిలీ చేయగల అనుభవం'}, 'related experience':{hi:'संबंधित अनुभव',te:'సంబంధిత అనుభవం'}, 'aspiration alignment':{hi:'आकांक्षा का मेल',te:'ఆకాంక్ష సరిపోలిక'}, 'indicative market signal':{hi:'सांकेतिक बाज़ार संकेत',te:'సూచనాత్మక మార్కెట్ సంకేతం'}, 'progression options':{hi:'प्रगति विकल्प',te:'పురోగతి అవకాశాలు'}, 'learning feasibility':{hi:'सीखने की व्यवहार्यता',te:'నేర్చుకునే సాధ్యత'}, 'location fit':{hi:'स्थान का मेल',te:'ప్రాంత సరిపోలిక'},
};

const notes: Record<string, { hi: string; te: string }> = {
  'proficiency-weighted coverage of required skills':{hi:'आवश्यक कौशलों का दक्षता-भारित कवरेज',te:'అవసరమైన నైపుణ్యాల ప్రావీణ్య-భారిత కవరేజ్'},
  'strongest evidence-backed transition from prior experience':{hi:'पिछले अनुभव से सबसे मज़बूत प्रमाण-समर्थित बदलाव',te:'గత అనుభవం నుంచి బలమైన ఆధార-సహిత మార్పు'},
  'years in the same occupational cluster':{hi:'इसी व्यवसाय समूह में अनुभव के वर्ष',te:'ఇదే వృత్తి సమూహంలో అనుభవ సంవత్సరాలు'},
  'dream roles and themes in your stated aspiration':{hi:'आपकी बताई आकांक्षा में भूमिकाएँ और विषय',te:'మీరు తెలిపిన ఆకాంక్షలో పాత్రలు, అంశాలు'},
  'timestamped indicative demand signal with trend adjustment':{hi:'समय-अंकित सांकेतिक माँग, रुझान के अनुसार समायोजित',te:'కాలముద్రతో కూడిన సూచనాత్మక డిమాండ్, ధోరణి సవరణతో'},
  'number and strength of grounded outgoing transitions':{hi:'प्रमाणित आगे के बदलावों की संख्या और मज़बूती',te:'ఆధారిత తదుపరి మార్పుల సంఖ్య, బలం'},
  'skill-gap readiness adjusted for weekly learning time':{hi:'साप्ताहिक सीखने के समय के अनुसार कौशल-अंतर तैयारी',te:'వారపు అభ్యాస సమయానికి సవరించిన నైపుణ్య లోటు సిద్ధత'},
  'location and relocation preference compared with signal regions':{hi:'संकेत क्षेत्रों से स्थान और स्थानांतरण पसंद की तुलना',te:'సంకేత ప్రాంతాలతో స్థలం, మారే అభిరుచుల పోలిక'},
};

export function localizedDimension(value: string, lang: Language): string {
  return lang === 'en' ? value : dimensions[value]?.[lang] ?? value;
}

export function localizedNote(value: string, lang: Language): string {
  return lang === 'en' ? value : notes[value]?.[lang] ?? value;
}

export function localizedReason(reason: string, lang: Language): string {
  if (lang === 'en') return reason;
  const match = reason.match(/^(.+) is (\d+)\/100 — (.+)$/);
  if (!match) return reason;
  const join = lang === 'hi' ? 'है' : 'స్కోరు';
  return `${localizedDimension(match[1], lang)} ${match[2]}/100 ${join} — ${localizedNote(match[3], lang)}`;
}

export function localizedConfidence(value: string, lang: Language): string {
  if (lang === 'hi') return ({low:'कम',medium:'मध्यम',high:'उच्च'} as Record<string,string>)[value] ?? value;
  if (lang === 'te') return ({low:'తక్కువ',medium:'మధ్యస్థం',high:'అధికం'} as Record<string,string>)[value] ?? value;
  return value;
}

export function localizedTrend(value: string, lang: Language): string {
  if (lang === 'hi') return ({rising:'बढ़ता',stable:'स्थिर',declining:'घटता'} as Record<string,string>)[value] ?? value;
  if (lang === 'te') return ({rising:'పెరుగుతోంది',stable:'స్థిరం',declining:'తగ్గుతోంది'} as Record<string,string>)[value] ?? value;
  return value;
}

export function localizedTradeoff(route: PathwayRoute, lang: Language): string {
  if (lang === 'en') return route.tradeoff;
  const copy = lang === 'hi'
    ? {direct:'कौशल और प्रमाण पर केंद्रित मार्ग; इसकी वास्तविक अवधि की तुलना दूसरे विकल्पों से करें।', stepping_stone:'कम जोखिम वाला मार्ग; निगरानी में अभ्यास करते हुए आय और प्रमाण बनाए रखता है।', qualification_first:'सबसे मज़बूत औपचारिक संकेत; इसमें सामान्यतः सबसे अधिक समय और लागत लगती है।'}
    : {direct:'నైపుణ్యాలు, ఆధారాలపై కేంద్రీకృత మార్గం; దీని నిజమైన వ్యవధిని ఇతర ఎంపికలతో పోల్చండి.', stepping_stone:'తక్కువ ప్రమాద మార్గం; పర్యవేక్షిత సాధనతో ఆదాయం, ఆధారాలను కొనసాగిస్తుంది.', qualification_first:'బలమైన అధికారిక సంకేతం; సాధారణంగా ఎక్కువ సమయం, ఖర్చు అవసరం.'};
  return copy[route.kind];
}

export function localizedStep(step: PathwayStep, lang: Language): string {
  if (lang === 'en') return step.label;
  if (step.kind === 'validate_skill' && step.refId) return lang === 'hi' ? `पूर्व सीख की मान्यता से ${skillName(step.refId)} सत्यापित करें` : `గత అభ్యాస గుర్తింపుతో ${skillName(step.refId)} ధృవీకరించండి`;
  const occupation = step.refId ? occupationById.get(step.refId) : undefined;
  const role = occupation ? occupationName(occupation.id, occupation.title, lang) : '';
  if (step.kind === 'transition_role' && role) return lang === 'hi' ? `पहले ${role} की भूमिका में जाएँ` : `ముందుగా ${role} పాత్రకు మారండి`;
  if (step.kind === 'target' && role) return lang === 'hi' ? `${role} अवसरों की ओर बढ़ें` : `${role} అవకాశాల వైపు ముందుకు సాగండి`;
  if (step.kind === 'project') return lang === 'hi' ? `भूमिका के कौशल दिखाने वाली पोर्टफोलियो परियोजना पूरी करें` : `పాత్ర నైపుణ్యాలను చూపే పోర్ట్‌ఫోలియో ప్రాజెక్ట్ పూర్తి చేయండి`;
  if (step.kind === 'learn') return lang === 'hi' ? `अगले बदलाव के लिए आवश्यक कौशल बनाएँ` : `తదుపరి మార్పుకు అవసరమైన నైపుణ్యాలు పెంచుకోండి`;
  if (step.kind === 'qualification' && step.refId && qualificationById.has(step.refId)) {
    const qualification = qualificationById.get(step.refId)!;
    const target = qualification.preparesForOccupationIds.map(id => occupationById.get(id)).find(Boolean);
    const label = target ? qualification.name.replace(target.title, occupationName(target.id, target.title, lang)) : qualification.name;
    return `${label} · ${lang === 'hi' ? 'मान्य योग्यता' : 'గుర్తింపు పొందిన అర్హత'}`;
  }
  return step.label;
}

export function localizedStepKind(kind: PathwayStep['kind'], lang: Language): string {
  if (lang === 'en') return kind.replace('_',' ');
  const hi={validate_skill:'कौशल सत्यापन',qualification:'योग्यता',learn:'सीखना',project:'परियोजना',transition_role:'मध्यवर्ती भूमिका',target:'लक्ष्य'};
  const te={validate_skill:'నైపుణ్య ధృవీకరణ',qualification:'అర్హత',learn:'అభ్యాసం',project:'ప్రాజెక్ట్',transition_role:'మధ్యంతర పాత్ర',target:'లక్ష్యం'};
  return (lang === 'hi' ? hi : te)[kind];
}
