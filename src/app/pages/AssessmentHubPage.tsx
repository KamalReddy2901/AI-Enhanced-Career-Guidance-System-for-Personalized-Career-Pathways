import { Link } from "react-router";
import { StickFigure } from "../components/StickFigure";
import { useGuidance } from "../context/GuidanceContext";
import { useT } from "../i18n";
import { sounds } from "../utils/sounds";
import { hapticTap } from '../utils/haptic';
import { GuidanceEntrance } from '../components/guidance/GuidanceEntrance';

const copy = {
  en: { desk:"examination hall", intro:"Four small signals help make your career landscape more personal.", completeness:"Assessment completeness", desc:["RIASEC work-activity inventory · 6 minutes","Numerical, verbal, logical and spatial screener · 5 minutes","Forced-choice work values sorter · 3 minutes","A guided reflection · up to 5 questions"] },
  hi: { desk:"परीक्षा कक्ष", intro:"चार छोटे संकेत आपके करियर परिदृश्य को अधिक व्यक्तिगत बनाते हैं।", completeness:"आकलन पूर्णता", desc:["RIASEC कार्य-गतिविधि सूची · 6 मिनट","संख्यात्मक, शाब्दिक, तार्किक और स्थानिक जाँच · 5 मिनट","विकल्प-आधारित कार्य-मूल्य क्रम · 3 मिनट","मार्गदर्शित चिंतन · अधिकतम 5 प्रश्न"] },
  te: { desk:"పరీక్షా మందిరం", intro:"నాలుగు చిన్న సంకేతాలు మీ కెరీర్ దృశ్యాన్ని మరింత వ్యక్తిగతం చేస్తాయి.", completeness:"అంచనా పూర్తి స్థాయి", desc:["RIASEC పని-కార్యకలాపాల జాబితా · 6 నిమిషాలు","సంఖ్యా, భాషా, తార్కిక, ప్రాదేశిక పరీక్ష · 5 నిమిషాలు","ఎంపిక ఆధారిత పని విలువల క్రమం · 3 నిమిషాలు","మార్గదర్శిత ఆలోచన · గరిష్ఠం 5 ప్రశ్నలు"] },
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
  return <div className="min-h-screen bg-[#f9f8f7] p-4 md:p-8"><GuidanceEntrance className="mx-auto max-w-4xl">
    <header className="mb-8 flex items-center gap-4 border-b-2 border-black pb-6"><StickFigure pose="reading" size={88}/><div><div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">CareerCase · {c.desk}</div><h1 className="text-4xl font-[Playfair_Display]">{t("assess")}</h1><p className="mt-2 font-[Inter] text-black/60">{c.intro}</p></div></header>
    <div className="mb-7 border border-black/10 bg-white p-4"><div className="flex justify-between font-[JetBrains_Mono] text-xs uppercase"><span>{c.completeness}</span><span>{completed}/4 · {completed*25}%</span></div><div className="mt-3 h-2 bg-black/10"><div className="h-2 bg-black transition-all" style={{width:`${completed*25}%`}}/></div></div>
    <div className="grid gap-4 md:grid-cols-2">{modules.map(([key,desc,path,done])=><Link key={path} to={path} onClick={()=>{sounds.navigate();hapticTap()}} className="min-h-52 border border-black/10 bg-white p-6 transition-colors hover:border-black"><div className="flex justify-between"><span className="font-[JetBrains_Mono] text-xs uppercase tracking-wide">{done?t("complete"):t("notStarted")}</span><span className="text-black/40">→</span></div><h2 className="mt-6 text-2xl font-[Playfair_Display]">{t(key)}</h2><p className="mt-2 font-[Inter] text-sm text-black/60">{desc}</p><div className="mt-5 font-[Inter] text-sm underline">{done?t("retake"):t("start")}</div></Link>)}</div>
    <div className="mt-8 flex flex-wrap gap-3"><Link to="/passport" className="min-h-11 border border-black/20 px-5 py-3 font-[Inter] text-sm">{t("passport")}</Link><Link to="/recommendations" className="min-h-11 bg-black px-5 py-3 font-[Inter] text-sm text-white">{t("recommendations")}</Link></div>
  </GuidanceEntrance></div>;
}
export default AssessmentHubPage;
