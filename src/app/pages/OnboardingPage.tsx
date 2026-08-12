import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { StickFigure } from '../components/StickFigure';
import { useGuidance } from '../context/GuidanceContext';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sounds';
import { haptic } from '../utils/haptic';
import { calculateCompleteness } from '../engine/skillProfile';
import type { Segment, CareerPassport, Education, Constraints, Experience } from '../engine/types';

const STEPS = ['segment', 'goals', 'background', 'constraints', 'consent', 'finish'] as const;
type Step = typeof STEPS[number];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { updatePassport, passport } = useGuidance();
  const { user } = useAuth();
  
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

  // Redirect if already onboarded
  useEffect(() => {
    if (passport && passport.segment) {
      navigate('/assess');
    }
  }, [passport, navigate]);

  const handleNext = () => {
    sounds.click();
    haptic.light();
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
    
    // Log consents if user is signed in
    if (user?.id) {
      import('../services/guidanceDb').then(({ logConsent }) => {
        logConsent(user.id, 'data_processing', dataConsentGiven);
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
    haptic.medium();
    
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
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-[JetBrains_Mono] text-sm ${
                idx <= stepIndex ? 'bg-black text-white border-black' : 'bg-white text-black/30 border-black/20'
              }`}>
                {idx + 1}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 ${idx < stepIndex ? 'bg-black' : 'bg-black/20'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((step, idx) => (
            <div key={step} className={`text-xs font-[JetBrains_Mono] uppercase tracking-wide ${
              idx <= stepIndex ? 'text-black' : 'text-black/30'
            }`}>
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto bg-white border border-black/10 p-8 rounded-sm">
        {currentStep === 'segment' && <SegmentStep segment={segment} setSegment={setSegment} />}
        {currentStep === 'goals' && <GoalsStep goals={goals} setGoals={setGoals} />}
        {currentStep === 'background' && <BackgroundStep education={education} setEducation={setEducation} experiences={experiences} setExperiences={setExperiences} />}
        {currentStep === 'constraints' && <ConstraintsStep constraints={constraints} setConstraints={setConstraints} segment={segment} />}
        {currentStep === 'consent' && <ConsentStep isMinor={isMinor} setIsMinor={setIsMinor} guardianName={guardianName} setGuardianName={setGuardianName} guardianEmail={guardianEmail} setGuardianEmail={setGuardianEmail} guardianConfirmed={guardianConfirmed} setGuardianConfirmed={setGuardianConfirmed} dataConsentGiven={dataConsentGiven} setDataConsentGiven={setDataConsentGiven} userId={user?.id} />}
        {currentStep === 'finish' && <FinishStep />}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {currentStep !== 'segment' && (
            <button
              onClick={handleBack}
              className="px-6 py-2 border border-black/20 hover:bg-black/5 font-[Inter] text-sm transition-colors"
            >
              ← Back
            </button>
          )}
          {currentStep !== 'finish' ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-2 bg-black text-white hover:bg-black/90 disabled:bg-black/20 disabled:text-black/40 font-[Inter] text-sm transition-colors ml-auto"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-6 py-2 bg-black text-white hover:bg-black/90 font-[Inter] text-sm transition-colors ml-auto"
            >
              Start My Journey →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function SegmentStep({ segment, setSegment }: { segment: Segment | null; setSegment: (s: Segment) => void }) {
  const segments: Array<{ value: Segment; label: string; pose: any; description: string }> = [
    { value: 'school_student', label: 'School Student', pose: 'reading', description: 'Class 10-12, exploring career options' },
    { value: 'college_student', label: 'College Student', pose: 'thinking', description: 'Undergraduate/postgraduate, planning next steps' },
    { value: 'job_seeker', label: 'Job Seeker', pose: 'pointing', description: 'Looking for my first job or re-entering workforce' },
    { value: 'career_switcher', label: 'Career Switcher', pose: 'walking', description: 'Changing careers, exploring new paths' },
    { value: 'professional', label: 'Working Professional', pose: 'celebrating', description: 'Advancing my career, upskilling' },
  ];

  return (
    <div>
      <h2 className="text-3xl font-[Playfair_Display] text-black mb-2">Where are you right now?</h2>
      <p className="text-black/60 font-[Inter] mb-6">Help us understand your current situation</p>
      
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
  const goalOptions = [
    'Explore career options',
    'Choose education path',
    'Find my first job',
    'Change careers',
    'Advance in current field',
    'Upskill or reskill',
  ];

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
      <h2 className="text-3xl font-[Playfair_Display] text-black mb-2">What are you trying to figure out?</h2>
      <p className="text-black/60 font-[Inter] mb-6">Select all that apply (optional)</p>
      
      <div className="flex flex-wrap gap-3">
        {goalOptions.map(goal => (
          <button
            key={goal}
            onClick={() => toggleGoal(goal)}
            className={`px-4 py-2 border rounded-full font-[Inter] text-sm transition-all ${
              goals.includes(goal) ? 'bg-black text-white border-black' : 'border-black/20 hover:border-black/40'
            }`}
          >
            {goal}
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
  const addExperience = () => {
    setExperiences([...experiences, { title: '', years: 0, description: '' }]);
    sounds.click();
  };

  const updateExperience = (idx: number, field: keyof Experience, value: any) => {
    const updated = [...experiences];
    updated[idx] = { ...updated[idx], [field]: value };
    setExperiences(updated);
  };

  const removeExperience = (idx: number) => {
    setExperiences(experiences.filter((_, i) => i !== idx));
    sounds.click();
  };

  return (
    <div>
      <h2 className="text-3xl font-[Playfair_Display] text-black mb-2">Education & Experience</h2>
      <p className="text-black/60 font-[Inter] mb-6">Tell us about your background</p>
      
      <div className="mb-6">
        <label className="block font-[Inter] text-sm font-semibold mb-2">Highest Education Level</label>
        <select
          value={education.level}
          onChange={(e) => setEducation({ ...education, level: e.target.value as any })}
          className="w-full p-3 border border-black/20 rounded-sm font-[Inter] text-sm"
        >
          <option value="below_10">Below Class 10</option>
          <option value="class_10">Class 10</option>
          <option value="class_12">Class 12</option>
          <option value="iti_diploma">ITI/Diploma</option>
          <option value="undergraduate">Undergraduate</option>
          <option value="postgraduate">Postgraduate</option>
        </select>
      </div>

      {(education.level === 'iti_diploma' || education.level === 'undergraduate' || education.level === 'postgraduate') && (
        <div className="mb-6">
          <label className="block font-[Inter] text-sm font-semibold mb-2">Field of Study (optional)</label>
          <input
            type="text"
            value={education.field || ''}
            onChange={(e) => setEducation({ ...education, field: e.target.value })}
            placeholder="e.g., Computer Science, Commerce, Mechanical Engineering"
            className="w-full p-3 border border-black/20 rounded-sm font-[Inter] text-sm"
          />
        </div>
      )}

      <div className="mb-4">
        <label className="block font-[Inter] text-sm font-semibold mb-2">Work Experience (optional)</label>
        {experiences.map((exp, idx) => (
          <div key={idx} className="mb-4 p-4 border border-black/10 rounded-sm">
            <input
              type="text"
              value={exp.title}
              onChange={(e) => updateExperience(idx, 'title', e.target.value)}
              placeholder="Job title"
              className="w-full p-2 border border-black/20 rounded-sm font-[Inter] text-sm mb-2"
            />
            <input
              type="number"
              value={exp.years || ''}
              onChange={(e) => updateExperience(idx, 'years', parseFloat(e.target.value) || 0)}
              placeholder="Years"
              step="0.5"
              min="0"
              className="w-full p-2 border border-black/20 rounded-sm font-[Inter] text-sm mb-2"
            />
            <textarea
              value={exp.description}
              onChange={(e) => updateExperience(idx, 'description', e.target.value)}
              placeholder="Brief description"
              className="w-full p-2 border border-black/20 rounded-sm font-[Inter] text-sm mb-2 resize-none"
              rows={2}
            />
            <button onClick={() => removeExperience(idx)} className="text-xs font-[Inter] text-black/50 hover:text-black">Remove</button>
          </div>
        ))}
        <button onClick={addExperience} className="text-sm font-[Inter] text-black hover:underline">+ Add Experience</button>
      </div>
    </div>
  );
}

function ConstraintsStep({ constraints, setConstraints, segment }: { 
  constraints: Constraints; 
  setConstraints: (c: Constraints) => void; 
  segment: Segment | null;
}) {
  return (
    <div>
      <h2 className="text-3xl font-[Playfair_Display] text-black mb-2">Your Constraints</h2>
      <p className="text-black/60 font-[Inter] mb-6">Help us understand your situation</p>
      
      <div className="space-y-4">
        <div>
          <label className="block font-[Inter] text-sm font-semibold mb-2">Location</label>
          <input
            type="text"
            value={constraints.location}
            onChange={(e) => setConstraints({ ...constraints, location: e.target.value })}
            placeholder="City or region"
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
          <label htmlFor="relocate" className="font-[Inter] text-sm">Open to relocation</label>
        </div>

        <div>
          <label className="block font-[Inter] text-sm font-semibold mb-2">
            Weekly Learning Hours: {constraints.weeklyLearningHours}h
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
          <label className="block font-[Inter] text-sm font-semibold mb-2">Learning Budget</label>
          <select
            value={constraints.budgetLevel}
            onChange={(e) => setConstraints({ ...constraints, budgetLevel: e.target.value as any })}
            className="w-full p-3 border border-black/20 rounded-sm font-[Inter] text-sm"
          >
            <option value="low">Low (primarily free resources)</option>
            <option value="medium">Medium (some paid courses)</option>
            <option value="high">High (formal programs, certifications)</option>
          </select>
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
            <label htmlFor="income" className="font-[Inter] text-sm">Need to maintain income while learning</label>
          </div>
        )}
      </div>
    </div>
  );
}

function ConsentStep({ isMinor, setIsMinor, guardianName, setGuardianName, guardianEmail, setGuardianEmail, guardianConfirmed, setGuardianConfirmed, dataConsentGiven, setDataConsentGiven, userId }: any) {
  return (
    <div>
      <h2 className="text-3xl font-[Playfair_Display] text-black mb-2">Consent & Privacy</h2>
      <p className="text-black/60 font-[Inter] mb-6">Your data, your control</p>
      
      <div className="space-y-6">
        <div>
          <label className="block font-[Inter] text-sm font-semibold mb-2">Age Declaration</label>
          <div className="space-y-2">
            <button
              onClick={() => { setIsMinor(false); sounds.click(); }}
              className={`w-full p-3 border rounded-sm text-left font-[Inter] text-sm ${isMinor === false ? 'border-black bg-black/5' : 'border-black/20'}`}
            >
              I am 18 years or older
            </button>
            <button
              onClick={() => { setIsMinor(true); sounds.click(); }}
              className={`w-full p-3 border rounded-sm text-left font-[Inter] text-sm ${isMinor === true ? 'border-black bg-black/5' : 'border-black/20'}`}
            >
              I am under 18 years old
            </button>
          </div>
        </div>

        {isMinor === true && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm">
            <p className="font-[Inter] text-sm mb-3">
              Under DPDP Act 2023 §9, we require guardian consent for users under 18.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Guardian name"
                className="w-full p-2 border border-black/20 rounded-sm font-[Inter] text-sm"
              />
              <input
                type="email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                placeholder="Guardian email"
                className="w-full p-2 border border-black/20 rounded-sm font-[Inter] text-sm"
              />
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  id="guardian-confirm"
                  checked={guardianConfirmed}
                  onChange={(e) => setGuardianConfirmed(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="guardian-confirm" className="font-[Inter] text-sm">
                  Mark as confirmed (demonstration flow — guardian has approved)
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border border-black/10 rounded-sm">
          <h3 className="font-[Inter] font-semibold text-sm mb-3">What data we use and why</h3>
          <table className="w-full text-xs font-[Inter]">
            <thead className="border-b border-black/10">
              <tr>
                <th className="text-left py-2">Data</th>
                <th className="text-left py-2">Purpose</th>
                <th className="text-left py-2">Storage</th>
              </tr>
            </thead>
            <tbody className="text-black/70">
              <tr className="border-b border-black/5">
                <td className="py-2">Profile & assessments</td>
                <td className="py-2">Career matching</td>
                <td className="py-2">Browser + optional cloud</td>
              </tr>
              <tr className="border-b border-black/5">
                <td className="py-2">Usage patterns</td>
                <td className="py-2">Improve recommendations</td>
                <td className="py-2">Aggregated only</td>
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
              I consent to data processing as described above (required)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinishStep() {
  return (
    <div className="text-center py-8">
      <StickFigure pose="celebrating" size={120} />
      <h2 className="mt-6 text-3xl font-[Playfair_Display] text-black mb-2">You're all set!</h2>
      <p className="text-black/60 font-[Inter] mb-6">
        Let's start building your Career Passport
      </p>
    </div>
  );
}

export default OnboardingPage;
