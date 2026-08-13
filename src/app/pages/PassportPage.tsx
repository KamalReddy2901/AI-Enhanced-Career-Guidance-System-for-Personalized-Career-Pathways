import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { StickFigure } from '../components/StickFigure';
import { useGuidance } from '../context/GuidanceContext';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sounds';
import { hapticLight, hapticSuccess } from '../utils/haptic';
import { GuidanceEntrance } from '../components/guidance/GuidanceEntrance';
import { extractProfileFromResume, type ResumeExtraction } from '../services/ai';
import { matchSkillsToKB, mergeSkillClaims, groupSkillsByCategory, estimateNSQFLevel, extractLiteralResumeSkills } from '../engine/skillProfile';
import { skillById } from '../data/knowledge';
import { SkillValidationDialog } from '../components/guidance/SkillValidationDialog';
import { RiasecHexagon } from '../components/guidance/RiasecHexagon';
import { addSkillEvidence, calculateCompleteness } from '../engine/skillProfile';
import type { SkillClaim, Proficiency } from '../engine/types';
import { logProgress } from '../services/guidanceDb';
import { WhyPanel, type ScoreEvidence } from '../components/guidance/WhyPanel';
import { motion } from 'motion/react';
import { TextReveal } from '../motion/TextReveal';
import { useT } from '../i18n';
import { readResumeText } from '../utils/resumeText';
import { useUndoStack } from '../hooks/useUndoStack';
import { Undo2, Redo2, RotateCcw, Plus } from 'lucide-react';
import { toast } from 'sonner';

export function PassportPage() {
  const navigate = useNavigate();
  const { passport, updatePassport } = useGuidance();
  const { user } = useAuth();
  const { t } = useT();
  const undoStack = useUndoStack(passport);
  const pc = {
    title: t('passport'),
    republic: t('passportRepublic'),
    print: t('passportPrint'),
    share: t('passportShare'),
    name: t('passportName'),
    code: t('passportCode'),
    match: t('passportTopMatch'),
    explorer: t('passportExplorer'),
    assessed: t('passportAssessed'),
  };
  
  const [resumeText, setResumeText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{step: string; current: number; total: number} | null>(null);
  const [extractError, setExtractError] = useState('');
  const [extractNotice, setExtractNotice] = useState('');
  const [unmatchedSkills, setUnmatchedSkills] = useState<string[]>([]);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
  const [validating, setValidating] = useState<SkillClaim | null>(null);
  const [editingConstraints, setEditingConstraints] = useState(false);
  const [editingSkillProficiency, setEditingSkillProficiency] = useState<string | null>(null);
  const [scoreEvidence, setScoreEvidence] = useState<ScoreEvidence | null>(null);
  const [addingManualSkill, setAddingManualSkill] = useState(false);
  const [manualSkillName, setManualSkillName] = useState('');
  const [manualSkillProficiency, setManualSkillProficiency] = useState<Proficiency>(2);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const handleResumeFile = async (file: File | undefined) => {
    if (!file) return;
    setExtractError('');
    setExtractNotice('');
    try {
      const text = await readResumeText(file);
      if (text.trim().length < 20) throw new Error('No readable resume text was found in that file.');
      setResumeText(text);
      setExtractNotice(`Loaded ${file.name}. Review the extracted text, then choose Extract profile.`);
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : 'Could not read that resume file.');
    } finally {
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  };

  const handleUndo = () => {
    const previous = undoStack.undo();
    if (previous) {
      updatePassport(() => previous);
      sounds.click();
      hapticLight();
      toast.success('Undone');
    }
  };

  const handleRedo = () => {
    const next = undoStack.redo();
    if (next) {
      updatePassport(() => next);
      sounds.click();
      hapticLight();
      toast.success('Redone');
    }
  };

  const handleRetakeAssessment = (type: 'riasec' | 'aptitude' | 'values') => {
    if (!window.confirm(`Retake ${type} assessment? Your current results will be cleared.`)) return;
    
    updatePassport(prev => {
      if (!prev) throw new Error('Passport unavailable');
      undoStack.pushState(prev);
      const next = { ...prev };
      if (type === 'riasec') next.riasec = undefined;
      else if (type === 'aptitude') next.aptitude = undefined;
      else if (type === 'values') next.values = undefined;
      next.completeness = calculateCompleteness(next);
      return next;
    });

    sounds.success();
    toast.success(`${type} assessment cleared`);
    navigate(`/assess/${type === 'riasec' ? 'interests' : type}`);
  };

  const handleSkillProficiencyChange = (skillId: string, newProficiency: Proficiency) => {
    updatePassport(prev => {
      if (!prev) throw new Error('Passport unavailable');
      undoStack.pushState(prev);
      const skills = prev.skills.map(claim =>
        claim.skillId === skillId
          ? { ...claim, proficiency: newProficiency }
          : claim
      );
      const next = { ...prev, skills };
      next.completeness = calculateCompleteness(next);
      return next;
    });
    setEditingSkillProficiency(null);
    sounds.stamp();
    hapticSuccess();
    toast.success('Proficiency updated');
  };

  const handleAddManualSkill = () => {
    if (!manualSkillName.trim()) {
      toast.error('Please enter a skill name');
      return;
    }

    // Try to match to KB first
    const { matched } = matchSkillsToKB([{
      name: manualSkillName.trim(),
      proficiency: manualSkillProficiency,
      evidence: 'self-reported',
    }]);

    updatePassport(prev => {
      if (!prev) throw new Error('Passport unavailable');
      undoStack.pushState(prev);
      
      if (matched.length > 0) {
        // Skill was matched to KB
        const next = { ...prev, skills: mergeSkillClaims(prev.skills, matched) };
        next.completeness = calculateCompleteness(next);
        return next;
      } else {
        // Add as custom skill with a generated ID
        const customClaim: SkillClaim = {
          skillId: `custom_${Date.now()}`,
          proficiency: manualSkillProficiency,
          confidence: 0.6,
          evidence: [{
            type: 'self_reported',
            description: `Manually added: ${manualSkillName.trim()}`,
            confidence: 0.6,
            observedAt: new Date().toISOString(),
          }],
        };
        const next = { ...prev, skills: [...prev.skills, customClaim] };
        next.completeness = calculateCompleteness(next);
        return next;
      }
    });

    setAddingManualSkill(false);
    setManualSkillName('');
    setManualSkillProficiency(2);
    sounds.success();
    hapticSuccess();
    toast.success('Skill added to passport');
  };

  if (!passport) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--paper)] p-6 text-[var(--ink)]">
        <StickFigure pose="thinking" size={120} />
        <h2 className="font-display mt-6 text-2xl">{t('passportNoPassport')}</h2>
        <button
          onClick={() => navigate('/onboarding')}
          className="mt-4 bg-[var(--ink)] px-6 py-2 text-sm text-[var(--paper)]"
        >
          {t('passportStartOnboarding')}
        </button>
      </div>
    );
  }

  const handleResumeExtract = async () => {
    if (!resumeText.trim()) return;
    
    setIsExtracting(true);
    setExtractError('');
    setExtractNotice('');
    setUnmatchedSkills([]);
    setExtractProgress({step: 'Starting extraction...', current: 1, total: 5});
    
    try {
      setExtractProgress({step: 'Reading resume text...', current: 2, total: 5});
      const extracted: ResumeExtraction = await extractProfileFromResume(resumeText);
      
      setExtractProgress({step: 'Matching skills to knowledge base...', current: 3, total: 5});
      // Match skills to KB
      const { matched, unmatched } = matchSkillsToKB(
        extracted.skills.map(s => ({
          name: s.name,
          proficiency: s.proficiency,
          evidence: s.evidence,
        }))
      );
      
      setUnmatchedSkills(unmatched);
      
      setExtractProgress({step: 'Updating your passport...', current: 4, total: 5});
      // Merge into passport
      updatePassport(prev => {
        const next = {...prev!,skills:mergeSkillClaims(prev!.skills,matched),experiences:[...prev!.experiences,...extracted.experiences.filter(e=>e.title.trim()&&e.years>0)],education:extracted.education||prev!.education};
        next.completeness=calculateCompleteness(next);
        return next;
      });
      
      setExtractProgress({step: 'Complete!', current: 5, total: 5});
      sounds.success();
      hapticSuccess();
      setTimeout(() => {
        setResumeText('');
        setExtractProgress(null);
      }, 800);
    } catch (err: unknown) {
      setExtractProgress({step: 'AI unavailable, using fallback...', current: 3, total: 5});
      const literal=extractLiteralResumeSkills(resumeText);
      if(literal.length){
        const {matched,unmatched}=matchSkillsToKB(literal);
        setUnmatchedSkills(unmatched);
        setExtractProgress({step: 'Updating passport...', current: 4, total: 5});
        updatePassport(prev=>{const next={...prev!,skills:mergeSkillClaims(prev!.skills,matched)};next.completeness=calculateCompleteness(next);return next});
        setExtractNotice(`${t('passportAiUnavailable')} ${matched.length}`);
        setExtractProgress({step: 'Complete!', current: 5, total: 5});
        sounds.success();hapticSuccess();
        setTimeout(() => {
          setResumeText('');
          setExtractProgress(null);
        }, 800);
      } else {
        setExtractError(t('passportParseFailed'));
        setExtractProgress(null);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const nsqfLevel = estimateNSQFLevel(passport.education);
  const groupedSkills = groupSkillsByCategory(passport.skills);
  const riasecCode = passport.riasec
    ? Object.entries(passport.riasec).sort(([, a], [, b]) => b - a).slice(0, 3).map(([key]) => key[0].toUpperCase()).join('')
    : 'PENDING';

  return (
    <div className="min-h-screen bg-[var(--paper)] p-4 pb-24 text-[var(--ink)] md:p-8">
      <GuidanceEntrance className="max-w-4xl mx-auto">
        <div className="passport-toolbar mb-4 flex justify-end gap-2 print:hidden">
          <button
            onClick={handleUndo}
            disabled={!undoStack.canUndo}
            title="Undo last change"
            className="font-mono-ui min-h-11 border-2 border-[var(--ink)] px-3 text-xs uppercase disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Undo2 size={14} /> Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!undoStack.canRedo}
            title="Redo"
            className="font-mono-ui min-h-11 border-2 border-[var(--ink)] px-3 text-xs uppercase disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Redo2 size={14} /> Redo
          </button>
          <button onClick={() => window.print()} data-testid="passport-print-btn" aria-label={pc.print} className="font-mono-ui min-h-11 border-2 border-[var(--ink)] px-4 text-xs uppercase">{pc.print}</button>
          <button onClick={() => void navigator.clipboard?.writeText(window.location.href)} data-testid="passport-share-btn" aria-label={pc.share} className="font-mono-ui min-h-11 bg-[var(--ink)] px-4 text-xs uppercase text-[var(--paper)]">{pc.share}</button>
        </div>
        {/* Header "Identity Card" */}
        <div className="career-passport-document relative mb-6 bg-[var(--paper-raised)] p-6 md:p-10">
          <div className="label-caps mb-6 border-b border-[var(--ink)] pb-3">{pc.republic}</div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display mb-1 text-5xl leading-[1.25]"><TextReveal text={pc.title} /></h1>
              <div className="font-mono-ui mt-6 grid grid-cols-2 gap-x-8 gap-y-4 text-xs uppercase tracking-wide md:grid-cols-4">
                <span><b className="block text-[9px] text-[var(--ink-soft)]">{pc.name}</b>{user?.email?.split('@')[0] ?? pc.explorer}</span>
                <span><b className="block text-[9px] text-[var(--ink-soft)]">{pc.code}</b>{riasecCode}</span>
                <span><b className="block text-[9px] text-[var(--ink-soft)]">{pc.match}</b>{passport.aspiration?.themes[0] ?? passport.segment.replace('_', ' ')}</span>
                <span><b className="block text-[9px] text-[var(--ink-soft)]">NSQF</b>~{nsqfLevel}</span>
              </div>
            </div>
            <motion.svg initial={{scale:.5,rotate:-18,opacity:0}} animate={{scale:1,rotate:-8,opacity:1}} transition={{type:'spring',bounce:.55,duration:.8}} className="passport-stamp hidden h-24 w-24 shrink-0 text-[var(--accent-news)] md:block" viewBox="0 0 100 100" role="img" aria-label={`${pc.assessed} 2026`}><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="50" cy="50" r="38" fill="none" stroke="currentColor"/><text x="50" y="38" textAnchor="middle" fill="currentColor" fontFamily="monospace" fontSize="9">{pc.assessed.toUpperCase()}</text><text x="50" y="57" textAnchor="middle" fill="currentColor" fontFamily="monospace" fontSize="17">✓ 2026</text><text x="50" y="72" textAnchor="middle" fill="currentColor" fontFamily="monospace" fontSize="9">{passport.completeness}%</text></motion.svg>
          </div>
          <div className="font-mono-ui mt-8 overflow-hidden whitespace-nowrap border-t-2 border-[var(--ink)] pt-3 text-[10px] tracking-[.2em]">P&lt;CAREERCASE&lt;&lt;{riasecCode}&lt;&lt;NSQF{nsqfLevel}&lt;&lt;V{passport.version}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
        </div>

        {/* Resume Extraction */}
        <div className="mb-6 border border-[var(--ink-faint)] bg-[var(--paper-raised)] p-6">
          <h2 className="font-display mb-3 text-2xl">{t('passportAddResume')}</h2>
          <p className="mb-4 text-sm text-[var(--ink-soft)]">
            {t('passportResumeHelp')}
          </p>
          <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" onChange={(event) => void handleResumeFile(event.target.files?.[0])} />
          <button type="button" onClick={() => resumeInputRef.current?.click()} disabled={isExtracting} className="mb-3 min-h-11 border-2 border-[var(--ink)] px-4 font-mono-ui text-xs uppercase disabled:opacity-40">Upload PDF, DOCX or TXT</button>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder={t('passportResumePlaceholder')}
            className="mb-3 h-32 w-full resize-none rounded-sm border border-[var(--ink-faint)] bg-[var(--paper)] p-3 text-sm"
            disabled={isExtracting}
          />
          {extractError && (
            <div className="mb-3 rounded-sm border border-[var(--accent-news)] bg-[var(--paper)] p-3 text-sm">
              {extractError}
            </div>
          )}
          {extractProgress && (
            <div className="mb-3 rounded-sm border border-[var(--ink-faint)] bg-[var(--paper)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{extractProgress.step}</span>
                <span className="font-mono-ui text-xs">{extractProgress.current}/{extractProgress.total}</span>
              </div>
              <div className="h-2 bg-[var(--ink-faint)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--ink)] transition-all duration-300"
                  style={{width: `${(extractProgress.current / extractProgress.total) * 100}%`}}
                />
              </div>
            </div>
          )}
          {extractNotice && <div className="mb-3 border-l-4 border-[var(--accent-news)] bg-[var(--paper)] p-3 text-sm">{extractNotice}</div>}
          {unmatchedSkills.length > 0 && (
            <div className="mb-3 rounded-sm border border-[var(--ink-faint)] bg-[var(--paper)] p-3 text-sm">
              <p className="mb-1 font-semibold">{t('passportUnmatchedSkills')}</p>
              <p className="text-[var(--ink-soft)]">{unmatchedSkills.join(', ')}</p>
              <button
                onClick={() => setAddingManualSkill(true)}
                className="mt-2 flex items-center gap-2 text-xs underline hover:no-underline"
              >
                <Plus size={12} /> Add these skills manually
              </button>
            </div>
          )}
          <button
            onClick={handleResumeExtract}
            disabled={!resumeText.trim() || isExtracting}
            className="bg-[var(--ink)] px-6 py-2 text-sm text-[var(--paper)] transition-opacity disabled:opacity-30"
          >
            {isExtracting ? t('passportExtracting') : t('passportExtract')}
          </button>
        </div>

        {/* Skills */}
        <div className="mb-6 border border-[var(--ink-faint)] bg-[var(--paper-raised)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">{t('passportSkills')}</h2>
            <button
              onClick={() => setAddingManualSkill(true)}
              className="flex items-center gap-2 border border-[var(--ink-faint)] px-3 py-2 text-sm hover:border-[var(--ink)]"
            >
              <Plus size={14} /> Add skill
            </button>
          </div>
          {passport.skills.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">{t('passportNoSkills')}</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSkills).map(([category, claims]) => (
                <div key={category}>
                  <h3 className="label-caps mb-2 text-[var(--ink-soft)]">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {claims.map(claim => {
                      const skill = skillById.get(claim.skillId);
                      if (!skill) return null;
                      
                      return (
                        <div key={claim.skillId} className="rounded-sm border border-[var(--ink-faint)] p-3 transition-colors hover:border-[var(--ink)]">
                          <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-semibold">{skill.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {editingSkillProficiency === claim.skillId ? (
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4].map(level => (
                                    <button
                                      key={level}
                                      onClick={() => handleSkillProficiencyChange(claim.skillId, level as Proficiency)}
                                      className={`w-6 h-6 rounded-full border-2 ${
                                        level <= claim.proficiency ? 'bg-[var(--ink)] border-[var(--ink)]' : 'border-[var(--ink-faint)]'
                                      } hover:border-[var(--ink)] transition-colors`}
                                    >
                                      {level}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => setEditingSkillProficiency(null)}
                                    className="ml-2 text-xs underline"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setEditingSkillProficiency(claim.skillId)}
                                    className="flex gap-1 hover:opacity-70"
                                    title="Click to edit proficiency"
                                  >
                                    {[1, 2, 3, 4].map(level => (
                                      <div
                                        key={level}
                                        className={`w-2 h-2 rounded-full ${
                                          level <= claim.proficiency ? 'bg-[var(--ink)]' : 'bg-[var(--ink-faint)]'
                                        }`}
                                      />
                                    ))}
                                  </button>
                                  <span className="font-mono-ui text-xs text-[var(--ink-soft)]">
                                    {claim.confidence < 0.7 ? t('passportUnverified') : `${Math.round(claim.confidence * 100)}% ${t('passportConfidence')}`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3"><button onClick={() => {sounds.click();hapticLight();setExpandedEvidence(expandedEvidence===claim.skillId?null:claim.skillId)}} className="min-h-11 text-xs text-[var(--ink-soft)] underline hover:text-[var(--ink)]">{claim.evidence.length} {t('passportEvidence')}</button><button onClick={()=>{sounds.modalOpen();hapticLight();setValidating(claim)}} className="min-h-11 border border-[var(--ink-faint)] px-3 text-xs">{t('passportValidate')}</button></div>
                          </div>
                          {expandedEvidence === claim.skillId && <div className="mt-3 space-y-2 border-t border-[var(--ink-faint)] pt-3">{claim.evidence.map((evidence,index)=><div key={`${evidence.observedAt}-${index}`} className="text-xs"><span className="font-mono-ui uppercase text-[var(--ink-soft)]">{evidence.type} · {Math.round(evidence.confidence*100)}%</span><p className="text-[var(--ink-soft)]">{evidence.description}</p></div>)}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Experiences */}
        <div className="mb-6 border border-[var(--ink-faint)] bg-[var(--paper-raised)] p-6">
          <h2 className="font-display mb-4 text-2xl">{t('passportExperiences')}</h2>
          {passport.experiences.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">{t('passportNoExperiences')}</p>
          ) : (
            <div className="space-y-3">
              {passport.experiences.map((exp, idx) => (
                <div key={idx} className="rounded-sm border border-[var(--ink-faint)] p-4">
                  <div className="text-sm font-semibold">{exp.title}</div>
                  <div className="font-mono-ui mt-1 text-xs text-[var(--ink-soft)]">
                    {exp.years} {exp.years === 1 ? t('passportYear') : t('passportYears')}
                  </div>
                  {exp.description && (
                    <p className="mt-2 text-sm text-[var(--ink-soft)]">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assessments */}
        <div className="mb-6 border border-[var(--ink-faint)] bg-[var(--paper-raised)] p-6">
          <h2 className="font-display mb-4 text-2xl">{t('passportAssessmentResults')}</h2>
          <div className="space-y-4">
            {passport.riasec ? (
              <div className="rounded-sm border border-[var(--ink-faint)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">{t('passportRiasecProfile')}</div>
                  <button
                    onClick={() => handleRetakeAssessment('riasec')}
                    className="flex items-center gap-1 text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] underline"
                  >
                    <RotateCcw size={12} /> Retake
                  </button>
                </div>
                <RiasecHexagon scores={passport.riasec} compact />
                <div className="font-mono-ui grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(passport.riasec).map(([key, val]) => (
                    <button key={key} className="flex min-h-11 w-full items-center justify-between hover:underline" onClick={()=>setScoreEvidence({title:`${t('passportWhyScore')} ${key} — ${val}`,eyebrow:t('passportInterestEvidence'),summary:t('passportInterestSummary'),method:t('passportInterestMethod'),items:[{label:`${t('passportSavedScore')} ${key}`,value:val,detail:t('passportInterestDetail')}],source:t('passportInterestSource')})}>
                      <span>{key}:</span>
                      <span>{val}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-sm border border-[var(--ink-faint)] p-4 text-center">
                <p className="mb-2 text-sm text-[var(--ink-soft)]">{t('passportNoInterest')}</p>
                <button
                  onClick={() => navigate('/assess/interests')}
                  className="text-sm hover:underline"
                >
                  {t('passportTakeAssessment')} →
                </button>
              </div>
            )}

            {passport.aptitude ? (
              <div className="rounded-sm border border-[var(--ink-faint)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">{t('passportAptitudeScores')}</div>
                  <button
                    onClick={() => handleRetakeAssessment('aptitude')}
                    className="flex items-center gap-1 text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] underline"
                  >
                    <RotateCcw size={12} /> Retake
                  </button>
                </div>
                <div className="font-mono-ui grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(passport.aptitude).map(([key, val]) => (
                    <button key={key} className="flex min-h-11 w-full items-center justify-between hover:underline" onClick={()=>setScoreEvidence({title:`${t('passportWhyScore')} ${key} — ${val}`,eyebrow:t('passportAptitudeEvidence'),summary:t('passportAptitudeSummary'),method:t('passportAptitudeMethod'),items:[{label:`${t('passportSavedScore')} ${key}`,value:val,detail:t('passportAptitudeDetail')}],source:t('passportAptitudeSource')})}>
                      <span>{key}:</span>
                      <span>{val}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-sm border border-[var(--ink-faint)] p-4 text-center">
                <p className="mb-2 text-sm text-[var(--ink-soft)]">{t('passportNoAptitude')}</p>
                <button
                  onClick={() => navigate('/assess/aptitude')}
                  className="text-sm hover:underline"
                >
                  {t('passportTakeAssessment')} →
                </button>
              </div>
            )}

            {passport.values ? (
              <div className="rounded-sm border border-[var(--ink-faint)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">{t('passportWorkValues')}</div>
                  <button
                    onClick={() => handleRetakeAssessment('values')}
                    className="flex items-center gap-1 text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] underline"
                  >
                    <RotateCcw size={12} /> Retake
                  </button>
                </div>
                <div className="font-mono-ui space-y-1 text-xs">
                  {Object.entries(passport.values)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, val]) => (
                      <button key={key} className="flex min-h-11 w-full items-center justify-between hover:underline" onClick={()=>setScoreEvidence({title:`${t('passportWhyScore')} ${key} — ${val}`,eyebrow:t('passportValuesEvidence'),summary:t('passportValuesSummary'),method:t('passportValuesMethod'),items:[{label:`${t('passportSavedScore')} ${key}`,value:val,detail:t('passportValuesDetail')}],source:t('passportValuesSource')})}>
                        <span>{key}:</span>
                        <span>{val}</span>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="rounded-sm border border-[var(--ink-faint)] p-4 text-center">
                <p className="mb-2 text-sm text-[var(--ink-soft)]">{t('passportNoValues')}</p>
                <button
                  onClick={() => navigate('/assess/values')}
                  className="text-sm hover:underline"
                >
                  {t('passportTakeAssessment')} →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Aspiration */}
        {passport.aspiration && (
          <div className="mb-6 border border-[var(--ink-faint)] bg-[var(--paper-raised)] p-6">
            <h2 className="font-display mb-3 text-2xl">{t('passportAspiration')}</h2>
            <p className="mb-2 text-sm text-[var(--ink-soft)]">{passport.aspiration.statement}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {passport.aspiration.themes.map(theme => (
                <span key={theme} className="rounded-full border border-[var(--ink-faint)] bg-[var(--paper)] px-3 py-1 text-xs">
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Constraints */}
        <div className="border border-[var(--ink-faint)] bg-[var(--paper-raised)] p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl">{t('passportConstraints')}</h2><button onClick={()=>setEditingConstraints(value=>!value)} className="min-h-11 border border-[var(--ink-faint)] px-4 py-2 text-sm">{editingConstraints?t('passportDone'):t('passportEdit')}</button></div>
          {editingConstraints ? <div className="grid gap-4 text-sm sm:grid-cols-2"><label>{t('passportLocation')}<input value={passport.constraints.location} onChange={event=>updatePassport(previous=>{if(!previous)throw new Error('Passport unavailable');return {...previous,constraints:{...previous.constraints,location:event.target.value}}})} className="mt-1 min-h-11 w-full border border-[var(--ink-faint)] bg-[var(--paper)] p-2"/></label><label>{t('passportLearningHours')}<input type="number" min="1" max="40" value={passport.constraints.weeklyLearningHours} onChange={event=>updatePassport(previous=>{if(!previous)throw new Error('Passport unavailable');return {...previous,constraints:{...previous.constraints,weeklyLearningHours:Number(event.target.value)}}})} className="mt-1 min-h-11 w-full border border-[var(--ink-faint)] bg-[var(--paper)] p-2"/></label><label>{t('passportBudget')}<select value={passport.constraints.budgetLevel} onChange={event=>updatePassport(previous=>{if(!previous)throw new Error('Passport unavailable');return {...previous,constraints:{...previous.constraints,budgetLevel:event.target.value as 'low'|'medium'|'high'}}})} className="mt-1 min-h-11 w-full border border-[var(--ink-faint)] bg-[var(--paper)] p-2"><option value="low">{t('passportBudgetLow')}</option><option value="medium">{t('passportBudgetMedium')}</option><option value="high">{t('passportBudgetHigh')}</option></select></label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={passport.constraints.canRelocate} onChange={event=>updatePassport(previous=>{if(!previous)throw new Error('Passport unavailable');return {...previous,constraints:{...previous.constraints,canRelocate:event.target.checked}}})}/>{t('passportCanRelocate')}</label></div> : <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--ink-soft)]">{t('passportLocation')}:</span>{' '}
              <span>{passport.constraints.location}</span>
            </div>
            <div>
              <span className="text-[var(--ink-soft)]">{t('passportRelocation')}:</span>{' '}
              <span>{passport.constraints.canRelocate ? t('passportYes') : t('passportNo')}</span>
            </div>
            <div>
              <span className="text-[var(--ink-soft)]">{t('passportLearningHours')}:</span>{' '}
              <span>{passport.constraints.weeklyLearningHours}h</span>
            </div>
            <div>
              <span className="text-[var(--ink-soft)]">{t('passportBudget')}:</span>{' '}
              <span>{passport.constraints.budgetLevel === 'low' ? t('passportBudgetLow') : passport.constraints.budgetLevel === 'medium' ? t('passportBudgetMedium') : t('passportBudgetHigh')}</span>
            </div>
          </div>}
        </div>
      </GuidanceEntrance>
      {validating && <SkillValidationDialog claim={validating} onClose={()=>{sounds.modalClose();setValidating(null)}} onValidate={evidence=>{updatePassport(previous=>{if(!previous)throw new Error('Passport unavailable');const skills=previous.skills.map(claim=>claim.skillId===validating.skillId?addSkillEvidence(claim,evidence):claim);const next={...previous,skills};next.completeness=calculateCompleteness(next);return next});void logProgress(user?.id ?? null,'skill_validated',{skillId:validating.skillId,evidence});sounds.success();hapticSuccess();setValidating(null)}}/>}
      {scoreEvidence && <WhyPanel evidence={scoreEvidence} onClose={()=>setScoreEvidence(null)}/>}
      
      {/* Manual Skill Addition Dialog */}
      {addingManualSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full bg-[var(--paper-raised)] border-2 border-[var(--ink)] p-6 shadow-[var(--shadow-hard)]">
            <h3 className="font-display text-2xl mb-4">Add Skill Manually</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Skill Name</label>
                <input
                  type="text"
                  value={manualSkillName}
                  onChange={(e) => setManualSkillName(e.target.value)}
                  placeholder="e.g. Python Programming, Project Management"
                  className="w-full border border-[var(--ink-faint)] bg-[var(--paper)] p-3 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Proficiency Level ({manualSkillProficiency}/4)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(level => (
                    <button
                      key={level}
                      onClick={() => setManualSkillProficiency(level as Proficiency)}
                      className={`flex-1 border-2 py-3 text-sm font-mono-ui ${
                        level === manualSkillProficiency
                          ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                          : 'border-[var(--ink-faint)] hover:border-[var(--ink)]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[var(--ink-soft)]">
                  1 = Basic · 2 = Intermediate · 3 = Advanced · 4 = Expert
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleAddManualSkill}
                  className="flex-1 bg-[var(--ink)] px-4 py-3 text-sm text-[var(--paper)]"
                >
                  Add Skill
                </button>
                <button
                  onClick={() => {
                    setAddingManualSkill(false);
                    setManualSkillName('');
                    setManualSkillProficiency(2);
                  }}
                  className="flex-1 border-2 border-[var(--ink)] px-4 py-3 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PassportPage;
