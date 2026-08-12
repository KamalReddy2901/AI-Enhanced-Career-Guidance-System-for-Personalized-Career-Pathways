import { Link } from "react-router";
import { StickFigure } from "../components/StickFigure";
import { useGuidance } from "../context/GuidanceContext";
import { useT } from "../i18n";
import { sounds } from "../utils/sounds";
import { hapticTap } from '../utils/haptic';
import { GuidanceEntrance } from '../components/guidance/GuidanceEntrance';
import { TextReveal } from '../motion/TextReveal';

const copy = {
  en: { desk:"examination hall", intro:"Four small signals help make your career landscape more personal.", completeness:"Assessment completeness", inProgress:"in progress", desc:["RIASEC work-activity inventory · 6 minutes","Numerical, verbal, logical and spatial screener · 5 minutes","Forced-choice work values sorter · 3 minutes","A guided reflection · up to 5 questions"] },
  hi: { desk:"परीक्षा कक्ष", intro:"चार छोटे संकेत आपके करियर परिदृश्य को अधिक व्यक्तिगत बनाते हैं।", completeness:"आकलन पूर्णता", inProgress:"प्रगति में", desc:["RIASEC कार्य-गतिविधि सूची · 6 मिनट","संख्यात्मक, शाब्दिक, तार्किक और स्थानिक जाँच · 5 मिनट","विकल्प-आधारित कार्य-मूल्य क्रम · 3 मिनट","मार्गदर्शित चिंतन · अधिकतम 5 प्रश्न"] },
  te: { desk:"పరీక్షా మందిరం", intro:"నాలుగు చిన్న సంకేతాలు మీ కెరీర్ దృశ్యాన్ని మరింత వ్యక్తిగతం చేస్తాయి.", completeness:"అంచనా పూర్తి స్థాయి", inProgress:"పురోగతిలో ఉంది", desc:["RIASEC పని-కార్యకలాపాల జాబితా · 6 నిమిషాలు","సంఖ్యా, భాషా, తార్కిక, ప్రాదేశిక పరీక్ష · 5 నిమిషాలు","ఎంపిక ఆధారిత పని విలువల క్రమం · 3 నిమిషాలు","మార్గదర్శిత ఆలోచన · గరిష్ఠం 5 ప్రశ్నలు"] },
} as const;

export function AssessmentHubPage() {
  const { passport } = useGuidance();
  const { t, lang } = useT();
  const c = copy[lang];
  const modules = [
    ["interests", c.desc[0], "/assess/interests", passport?.riasec],
    ["aptitude", c.desc[1], "/assess/aptitude", passport?.aptitude],
    ["values", c.desc[2], "/assess/values", passport?.values],
    ["aspirations", c.desc[3], "/assess/aspirations", passport?.aspiration],
  ] as const;
  const completed = modules.filter(([, , , done]) => Boolean(done)).length;
  const nextIndex = modules.findIndex(([, , , done]) => !done);
  return <div className="min-h-screen bg-[var(--paper)] px-6 py-16 md:py-24"><GuidanceEntrance className="mx-auto max-w-4xl">
    <header className="mb-12 grid gap-6 border-b-2 border-[var(--ink)] pb-8 md:grid-cols-[1fr_auto]"><div><div className="label-caps">CareerCase · {c.desk}</div><h1 className="font-display mt-3 text-5xl leading-[1.25] tracking-tighter md:text-6xl"><TextReveal text={t("assess")}/></h1><p className="mt-5 max-w-[65ch] text-base leading-relaxed text-[var(--ink-soft)]">{c.intro}</p></div><StickFigure pose="reading" size={112}/></header>
    <div className="mb-10"><div className="font-mono-ui flex justify-between text-xs uppercase"><span>{c.completeness}</span><span>{completed}/4 · {completed*25}%</span></div><div className="mt-3 h-1 bg-[var(--ink)]/15"><div className="h-full origin-left bg-[var(--ink)] transition-transform duration-500" style={{transform:`scaleX(${completed/4})`}}/></div></div>
    <div>{modules.map(([key,desc,path,done],index)=><Link key={path} to={path} onClick={()=>{sounds.navigate();hapticTap()}} className="group rule-top grid min-h-32 gap-4 py-6 transition-[transform] hover:translate-x-1 md:grid-cols-[64px_1fr_auto] md:items-center"><span className="font-mono-ui text-sm text-[var(--ink-faint)]">{String(index+1).padStart(2,'0')}</span><div><h2 className="font-display text-2xl">{t(key)}</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">{desc}</p></div><div className="flex items-center gap-4"><span className="font-mono-ui text-xs uppercase">{done?`✓ ${t("complete")}`:index===nextIndex?`● ${c.inProgress}`:`— ${t("notStarted")}`}</span>{index===nextIndex&&<span className="rounded-full bg-[var(--ink)] px-5 py-3 font-mono-ui text-xs text-[var(--paper)]">{t("start")}</span>}</div></Link>)}</div>
    <div className="mt-10 flex flex-wrap gap-3"><Link to="/passport" className="rounded-full border-2 border-[var(--ink)] px-6 py-3 font-mono-ui text-sm">{t("passport")}</Link><Link to="/recommendations" className="rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-3 font-mono-ui text-sm text-[var(--paper)]">{t("recommendations")}</Link></div>
  </GuidanceEntrance></div>;
}
export default AssessmentHubPage;
