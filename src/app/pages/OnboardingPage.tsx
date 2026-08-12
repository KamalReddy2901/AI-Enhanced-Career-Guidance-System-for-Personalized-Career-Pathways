import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { StickFigure, type StickFigurePose } from '../components/StickFigure';
import { logConsent } from '../services/guidanceDb';
import { useGuidance } from '../context/GuidanceContext';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sounds';
import { hapticLight, hapticSuccess } from '../utils/haptic';
import { calculateCompleteness } from '../engine/skillProfile';
import type { Segment, CareerPassport, Education, Constraints, Experience } from '../engine/types';
import { OCCUPATIONS } from '../data/knowledge';
import { LanguageSwitcher, useT } from '../i18n';
import { AnimatePresence, motion } from 'motion/react';

const STEPS = ['segment', 'goals', 'background', 'constraints', 'consent', 'finish'] as const;
type Step = typeof STEPS[number];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { updatePassport, passport } = useGuidance();
  const { user } = useAuth();
  const { lang } = useT();
  const nav = lang === 'hi' ? { steps:['स्थिति','लक्ष्य','पृष्ठभूमि','सीमाएँ','सहमति','पूर्ण'], back:'वापस', next:'आगे बढ़ें', finish:'मेरी यात्रा शुरू करें' } : lang === 'te' ? { steps:['స్థితి','లక్ష్యాలు','నేపథ్యం','పరిమితులు','సమ్మతి','పూర్తి'], back:'వెనుకకు', next:'కొనసాగించండి', finish:'నా ప్రయాణం ప్రారంభించండి' } : { steps:['segment','goals','background','constraints','consent','finish'], back:'Back', next:'Continue', finish:'Start My Journey' };
  
  const [currentStep, setCurrentStep] = useState<Step>('segment');
  const [segment, setSegment] = useState<Segment | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [education, setEducation] = useState<Education>({ level: 'class_12' });
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [constraints, setConstraints] = useState<Constraints>({
    location: '',
    canRelocate: true,
    weeklyLearningHours: 5,
    budgetLevel: 'medium',
    languages: ['English'],
    needsIncomeContinuity: false,
  });
  const [isMinor, setIsMinor] = useState<boolean | null>(null);
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [dataConsentGiven, setDataConsentGiven] = useState(false);
  const [cloudHistoryConsent, setCloudHistoryConsent] = useState(false);
  const [guardianPendingLogged, setGuardianPendingLogged] = useState(false);

  // Redirect if already onboarded
  useEffect(() => {
    if (passport && passport.segment) {
      navigate('/assess');
    }
  }, [passport, navigate]);

  const handleNext = () => {
    sounds.click();
    hapticLight();
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1]);
      sounds.tabChange();
    }
  };

  const handleBack = () => {
    sounds.click();
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1]);
    }
  };

  const handleFinish = () => {
    if (!segment) return;
    
    const newPassport: CareerPassport = {
      segment,
      education,
      experiences,
      skills: [],
      constraints,
      completeness: 0,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    
    // Add goals to aspiration seeding if provided
    if (goals.length > 0) {
      newPassport.aspiration = {
        statement: goals.join(', '),
        horizonYears: 3,
        themes: goals,
        dreamOccupationIds: [],
        entrepreneurialIntent: 'none',
        capturedVia: 'form',
      };
    }
    
    newPassport.completeness = calculateCompleteness(newPassport);
    
    updatePassport(() => newPassport);

    const localConsentEntries = [
      { consent_type: 'data_processing', granted: dataConsentGiven, detail: {}, created_at: new Date().toISOString() },
      { consent_type: 'cloud_history', granted: cloudHistoryConsent, detail: { optional: true }, created_at: new Date().toISOString() },
      ...(isMinor ? [{ consent_type: 'guardian', granted: guardianConfirmed, detail: { method: 'email_ack_demo', guardianName }, created_at: new Date().toISOString() }] : []),
    ];
    localStorage.setItem('cc_guidance_consents', JSON.stringify(localConsentEntries));
    localStorage.setItem('cc_guidance_minor', isMinor ? 'true' : 'false');
    if (isMinor) (window as unknown as { posthog?: { opt_out_capturing: () => void } }).posthog?.opt_out_capturing();
    
    // Log consents if user is signed in
    if (user?.id) {
      import('../services/guidanceDb').then(({ logConsent }) => {
        logConsent(user.id, 'data_processing', dataConsentGiven);
        logConsent(user.id, 'cloud_history', cloudHistoryConsent, { purpose: 'optional_cloud_history' });
        if (isMinor && guardianConfirmed) {
          logConsent(user.id, 'guardian', true, {
            guardianName,
            guardianEmail,
            method: 'manual_confirmation',
          });
        }
      });
    }
    
    sounds.success();
    hapticSuccess();
    
    navigate('/assess');
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'segment': return segment !== null;
      case 'goals': return true; // optional
      case 'background': return education.level !== 'below_10' || experiences.length === 0;
      case 'constraints': return constraints.location.length > 0 && constraints.weeklyLearningHours > 0;
      case 'consent': return isMinor === false ? dataConsentGiven : (isMinor && guardianConfirmed && dataConsentGiven);
      case 'finish': return true;
      default: return false;
    }
  };

  const stepIndex = STEPS.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-[#f9f8f7] p-4 md:p-8">
      {/* Progress rail */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-[JetBrains_Mono] text-sm ${
                idx <= stepIndex ? 'bg-black text-white border-black' : 'bg-white text-black/30 border-black/20'
              }`}>
                {idx + 1}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-0.5 w-4 sm:w-12 mx-1 ${idx < stepIndex ? 'bg-black' : 'bg-black/20'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((step, idx) => (
            <div key={step} className={`w-1/6 text-center text-[8px] sm:text-xs font-[JetBrains_Mono] uppercase sm:tracking-wide ${
              idx <= stepIndex ? 'text-black' : 'text-black/30'
            }`}>
              {nav.steps[idx]}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait"><motion.div key={currentStep} initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-12}} transition={{duration:.2}} className="max-w-2xl mx-auto bg-white border border-black/10 p-8 rounded-sm">
        {currentStep === 'segment' && <SegmentStep segment={segment} setSegment={setSegment} />}
        {currentStep === 'goals' && <GoalsStep goals={goals} setGoals={setGoals} />}
        {currentStep === 'background' && <BackgroundStep education={education} setEducation={setEducation} experiences={experiences} setExperiences={setExperiences} />}
        {currentStep === 'constraints' && <ConstraintsStep constraints={constraints} setConstraints={setConstraints} segment={segment} />}
        {currentStep === 'consent' && <ConsentStep isMinor={isMinor} setIsMinor={setIsMinor} guardianName={guardianName} setGuardianName={setGuardianName} guardianEmail={guardianEmail} setGuardianEmail={setGuardianEmail} guardianConfirmed={guardianConfirmed} setGuardianConfirmed={setGuardianConfirmed} dataConsentGiven={dataConsentGiven} setDataConsentGiven={setDataConsentGiven} cloudHistoryConsent={cloudHistoryConsent} setCloudHistoryConsent={setCloudHistoryConsent} userId={user?.id} guardianPendingLogged={guardianPendingLogged} setGuardianPendingLogged={setGuardianPendingLogged} />}
        {currentStep === 'finish' && <FinishStep />}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {currentStep !== 'segment' && (
            <button
              onClick={handleBack}
              className="px-6 py-2 border border-black/20 hover:bg-black/5 font-[Inter] text-sm transition-colors"
            >
              ← {nav.back}
            </button>
          )}
          {currentStep !== 'finish' ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-2 bg-black text-white hover:bg-black/90 disabled:bg-black/20 disabled:text-black/40 font-[Inter] text-sm transition-colors ml-auto"
            >
              {nav.next} →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-6 py-2 bg-black text-white hover:bg-black/90 font-[Inter] text-sm transition-colors ml-auto"
            >
              {nav.finish} →
            </button>
          )}
        </div>
      </motion.div></AnimatePresence>
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function SegmentStep({ segment, setSegment }: { segment: Segment | null; setSegment: (s: Segment) => void }) {
  const { lang } = useT();
  const base: Array<{ value: Segment; label: string; pose: StickFigurePose; description: string }> = [
    { value: 'school_student', label: 'School Student', pose: 'reading', description: 'Class 10-12, exploring career options' },
    { value: 'college_student', label: 'College Student', pose: 'thinking', description: 'Undergraduate/postgraduate, planning next steps' },
    { value: 'job_seeker', label: 'Job Seeker', pose: 'pointing', description: 'Looking for my first job or re-entering workforce' },
    { value: 'career_switcher', label: 'Career Switcher', pose: 'walking', description: 'Changing careers, exploring new paths' },
    { value: 'professional', label: 'Working Professional', pose: 'celebrating', description: 'Advancing my career, upskilling' },
  ];
  const local = lang === 'hi' ? [['स्कूल विद्यार्थी','कक्षा 10–12, करियर विकल्प खोज रहे हैं'],['कॉलेज विद्यार्थी','स्नातक/स्नातकोत्तर, अगले कदम की योजना'],['नौकरी खोजने वाले','पहली नौकरी या काम पर वापसी की तलाश'],['करियर बदलने वाले','नए करियर मार्ग खोज रहे हैं'],['कार्यरत पेशेवर','करियर में आगे बढ़ना और कौशल बढ़ाना']] : lang === 'te' ? [['పాఠశాల విద్యార్థి','10–12 తరగతులు, కెరీర్ ఎంపికల అన్వేషణ'],['కళాశాల విద్యార్థి','డిగ్రీ/పీజీ, తదుపరి దశ ప్రణాళిక'],['ఉద్యోగ అన్వేషి','మొదటి ఉద్యోగం లేదా తిరిగి పనిలో చేరడం'],['కెరీర్ మార్పుదారు','కొత్త కెరీర్ మార్గాల అన్వేషణ'],['పని చేసే వృత్తి నిపుణుడు','కెరీర్ పురోగతి, నైపుణ్యాభివృద్ధి']] : null;
  const segments = base.map((item,index)=>local?{...item,label:local[index][0],description:local[index][1]}:item);
  const title=lang==='hi'?'आप अभी किस स्थिति में हैं?':lang==='te'?'మీరు ప్రస్తుతం ఏ దశలో ఉన్నారు?':'Where are you right now?';
  const intro=lang==='hi'?'अपनी मौजूदा स्थिति समझने में हमारी मदद करें':lang==='te'?'మీ ప్రస్తుత పరిస్థితిని అర్థం చేసుకోవడానికి సహాయపడండి':'Help us understand your current situation';

  return (
    <div>
      <h2 className="text-3xl font-[Playfair_Display] text-black mb-2">{title}</h2>
      <p className="text-black/60 font-[Inter] mb-6">{intro}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {segments.map(({ value, label, pose, description }) => (
          <button
            key={value}
            onClick={() => { setSegment(value); sounds.click(); }}
            className={`p-6 border-2 rounded-sm text-left transition-all hover:border-black/40 ${
              segment === value ? 'border-black bg-black/5' : 'border-black/10'
            }`}
          >
            <div className="flex items-start gap-4">
              <StickFigure pose={pose} size={48} />
              <div>
                <div className="font-[Inter] font-semibold text-black mb-1">{label}</div>
                <div className="font-[Inter] text-sm text-black/60">{description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GoalsStep({ goals, setGoals }: { goals: string[]; setGoals: (g: string[]) => void }) {
  const { lang } = useT();
  const goalValues = [
    'Explore career options',
    'Choose education path',
    'Find my first job',
    'Change careers',
    'Advance in current field',
    'Upskill or reskill',
  ];
  const labels = lang==='hi'?['करियर विकल्प खोजें','शिक्षा का मार्ग चुनें','पहली नौकरी पाएँ','करियर बदलें','मौजूदा क्षेत्र में आगे बढ़ें','नया कौशल सीखें']:lang==='te'?['కెరీర్ ఎంపికలను అన్వేషించండి','విద్యా మార్గాన్ని ఎంచుకోండి','మొదటి ఉద్యోగం పొందండి','కెరీర్ మార్చండి','ప్రస్తుత రంగంలో ఎదగండి','కొత్త నైపుణ్యాలు నేర్చుకోండి']:goalValues;

  const toggleGoal = (goal: string) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter(g => g !== goal));
    } else {
      setGoals([...goals, goal]);
    }
    sounds.click();
  };

  return (
    <div>
      <h2 className="text-3xl font-[Playfair_Display] text-black mb-2">{lang==='hi'?'आप क्या समझना चाहते हैं?':lang==='te'?'మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?':'What are you trying to figure out?'}</h2>
      <p className="text-black/60 font-[Inter] mb-6">{lang==='hi'?'लागू होने वाले सभी विकल्प चुनें (वैकल्पिक)':lang==='te'?'వర్తించే అన్నింటినీ ఎంచుకోండి (ఐచ్ఛికం)':'Select all that apply (optional)'}</p>
      
      <div className="flex flex-wrap gap-3">
        {goalValues.map((goal,index) => (
          <button
            key={goal}
            onClick={() => toggleGoal(goal)}
            className={`px-4 py-2 border rounded-full font-[Inter] text-sm transition-all ${
              goals.includes(goal) ? 'bg-black text-white border-black' : 'border-black/20 hover:border-black/40'
            }`}
          >
            {labels[index]}
          </button>
        ))}
      </div>
    </div>
  );
}

function BackgroundStep({ education, setEducation, experiences, setExperiences }: { 
  education: Education; 
  setEducation: (e: Education) => void; 
  experiences: Experience[]; 
  setExperiences: (e: Experience[]) => void; 
}) {
  const { lang } = useT();
  const c=lang==='hi'?{title:'शिक्षा और अनुभव',intro:'अपनी पृष्ठभूमि बताएँ',level:'उच्चतम शिक्षा स्तर',below:'कक्षा 10 से नीचे',c10:'कक्षा 10',c12:'कक्षा 12',iti:'ITI/डिप्लोमा',ug:'स्नातक',pg:'स्नातकोत्तर',field:'अध्ययन क्षेत्र (वैकल्पिक)',fieldPh:'जैसे कंप्यूटर विज्ञान, वाणिज्य, मैकेनिकल इंजीनियरिंग',work:'कार्य अनुभव (वैकल्पिक)',job:'पद का नाम',years:'वर्ष',desc:'संक्षिप्त विवरण',remove:'हटाएँ',add:'अनुभव जोड़ें'}:lang==='te'?{title:'విద్య మరియు అనుభవం',intro:'మీ నేపథ్యాన్ని తెలియజేయండి',level:'అత్యున్నత విద్యా స్థాయి',below:'10వ తరగతి కంటే తక్కువ',c10:'10వ తరగతి',c12:'12వ తరగతి',iti:'ITI/డిప్లొమా',ug:'డిగ్రీ',pg:'పీజీ',field:'అధ్యయన రంగం (ఐచ్ఛికం)',fieldPh:'ఉదా: కంప్యూటర్ సైన్స్, కామర్స్, మెకానికల్ ఇంజినీరింగ్',work:'పని అనుభవం (ఐచ్ఛికం)',job:'ఉద్యోగ పేరు',years:'సంవత్సరాలు',desc:'సంక్షిప్త వివరణ',remove:'తొలగించండి',add:'అనుభవం జోడించండి'}:{title:'Education & Experience',intro:'Tell us about your background',level:'Highest Education Level',below:'Below Class 10',c10:'Class 10',c12:'Class 12',iti:'ITI/Diploma',ug:'Undergraduate',pg:'Postgraduate',field:'Field of Study (optional)',fieldPh:'e.g., Computer Science, Commerce, Mechanical Engineering',work:'Work Experience (optional)',job:'Job title',years:'Years',desc:'Brief description',remove:'Remove',add:'Add Experience'};
  const addExperience = () => {
    setExperiences([...experiences, { title: '', years: 0, description: '' }]);
    sounds.click();
  };

  const updateExperience = <K extends keyof Experience>(idx: number, field: K, value: Experience[K]) => {
    const updated = [...experiences];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'title' && typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      const match = OCCUPATIONS.find(occupation => occupation.title.toLowerCase() === normalized)
        ?? OCCUPATIONS.find(occupation => occupation.title.toLowerCase().includes(normalized) || normalized.includes(occupation.title.toLowerCase()));
      updated[idx].occupationId = match?.id;
    }
    setExperiences(updated);
  };

  const removeExperience = (idx: number) => {
    setExperiences(experiences.filter((_, i) => i !== idx));
    sounds.click();
  };

  return (
    <div>
      <h2 className="text-3xl font-[Playfair_Display] text-black mb-2">{c.title}</h2>
      <p className="text-black/60 font-[Inter] mb-6">{c.intro}</p>
      
      <div className="mb-6">
        <label className="block font-[Inter] text-sm font-semibold mb-2">{c.level}</label>
        <select
          value={education.level}
          onChange={(e) => setEducation({ ...education, level: e.target.value as Education['level'] })}
          className="w-full p-3 border border-black/20 rounded-sm font-[Inter] text-sm"
        >
          <option value="below_10">{c.below}</option><option value="class_10">{c.c10}</option><option value="class_12">{c.c12}</option><option value="iti_diploma">{c.iti}</option><option value="undergraduate">{c.ug}</option><option value="postgraduate">{c.pg}</option>
        </select>
      </div>

      {(education.level === 'iti_diploma' || education.level === 'undergraduate' || education.level === 'postgraduate') && (
        <div className="mb-6">
          <label className="block font-[Inter] text-sm font-semibold mb-2">{c.field}</label>
          <input
            type="text"
            value={education.field || ''}
            onChange={(e) => setEducation({ ...education, field: e.target.value })}
            placeholder={c.fieldPh}
            className="w-full p-3 border border-black/20 rounded-sm font-[Inter] text-sm"
          />
        </div>
      )}

      <div className="mb-4">
        <label className="block font-[Inter] text-sm font-semibold mb-2">{c.work}</label>
        {experiences.map((exp, idx) => (
          <div key={idx} className="mb-4 p-4 border border-black/10 rounded-sm">
            <input
              type="text"
              value={exp.title}
              onChange={(e) => updateExperience(idx, 'title', e.target.value)}
              placeholder={c.job}
              className="w-full p-2 border border-black/20 rounded-sm font-[Inter] text-sm mb-2"
              list="occupation-title-options"
            />
            <datalist id="occupation-title-options">{OCCUPATIONS.map(occupation => <option key={occupation.id} value={occupation.title} />)}</datalist>
            <input
              type="number"
              value={exp.years || ''}
              onChange={(e) => updateExperience(idx, 'years', parseFloat(e.target.value) || 0)}
              placeholder={c.years}
              step="0.5"
              min="0"
              className="w-full p-2 border border-black/20 rounded-sm font-[Inter] text-sm mb-2"
            />
            <textarea
              value={exp.description}
              onChange={(e) => updateExperience(idx, 'description', e.target.value)}
              placeholder={c.desc}
              className="w-full p-2 border border-black/20 rounded-sm font-[Inter] text-sm mb-2 resize-none"
              rows={2}
            />
            <button onClick={() => removeExperience(idx)} className="text-xs font-[Inter] text-black/50 hover:text-black">{c.remove}</button>
          </div>
        ))}
        <button onClick={addExperience} className="text-sm font-[Inter] text-black hover:underline">+ {c.add}</button>
      </div>
    </div>
  );
}

function ConstraintsStep({ constraints, setConstraints, segment }: { 
  constraints: Constraints; 
  setConstraints: (c: Constraints) => void; 
  segment: Segment | null;
}) {
  const { lang }=useT();
  const c=lang==='hi'?{title:'आपकी सीमाएँ',intro:'अपनी स्थिति समझने में हमारी मदद करें',location:'स्थान',locationPh:'शहर या क्षेत्र',relocate:'स्थान बदलने के लिए तैयार',hours:'साप्ताहिक सीखने के घंटे',budget:'सीखने का बजट',low:'कम (मुख्यतः निःशुल्क संसाधन)',medium:'मध्यम (कुछ सशुल्क पाठ्यक्रम)',high:'अधिक (औपचारिक कार्यक्रम और प्रमाणपत्र)',languages:'भाषाएँ',income:'सीखते समय आय बनाए रखना आवश्यक है'}:lang==='te'?{title:'మీ పరిమితులు',intro:'మీ పరిస్థితిని అర్థం చేసుకోవడానికి సహాయపడండి',location:'ప్రాంతం',locationPh:'నగరం లేదా ప్రాంతం',relocate:'స్థలం మారడానికి సిద్ధం',hours:'వారానికి అభ్యాస గంటలు',budget:'అభ్యాస బడ్జెట్',low:'తక్కువ (ప్రధానంగా ఉచిత వనరులు)',medium:'మధ్యస్థం (కొన్ని చెల్లింపు కోర్సులు)',high:'ఎక్కువ (అధికారిక కార్యక్రమాలు, ధృవపత్రాలు)',languages:'భాషలు',income:'నేర్చుకునే సమయంలో ఆదాయం కొనసాగాలి'}:{title:'Your Constraints',intro:'Help us understand your situation',location:'Location',locationPh:'City or region',relocate:'Open to relocation',hours:'Weekly Learning Hours',budget:'Learning Budget',low:'Low (primarily free resources)',medium:'Medium (some paid courses)',high:'High (formal programs, certifications)',languages:'Languages',income:'Need to maintain income while learning'};
  return (
    <div>
      <h2 className="text-3xl font-[Playfair_Display] text-black mb-2">{c.title}</h2><p className="text-black/60 font-[Inter] mb-6">{c.intro}</p>
      
      <div className="space-y-4">
        <div>
          <label className="block font-[Inter] text-sm font-semibold mb-2">{c.location}</label>
          <input
            type="text"
            value={constraints.location}
            onChange={(e) => setConstraints({ ...constraints, location: e.target.value })}
            placeholder={c.locationPh}
            className="w-full p-3 border border-black/20 rounded-sm font-[Inter] text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="relocate"
            checked={constraints.canRelocate}
            onChange={(e) => setConstraints({ ...constraints, canRelocate: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="relocate" className="font-[Inter] text-sm">{c.relocate}</label>
        </div>

        <div>
          <label className="block font-[Inter] text-sm font-semibold mb-2">
            {c.hours}: {constraints.weeklyLearningHours}h
          </label>
          <input
            type="range"
            min="1"
            max="40"
            value={constraints.weeklyLearningHours}
            onChange={(e) => setConstraints({ ...constraints, weeklyLearningHours: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-[Inter] text-sm font-semibold mb-2">{c.budget}</label>
          <select
            value={constraints.budgetLevel}
            onChange={(e) => setConstraints({ ...constraints, budgetLevel: e.target.value as Constraints['budgetLevel'] })}
            className="w-full p-3 border border-black/20 rounded-sm font-[Inter] text-sm"
          >
            <option value="low">{c.low}</option><option value="medium">{c.medium}</option><option value="high">{c.high}</option>
          </select>
        </div>

        <div>
          <label className="block font-[Inter] text-sm font-semibold mb-2">{c.languages}</label>
          <input value={constraints.languages.join(', ')} onChange={(event) => setConstraints({ ...constraints, languages: event.target.value.split(',').map(value => value.trim()).filter(Boolean) })} placeholder="English, Hindi, Telugu" className="w-full p-3 border border-black/20 rounded-sm font-[Inter] text-sm" />
        </div>

        {(segment === 'career_switcher' || segment === 'professional') && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="income"
              checked={constraints.needsIncomeContinuity}
              onChange={(e) => setConstraints({ ...constraints, needsIncomeContinuity: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="income" className="font-[Inter] text-sm">{c.income}</label>
          </div>
        )}
      </div>
    </div>
  );
}

interface ConsentStepProps {
  isMinor: boolean | null; setIsMinor: (value: boolean) => void;
  guardianName: string; setGuardianName: (value: string) => void;
  guardianEmail: string; setGuardianEmail: (value: string) => void;
  guardianConfirmed: boolean; setGuardianConfirmed: (value: boolean) => void;
  dataConsentGiven: boolean; setDataConsentGiven: (value: boolean) => void;
  cloudHistoryConsent: boolean; setCloudHistoryConsent: (value: boolean) => void;
  userId?: string; guardianPendingLogged: boolean; setGuardianPendingLogged: (value: boolean) => void;
}

function ConsentStep({ isMinor, setIsMinor, guardianName, setGuardianName, guardianEmail, setGuardianEmail, guardianConfirmed, setGuardianConfirmed, dataConsentGiven, setDataConsentGiven, cloudHistoryConsent, setCloudHistoryConsent, userId, guardianPendingLogged, setGuardianPendingLogged }: ConsentStepProps) {
  const { t,lang } = useT();
  const c=lang==='hi'?{title:'सहमति और गोपनीयता',age:'आयु घोषणा',adult:'मेरी आयु 18 वर्ष या अधिक है',minor:'मेरी आयु 18 वर्ष से कम है',guardianName:'अभिभावक का नाम',guardianEmail:'अभिभावक का ईमेल',generate:'अभिभावक पुष्टि अनुरोध बनाएँ',pending:'अभिभावक की सहमति लंबित है—पुष्टि अनुरोध बनाया गया है।',confirmed:'पुष्टि हुई मानें (प्रदर्शन प्रवाह—अभिभावक ने स्वीकृति दी है)',demo:'प्रदर्शन प्रवाह—वास्तविक सेवा DigiLocker-सत्यापित अभिभावक सहमति का उपयोग करेगी।',dataTitle:'हम कौन-सा डेटा क्यों उपयोग करते हैं',data:'डेटा',purpose:'उद्देश्य',storage:'भंडारण',profile:'प्रोफ़ाइल और आकलन',matching:'करियर मिलान',browser:'ब्राउज़र + वैकल्पिक क्लाउड',usage:'उपयोग का तरीका',improve:'सुझाव बेहतर करना',aggregate:'केवल समेकित'}:lang==='te'?{title:'సమ్మతి మరియు గోప్యత',age:'వయస్సు ప్రకటన',adult:'నా వయస్సు 18 సంవత్సరాలు లేదా అంతకంటే ఎక్కువ',minor:'నా వయస్సు 18 సంవత్సరాల కంటే తక్కువ',guardianName:'సంరక్షకుని పేరు',guardianEmail:'సంరక్షకుని ఇమెయిల్',generate:'సంరక్షకుని నిర్ధారణ అభ్యర్థన రూపొందించండి',pending:'సంరక్షకుని సమ్మతి పెండింగ్‌లో ఉంది—నిర్ధారణ అభ్యర్థన రూపొందించబడింది.',confirmed:'నిర్ధారించబడినట్లు గుర్తించండి (ప్రదర్శన ప్రవాహం—సంరక్షకుడు ఆమోదించారు)',demo:'ప్రదర్శన ప్రవాహం—అసలు సేవ DigiLocker ధృవీకరించిన సంరక్షక సమ్మతిని ఉపయోగిస్తుంది.',dataTitle:'మేము ఏ డేటాను ఎందుకు ఉపయోగిస్తాము',data:'డేటా',purpose:'ఉద్దేశ్యం',storage:'నిల్వ',profile:'ప్రొఫైల్ మరియు అంచనాలు',matching:'కెరీర్ సరిపోలిక',browser:'బ్రౌజర్ + ఐచ్ఛిక క్లౌడ్',usage:'వినియోగ నమూనాలు',improve:'సిఫార్సులను మెరుగుపరచడం',aggregate:'సమగ్ర రూపంలో మాత్రమే'}:{title:'Consent & Privacy',age:'Age Declaration',adult:'I am 18 years or older',minor:'I am under 18 years old',guardianName:'Guardian name',guardianEmail:'Guardian email',generate:'Generate guardian confirmation request',pending:'Guardian consent pending — a confirmation request has been generated.',confirmed:'Mark as confirmed (demonstration flow — guardian has approved)',demo:'Demonstration flow — production uses DigiLocker-verified guardian consent.',dataTitle:'What data we use and why',data:'Data',purpose:'Purpose',storage:'Storage',profile:'Profile & assessments',matching:'Career matching',browser:'Browser + optional cloud',usage:'Usage patterns',improve:'Improve recommendations',aggregate:'Aggregated only'};
  const requestGuardianConsent = () => {
    if (!guardianName.trim() || !guardianEmail.trim()) return;
    setGuardianPendingLogged(true);
    if (userId) void logConsent(userId, 'guardian', false, { method: 'email_ack_pending', guardian_name: guardianName });
    sounds.notification();
  };
  return (
    <div>
      <h2 className="text-3xl font-[Playfair_Display] text-black mb-2">{c.title}</h2>
      <p className="text-black/60 font-[Inter] mb-6">{t('consent')}</p>
      
      <div className="space-y-6">
        <div>
          <label className="block font-[Inter] text-sm font-semibold mb-2">{c.age}</label>
          <div className="space-y-2">
            <button
              onClick={() => { setIsMinor(false); sounds.click(); }}
              className={`w-full p-3 border rounded-sm text-left font-[Inter] text-sm ${isMinor === false ? 'border-black bg-black/5' : 'border-black/20'}`}
            >
              {c.adult}
            </button>
            <button
              onClick={() => { setIsMinor(true); sounds.click(); }}
              className={`w-full p-3 border rounded-sm text-left font-[Inter] text-sm ${isMinor === true ? 'border-black bg-black/5' : 'border-black/20'}`}
            >
              {c.minor}
            </button>
          </div>
        </div>

        {isMinor === true && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm">
            <p className="font-[Inter] text-sm mb-3">
              {t('guardianNotice')}
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder={c.guardianName}
                className="w-full p-2 border border-black/20 rounded-sm font-[Inter] text-sm"
              />
              <input
                type="email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                placeholder={c.guardianEmail}
                className="w-full p-2 border border-black/20 rounded-sm font-[Inter] text-sm"
              />
              {!guardianPendingLogged ? (
                <button type="button" onClick={requestGuardianConsent} disabled={!guardianName.trim() || !guardianEmail.trim()} className="min-h-11 w-full border border-black/20 bg-white px-3 py-2 font-[Inter] text-sm disabled:opacity-40">
                  {c.generate}
                </button>
              ) : (
                <p className="border-l-4 border-amber-500 bg-white p-3 font-[Inter] text-sm">{c.pending}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  id="guardian-confirm"
                  checked={guardianConfirmed}
                  onChange={(e) => {
                    setGuardianConfirmed(e.target.checked);
                    if (e.target.checked && userId) void logConsent(userId, 'guardian', true, { method: 'email_ack_demo_confirmed', guardian_name: guardianName });
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="guardian-confirm" className="font-[Inter] text-sm">
                  {c.confirmed}
                </label>
              </div>
              <p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-wide text-black/50">{c.demo}</p>
            </div>
          </div>
        )}

        <div className="p-4 border border-black/10 rounded-sm">
          <h3 className="font-[Inter] font-semibold text-sm mb-3">{c.dataTitle}</h3>
          <table className="w-full text-xs font-[Inter]">
            <thead className="border-b border-black/10">
              <tr>
                <th className="text-left py-2">{c.data}</th><th className="text-left py-2">{c.purpose}</th><th className="text-left py-2">{c.storage}</th>
              </tr>
            </thead>
            <tbody className="text-black/70">
              <tr className="border-b border-black/5">
                <td className="py-2">{c.profile}</td><td className="py-2">{c.matching}</td><td className="py-2">{c.browser}</td>
              </tr>
              <tr className="border-b border-black/5">
                <td className="py-2">{c.usage}</td><td className="py-2">{c.improve}</td><td className="py-2">{c.aggregate}</td>
              </tr>
            </tbody>
          </table>
          <div className="flex items-start gap-2 mt-4">
            <input
              type="checkbox"
              id="data-consent"
              checked={dataConsentGiven}
              onChange={(e) => setDataConsentGiven(e.target.checked)}
              className="w-4 h-4 mt-1"
            />
            <label htmlFor="data-consent" className="font-[Inter] text-sm">
              {t('dataProcessing')}
            </label>
          </div>
          <div className="flex items-start gap-2 mt-3">
            <input type="checkbox" id="cloud-history-consent" checked={cloudHistoryConsent} onChange={(event) => setCloudHistoryConsent(event.target.checked)} className="w-4 h-4 mt-1" />
            <label htmlFor="cloud-history-consent" className="font-[Inter] text-sm">{t('cloudHistory')}</label>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinishStep() {
  const {lang}=useT();
  return (
    <div className="text-center py-8">
      <StickFigure pose="celebrating" size={120} />
      <h2 className="mt-6 text-3xl font-[Playfair_Display] text-black mb-2">{lang==='hi'?'सब तैयार है!':lang==='te'?'అంతా సిద్ధం!':"You're all set!"}</h2>
      <p className="text-black/60 font-[Inter] mb-6">
        {lang==='hi'?'आइए आपका करियर पासपोर्ट बनाना शुरू करें':lang==='te'?'మీ కెరీర్ పాస్‌పోర్ట్‌ను నిర్మించడం ప్రారంభిద్దాం':"Let's start building your Career Passport"}
      </p>
    </div>
  );
}

export default OnboardingPage;
