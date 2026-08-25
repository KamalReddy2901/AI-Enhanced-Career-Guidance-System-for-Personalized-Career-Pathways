import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { StickFigure } from '../components/StickFigure';
import { useGuidance } from '../context/GuidanceContext';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sounds';
import { hapticLight, hapticSuccess } from '../utils/haptic';
import { GuidanceEntrance } from '../components/guidance/GuidanceEntrance';
import { extractProfileFromResume, type ResumeExtraction } from '../services/ai';
import { confirmSkillClaimProposals, createSkillClaimProposals, matchSkillsToKB, mergeSkillClaims, groupSkillsByCategory, estimateNSQFLevel, extractLiteralResumeSkills, skillClaimName } from '../engine/skillProfile';
import { SkillValidationDialog } from '../components/guidance/SkillValidationDialog';
import { RiasecHexagon } from '../components/guidance/RiasecHexagon';
import { addSkillEvidence, calculateCompleteness } from '../engine/skillProfile';
import type { SkillClaim, SkillClaimProposal, Proficiency } from '../engine/types';
import { logProgress } from '../services/guidanceDb';
import { WhyPanel, type ScoreEvidence } from '../components/guidance/WhyPanel';
import { motion } from 'motion/react';
import { TextReveal } from '../motion/TextReveal';
import { useT } from '../i18n';
import { readResumeText } from '../utils/resumeText';
import { useUndoStack } from '../hooks/useUndoStack';
import { Undo2, Redo2, RotateCcw, Plus, Trash2, Edit2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { LocationAutocomplete } from '../components/form/LocationAutocomplete';
import { SkillDiscoveryChat } from '../components/guidance/SkillDiscoveryChat';

interface PendingResumeReview {
  skills: Array<{ proposal: SkillClaimProposal; included: boolean }>;
  experiences: Array<{ record: ResumeExtraction['experiences'][number]; included: boolean }>;
  education?: { record: NonNullable<ResumeExtraction['education']>; included: boolean };
}

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
  const [pendingResumeReview, setPendingResumeReview] = useState<PendingResumeReview | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
  const [validating, setValidating] = useState<SkillClaim | null>(null);
  const [editingConstraints, setEditingConstraints] = useState(false);
  const [editingSkillProficiency, setEditingSkillProficiency] = useState<string | null>(null);
  const [scoreEvidence, setScoreEvidence] = useState<ScoreEvidence | null>(null);
  const [addingManualSkill, setAddingManualSkill] = useState(false);
  const [manualSkillName, setManualSkillName] = useState('');
  const [manualSkillProficiency, setManualSkillProficiency] = useState<Proficiency>(2);
  const [editingAspiration, setEditingAspiration] = useState(false);
  const [aspirationText, setAspirationText] = useState('');
  const [showSkillDiscovery, setShowSkillDiscovery] = useState(false);
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

    // Exact canonical/alias matches are retained; unresolved text remains a
    // distinct custom skill. Manual entry is always self-attested evidence.
    const { matched } = matchSkillsToKB([{
      name: manualSkillName.trim(),
      proficiency: manualSkillProficiency,
      evidence: 'self-reported',
    }]);

    updatePassport(prev => {
      if (!prev) throw new Error('Passport unavailable');
      undoStack.pushState(prev);
      
      const manualClaims = matched.map(claim => ({
        ...claim,
        evidence: claim.evidence.map(evidence => ({
          ...evidence,
          type: 'self_reported' as const,
          description: `Manually added: ${manualSkillName.trim()}`,
          verificationState: 'self_attested' as const,
        })),
      }));
      const next = { ...prev, skills: mergeSkillClaims(prev.skills, manualClaims) };
      next.completeness = calculateCompleteness(next);
      return next;
    });

    setAddingManualSkill(false);
    setManualSkillName('');
    setManualSkillProficiency(2);
    sounds.success();
    hapticSuccess();
    toast.success('Skill added to passport');
  };

  const handleSkillsDiscovered = (discoveredSkills: SkillClaim[]) => {
    if (discoveredSkills.length === 0) return;

    updatePassport(prev => {
      if (!prev) throw new Error('Passport unavailable');
      undoStack.pushState(prev);
      const confirmedSkills = discoveredSkills.map(claim => ({
        ...claim,
        evidence: claim.evidence.map(evidence => ({
          ...evidence,
          verificationState: 'self_attested' as const,
        })),
      }));
      const next = { ...prev, skills: mergeSkillClaims(prev.skills, confirmedSkills) };
      next.completeness = calculateCompleteness(next);
      return next;
    });

    sounds.success();
    hapticSuccess();
    toast.success(`${discoveredSkills.length} skill${discoveredSkills.length > 1 ? 's' : ''} added to passport`);
    void logProgress(user?.id ?? null, 'skill_discovery_completed', { skillCount: discoveredSkills.length });
  };

  const handleResetResumeData = () => {
    if (!window.confirm('Reset all skills and experiences from resume? This cannot be undone. Your assessment results will be preserved.')) {
      return;
    }

    updatePassport(prev => {
      if (!prev) throw new Error('Passport unavailable');
      undoStack.pushState(prev);
      const next = {
        ...prev,
        skills: [],
        experiences: [],
        education: { level: 'below_10' as const }, // Reset to default
      };
      next.completeness = calculateCompleteness(next);
      return next;
    });

    sounds.success();
    hapticSuccess();
    toast.success('Skills and experiences cleared');
  };

  const handleUpdateAspiration = () => {
    if (!aspirationText.trim()) {
      toast.error('Please enter your aspiration');
      return;
    }

    updatePassport(prev => {
      if (!prev) throw new Error('Passport unavailable');
      undoStack.pushState(prev);
      // Simple theme extraction - split by common separators
      const themes = aspirationText
        .split(/[,;]/)
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0)
        .slice(0, 5);
      
      const next = {
        ...prev,
        aspiration: {
          statement: aspirationText.trim(),
          themes: themes.length > 0 ? themes : [aspirationText.trim().split(' ')[0].toLowerCase()],
          horizonYears: prev.aspiration?.horizonYears || 3,
          dreamOccupationIds: prev.aspiration?.dreamOccupationIds || [],
          entrepreneurialIntent: prev.aspiration?.entrepreneurialIntent || 'none' as const,
          capturedVia: 'form' as const,
        },
      };
      next.completeness = calculateCompleteness(next);
      return next;
    });

    setEditingAspiration(false);
    setAspirationText('');
    sounds.success();
    hapticSuccess();
    toast.success('Aspiration updated');
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
    setPendingResumeReview(null);
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
      setPendingResumeReview({
        skills: createSkillClaimProposals(matched, 'ai_resume_extraction')
          .map(proposal => ({ proposal, included: true })),
        experiences: extracted.experiences
          .filter(e => e.title.trim() && e.years > 0)
          .map(record => ({ record, included: true })),
        education: extracted.education ? { record: extracted.education, included: true } : undefined,
      });
      setExtractProgress({step: 'Review required before saving', current: 5, total: 5});
      setExtractNotice('AI extraction is proposed only. Review and confirm it before anything is added to your Career Passport.');
    } catch (err: unknown) {
      setExtractProgress({step: 'AI unavailable, using fallback...', current: 3, total: 5});
      const literal=extractLiteralResumeSkills(resumeText);
      if(literal.length){
        const {matched,unmatched}=matchSkillsToKB(literal);
        setUnmatchedSkills(unmatched);
        setPendingResumeReview({
          skills: createSkillClaimProposals(matched, 'literal_resume_extraction')
            .map(proposal => ({ proposal, included: true })),
          experiences: [],
        });
        setExtractNotice(`${t('passportAiUnavailable')} ${matched.length}. Review these literal matches before saving.`);
        setExtractProgress({step: 'Review required before saving', current: 5, total: 5});
      } else {
        setExtractError(t('passportParseFailed'));
        setExtractProgress(null);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const confirmResumeReview = () => {
    if (!pendingResumeReview) return;
    const confirmedSkills = confirmSkillClaimProposals(
      pendingResumeReview.skills.filter(item => item.included).map(item => item.proposal),
    );
    const confirmedExperiences = pendingResumeReview.experiences
      .filter(item => item.included)
      .map(item => item.record);
    const confirmedEducation = pendingResumeReview.education?.included
      ? pendingResumeReview.education.record
      : undefined;
    if (confirmedSkills.length === 0 && confirmedExperiences.length === 0 && !confirmedEducation) return;
    updatePassport(prev => {
      if (!prev) throw new Error('Passport unavailable');
      undoStack.pushState(prev);
      const next = {
        ...prev,
        skills: mergeSkillClaims(prev.skills, confirmedSkills),
        experiences: [...prev.experiences, ...confirmedExperiences],
        education: confirmedEducation || prev.education,
      };
      next.completeness = calculateCompleteness(next);
      return next;
    });
    setPendingResumeReview(null);
    setResumeText('');
    setExtractProgress(null);
    setExtractNotice('Resume evidence confirmed and added to your Career Passport.');
    sounds.success();
    hapticSuccess();
  };

  const discardResumeReview = () => {
    setPendingResumeReview(null);
    setUnmatchedSkills([]);
    setExtractProgress(null);
    setExtractNotice('Proposed extraction discarded. No passport evidence was changed.');
  };

  const togglePendingSkill = (index: number) => setPendingResumeReview(current => current ? ({
    ...current,
    skills: current.skills.map((item, itemIndex) => itemIndex === index ? { ...item, included: !item.included } : item),
  }) : current);

  const togglePendingExperience = (index: number) => setPendingResumeReview(current => current ? ({
    ...current,
    experiences: current.experiences.map((item, itemIndex) => itemIndex === index ? { ...item, included: !item.included } : item),
  }) : current);

  const togglePendingEducation = () => setPendingResumeReview(current => current?.education ? ({
    ...current,
    education: { ...current.education, included: !current.education.included },
  }) : current);

  const hasIncludedResumeRecord = Boolean(pendingResumeReview && (
    pendingResumeReview.skills.some(item => item.included)
    || pendingResumeReview.experiences.some(item => item.included)
    || pendingResumeReview.education?.included
  ));

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
        <div className="card-sketch mb-6 bg-[var(--paper-raised)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">{t('passportAddResume')}</h2>
            {(passport.skills.length > 0 || passport.experiences.length > 0) && (
              <button
                onClick={handleResetResumeData}
                className="flex items-center gap-2 border-2 border-[var(--accent-news)] px-3 py-2 text-xs font-mono-ui uppercase text-[var(--accent-news)] hover:bg-[var(--accent-news)] hover:text-[var(--paper)] transition-colors"
              >
                <Trash2 size={14} /> Reset All
              </button>
            )}
          </div>
          <p className="mb-4 text-sm text-[var(--ink-soft)]">
            {t('passportResumeHelp')}
          </p>
          <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" onChange={(event) => void handleResumeFile(event.target.files?.[0])} />
          <button type="button" onClick={() => resumeInputRef.current?.click()} disabled={isExtracting} className="mb-3 min-h-11 border-2 border-[var(--ink)] px-4 font-mono-ui text-xs uppercase disabled:opacity-40 hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors">Upload PDF, DOCX or TXT</button>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder={t('passportResumePlaceholder')}
            className="mb-3 h-32 w-full resize-none rounded-sm border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-3 text-sm focus:border-[var(--ink)] focus:outline-none"
            disabled={isExtracting}
          />
          {extractError && (
            <div className="mb-3 rounded-sm border-2 border-[var(--accent-news)] bg-[var(--paper)] p-3 text-sm">
              {extractError}
            </div>
          )}
          {extractProgress && (
            <div className="mb-3 rounded-sm border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-3">
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
          {pendingResumeReview && (
            <div className="mb-3 border-2 border-[var(--ink)] bg-[var(--paper)] p-4" data-testid="resume-extraction-review">
              <p className="font-semibold">Review proposed resume evidence</p>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                Nothing below is saved yet. Confirmation records your attestation of the extraction; it does not create issuer verification.
              </p>
              {pendingResumeReview.skills.length > 0 && (
                <section className="mt-4" aria-labelledby="resume-review-skills">
                  <h3 id="resume-review-skills" className="font-mono-ui text-xs uppercase">Skills</h3>
                  <div className="mt-2 space-y-3">
                    {pendingResumeReview.skills.map(({ proposal, included }, index) => {
                      const { claim } = proposal;
                      return (
                        <label key={`${claim.skillId}-${index}`} className="block border border-[var(--ink-faint)] p-3 text-xs">
                          <span className="flex items-start gap-2">
                            <input type="checkbox" checked={included} onChange={() => togglePendingSkill(index)} />
                            <span className="font-semibold">Include {skillClaimName(claim)}</span>
                          </span>
                          <dl className="mt-2 grid gap-1 pl-6 text-[var(--ink-soft)]" data-proposed-record="skill">
                            <div><dt className="inline font-semibold">Label: </dt><dd className="inline">{skillClaimName(claim)}</dd></div>
                            <div><dt className="inline font-semibold">Internal identity: </dt><dd className="inline font-mono-ui">{claim.skillId}</dd></div>
                            <div><dt className="inline font-semibold">Proficiency: </dt><dd className="inline">{claim.proficiency}</dd></div>
                            <div><dt className="inline font-semibold">Confidence: </dt><dd className="inline">{Math.round(claim.confidence * 100)}%</dd></div>
                            {claim.evidence.map((evidence, evidenceIndex) => (
                              <div key={`${evidence.observedAt}-${evidenceIndex}`} className="mt-1 border-l-2 border-[var(--ink-faint)] pl-2">
                                <dt className="font-semibold">Evidence {evidenceIndex + 1}</dt>
                                <dd>Source type: {evidence.type}</dd>
                                <dd>Literal detail: {evidence.description}</dd>
                                <dd>Confidence: {Math.round(evidence.confidence * 100)}%</dd>
                                <dd>Observed: {evidence.observedAt}</dd>
                                <dd>Verification after confirmation: self_attested</dd>
                              </div>
                            ))}
                          </dl>
                        </label>
                      );
                    })}
                  </div>
                </section>
              )}
              {pendingResumeReview.experiences.length > 0 && (
                <section className="mt-4" aria-labelledby="resume-review-experience">
                  <h3 id="resume-review-experience" className="font-mono-ui text-xs uppercase">Experience</h3>
                  <div className="mt-2 space-y-3">
                    {pendingResumeReview.experiences.map(({ record, included }, index) => (
                      <label key={`${record.title}-${index}`} className="block border border-[var(--ink-faint)] p-3 text-xs">
                        <span className="flex items-start gap-2">
                          <input type="checkbox" checked={included} onChange={() => togglePendingExperience(index)} />
                          <span className="font-semibold">Include {record.title}</span>
                        </span>
                        <dl className="mt-2 grid gap-1 pl-6 text-[var(--ink-soft)]" data-proposed-record="experience">
                          <div><dt className="inline font-semibold">Title: </dt><dd className="inline">{record.title}</dd></div>
                          <div><dt className="inline font-semibold">Years: </dt><dd className="inline">{record.years}</dd></div>
                          <div><dt className="inline font-semibold">Description: </dt><dd className="inline">{record.description}</dd></div>
                        </dl>
                      </label>
                    ))}
                  </div>
                </section>
              )}
              {pendingResumeReview.education && (
                <section className="mt-4" aria-labelledby="resume-review-education">
                  <h3 id="resume-review-education" className="font-mono-ui text-xs uppercase">Education</h3>
                  <label className="mt-2 block border border-[var(--ink-faint)] p-3 text-xs">
                    <span className="flex items-start gap-2">
                      <input type="checkbox" checked={pendingResumeReview.education.included} onChange={togglePendingEducation} />
                      <span className="font-semibold">Include education record</span>
                    </span>
                    <dl className="mt-2 grid gap-1 pl-6 text-[var(--ink-soft)]" data-proposed-record="education">
                      <div><dt className="inline font-semibold">Level: </dt><dd className="inline">{pendingResumeReview.education.record.level}</dd></div>
                      <div><dt className="inline font-semibold">Field: </dt><dd className="inline">{pendingResumeReview.education.record.field || 'Not provided'}</dd></div>
                    </dl>
                  </label>
                </section>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={confirmResumeReview} disabled={!hasIncludedResumeRecord} className="min-h-11 bg-[var(--ink)] px-4 text-xs uppercase text-[var(--paper)] disabled:opacity-30">Confirm selected and add</button>
                <button type="button" onClick={discardResumeReview} className="min-h-11 border-2 border-[var(--ink)] px-4 text-xs uppercase">Discard</button>
              </div>
            </div>
          )}
          {unmatchedSkills.length > 0 && (
            <div className="mb-3 rounded-sm border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-4">
              <p className="mb-2 font-semibold text-sm">{unmatchedSkills.length} unresolved skill label{unmatchedSkills.length === 1 ? '' : 's'} preserved</p>
              <p className="mb-3 text-xs text-[var(--ink-soft)]">
                These exact labels were not canonicalized. They remain literal custom skills and are not silently treated as knowledge-base equivalents.
              </p>
              <div className="flex flex-wrap gap-2">
                {unmatchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 border border-[var(--ink)] bg-[var(--paper)] px-3 py-1.5 text-xs font-[Inter]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--ink-soft)] italic">
                Unresolved custom skills stay visible as evidence but do not satisfy canonical occupation requirements automatically.
              </p>
            </div>
          )}
          <button
            onClick={handleResumeExtract}
            disabled={!resumeText.trim() || isExtracting || Boolean(pendingResumeReview)}
            className="bg-[var(--ink)] px-6 py-2 text-sm text-[var(--paper)] transition-opacity disabled:opacity-30 hover:shadow-lg"
          >
            {isExtracting ? t('passportExtracting') : t('passportExtract')}
          </button>
        </div>

        {/* Skills */}
        <div className="card-sketch mb-6 bg-[var(--paper-raised)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">{t('passportSkills')}</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowSkillDiscovery(true)}
                className="flex items-center gap-2 border-2 border-[var(--accent-news)] px-3 py-2 text-xs font-mono-ui uppercase text-[var(--accent-news)] transition-colors hover:bg-[var(--accent-news)] hover:text-[var(--paper)]"
                title="Discover skills through AI conversation"
              >
                <Sparkles size={14} aria-hidden="true" /> Discover
              </button>
              <button
                onClick={() => setAddingManualSkill(true)}
                className="flex items-center gap-2 border-2 border-[var(--ink)] px-3 py-2 text-xs font-mono-ui uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
              >
                <Plus size={14} aria-hidden="true" /> Add skill
              </button>
            </div>
          </div>
          {passport.skills.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">{t('passportNoSkills')}</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSkills).map(([category, claims]) => (
                <div key={category}>
                  <h3 className="label-caps mb-3 text-[var(--ink-soft)] bg-[var(--paper)] inline-block px-2 py-1 rounded">
                    {category}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {claims.map(claim => {
                      const skillName = skillClaimName(claim);
                      
                      return (
                        <motion.div 
                          key={claim.skillId}
                          className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-4 transition-colors hover:border-[var(--ink)] hover:shadow-md"
                          whileHover={{ y: -2 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate" title={skillName}>{skillName}</div>
                              <div className="flex items-center gap-3 mt-2">
                                {editingSkillProficiency === claim.skillId ? (
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(level => (
                                      <button
                                        key={level}
                                        onClick={() => handleSkillProficiencyChange(claim.skillId, level as Proficiency)}
                                        className={`w-7 h-7 rounded-full border-2 text-xs font-bold transition-all ${
                                          level <= claim.proficiency 
                                            ? 'bg-[var(--ink)] border-[var(--ink)] text-[var(--paper)] scale-110' 
                                            : 'border-[var(--ink-faint)] hover:border-[var(--ink)]'
                                        }`}
                                      >
                                        {level}
                                      </button>
                                    ))}
                                    <button
                                      onClick={() => setEditingSkillProficiency(null)}
                                      className="ml-2 text-xs underline hover:no-underline"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        sounds.click();
                                        hapticLight();
                                        setEditingSkillProficiency(claim.skillId);
                                      }}
                                      className="flex gap-1 group"
                                      title="Click to edit proficiency"
                                    >
                                      {[1, 2, 3, 4].map(level => (
                                        <motion.div
                                          key={level}
                                          className={`w-2.5 h-2.5 rounded-full ${
                                            level <= claim.proficiency ? 'bg-[var(--ink)]' : 'bg-[var(--ink-faint)]'
                                          }`}
                                          whileHover={{ scale: 1.4, boxShadow: '0 0 8px rgba(0,0,0,0.3)' }}
                                          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                        />
                                      ))}
                                    </button>
                                    <span className="font-mono-ui text-[10px] text-[var(--ink-soft)]">
                                      {claim.confidence < 0.7 ? t('passportUnverified') : `${Math.round(claim.confidence * 100)}%`}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <button 
                                onClick={() => {
                                  sounds.click();
                                  hapticLight();
                                  setExpandedEvidence(expandedEvidence===claim.skillId?null:claim.skillId);
                                }} 
                                className="text-[10px] font-mono-ui text-[var(--ink-soft)] underline hover:text-[var(--ink)] whitespace-nowrap"
                              >
                                {claim.evidence.length} {t('passportEvidence')}
                              </button>
                              <button 
                                onClick={()=>{
                                  sounds.modalOpen();
                                  hapticLight();
                                  setValidating(claim);
                                }} 
                                className="border border-[var(--ink-faint)] px-2 py-1 text-[10px] font-mono-ui hover:border-[var(--ink)] whitespace-nowrap"
                              >
                                {t('passportValidate')}
                              </button>
                            </div>
                          </div>
                          {expandedEvidence === claim.skillId && (
                            <motion.div 
                              initial={{height: 0, opacity: 0}}
                              animate={{height: 'auto', opacity: 1}}
                              exit={{height: 0, opacity: 0}}
                              className="mt-3 space-y-2 border-t-2 border-[var(--ink-faint)] pt-3"
                            >
                              {claim.evidence.map((evidence,index)=>(
                                <div key={`${evidence.observedAt}-${index}`} className="text-xs bg-[var(--paper-raised)] p-2 rounded">
                                  <span className="font-mono-ui uppercase text-[var(--ink-soft)] block mb-1">
                                    {evidence.type} · {Math.round(evidence.confidence*100)}%
                                  </span>
                                  <p className="text-[var(--ink-soft)]">{evidence.description}</p>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Experiences */}
        <div className="card-sketch mb-6 bg-[var(--paper-raised)] p-6">
          <h2 className="font-display mb-4 text-2xl">{t('passportExperiences')}</h2>
          {passport.experiences.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">{t('passportNoExperiences')}</p>
          ) : (
            <div className="relative pl-8 space-y-6">
              {/* Timeline line */}
              <div className="absolute left-2 top-3 bottom-3 w-0.5 bg-[var(--ink-faint)]" />
              
              {passport.experiences
                .sort((a, b) => b.years - a.years)
                .map((exp, idx) => (
                  <motion.div 
                    key={idx} 
                    className="relative"
                    initial={{opacity: 0, x: -20}}
                    animate={{opacity: 1, x: 0}}
                    transition={{delay: idx * 0.1}}
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[26px] top-2 w-3 h-3 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)]" />
                    
                    <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-4 hover:border-[var(--ink)] hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-base font-semibold">{exp.title}</div>
                          <div className="font-mono-ui mt-1 flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                            <span className="bg-[var(--ink)] text-[var(--paper)] px-2 py-0.5 rounded">
                              {exp.years} {exp.years === 1 ? t('passportYear') : t('passportYears')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {exp.description && (
                        <p className="mt-3 text-sm text-[var(--ink-soft)] leading-relaxed border-l-2 border-[var(--ink-faint)] pl-3">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </div>

        {/* Assessments */}
        <div className="card-sketch mb-6 bg-[var(--paper-raised)] p-6">
          <h2 className="font-display mb-4 text-2xl">{t('passportAssessmentResults')}</h2>
          <div className="space-y-4">
            {passport.riasec ? (
              <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-semibold">{t('passportRiasecProfile')}</div>
                  <button
                    onClick={() => handleRetakeAssessment('riasec')}
                    className="flex items-center gap-1 text-xs font-mono-ui uppercase text-[var(--ink-soft)] hover:text-[var(--ink)] underline hover:no-underline"
                  >
                    <RotateCcw size={12} /> Retake
                  </button>
                </div>
                <div className="mb-4">
                  <RiasecHexagon scores={passport.riasec} compact />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(passport.riasec)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, val]) => (
                      <button 
                        key={key} 
                        className="flex items-center justify-between p-3 border-2 border-[var(--ink-faint)] bg-[var(--paper-raised)] hover:border-[var(--ink)] hover:shadow-md transition-all rounded group"
                        onClick={()=>setScoreEvidence({
                          title:`${t('passportWhyScore')} ${key} — ${val}`,
                          eyebrow:t('passportInterestEvidence'),
                          summary:t('passportInterestSummary'),
                          method:t('passportInterestMethod'),
                          items:[{label:`${t('passportSavedScore')} ${key}`,value:val,detail:t('passportInterestDetail')}],
                          source:t('passportInterestSource')
                        })}
                      >
                        <span className="font-mono-ui text-sm font-bold text-[var(--ink-soft)] group-hover:text-[var(--ink)]">
                          {key.toUpperCase()}
                        </span>
                        <span className="font-display text-2xl font-bold">{val}</span>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-4 text-center">
                <p className="mb-2 text-sm text-[var(--ink-soft)]">{t('passportNoInterest')}</p>
                <button
                  onClick={() => navigate('/assess/interests')}
                  className="text-sm font-semibold hover:underline"
                >
                  {t('passportTakeAssessment')} →
                </button>
              </div>
            )}

            {passport.aptitude ? (
              <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-semibold">{t('passportAptitudeScores')}</div>
                  <button
                    onClick={() => handleRetakeAssessment('aptitude')}
                    className="flex items-center gap-1 text-xs font-mono-ui uppercase text-[var(--ink-soft)] hover:text-[var(--ink)] underline hover:no-underline"
                  >
                    <RotateCcw size={12} /> Retake
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(passport.aptitude)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, val]) => (
                      <button 
                        key={key} 
                        className="flex flex-col items-center p-3 border-2 border-[var(--ink-faint)] bg-[var(--paper-raised)] hover:border-[var(--ink)] hover:shadow-md transition-all rounded group"
                        onClick={()=>setScoreEvidence({
                          title:`${t('passportWhyScore')} ${key} — ${val}`,
                          eyebrow:t('passportAptitudeEvidence'),
                          summary:t('passportAptitudeSummary'),
                          method:t('passportAptitudeMethod'),
                          items:[{label:`${t('passportSavedScore')} ${key}`,value:val,detail:t('passportAptitudeDetail')}],
                          source:t('passportAptitudeSource')
                        })}
                      >
                        <span className="font-display text-2xl font-bold mb-1">{val}</span>
                        <span className="font-mono-ui text-[10px] uppercase tracking-wide text-[var(--ink-soft)] group-hover:text-[var(--ink)]">
                          {key}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-4 text-center">
                <p className="mb-2 text-sm text-[var(--ink-soft)]">{t('passportNoAptitude')}</p>
                <button
                  onClick={() => navigate('/assess/aptitude')}
                  className="text-sm font-semibold hover:underline"
                >
                  {t('passportTakeAssessment')} →
                </button>
              </div>
            )}

            {passport.values ? (
              <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-semibold">{t('passportWorkValues')}</div>
                  <button
                    onClick={() => handleRetakeAssessment('values')}
                    className="flex items-center gap-1 text-xs font-mono-ui uppercase text-[var(--ink-soft)] hover:text-[var(--ink)] underline hover:no-underline"
                  >
                    <RotateCcw size={12} /> Retake
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(passport.values)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, val], idx) => (
                      <button 
                        key={key} 
                        className="flex items-center justify-between w-full p-3 border-2 border-[var(--ink-faint)] bg-[var(--paper-raised)] hover:border-[var(--ink)] hover:shadow-md transition-all rounded group"
                        onClick={()=>setScoreEvidence({
                          title:`${t('passportWhyScore')} ${key} — ${val}`,
                          eyebrow:t('passportValuesEvidence'),
                          summary:t('passportValuesSummary'),
                          method:t('passportValuesMethod'),
                          items:[{label:`${t('passportSavedScore')} ${key}`,value:val,detail:t('passportValuesDetail')}],
                          source:t('passportValuesSource')
                        })}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono-ui text-xs text-[var(--ink-soft)] w-5">#{idx + 1}</span>
                          <span className="font-semibold text-sm capitalize group-hover:text-[var(--ink)]">{key}</span>
                        </div>
                        <span className="font-display text-xl font-bold">{val}</span>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-4 text-center">
                <p className="mb-2 text-sm text-[var(--ink-soft)]">{t('passportNoValues')}</p>
                <button
                  onClick={() => navigate('/assess/values')}
                  className="text-sm font-semibold hover:underline"
                >
                  {t('passportTakeAssessment')} →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Aspiration */}
        {passport.aspiration && (
          <div className="card-sketch mb-6 bg-[var(--paper-raised)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl">{t('passportAspiration')}</h2>
              <button
                onClick={() => {
                  setEditingAspiration(true);
                  setAspirationText(passport.aspiration?.statement || '');
                }}
                className="flex items-center gap-2 border-2 border-[var(--ink)] px-3 py-2 text-xs font-mono-ui uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
              >
                <Edit2 size={14} /> Update
              </button>
            </div>
            <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-4">
              <p className="mb-3 text-sm leading-relaxed italic">&ldquo;{passport.aspiration.statement}&rdquo;</p>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--ink-faint)]">
                {passport.aspiration.themes.map(theme => (
                  <span key={theme} className="rounded-full border-2 border-[var(--ink-faint)] bg-[var(--paper-raised)] px-3 py-1 text-xs font-semibold">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Constraints */}
        <div className="card-sketch bg-[var(--paper-raised)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">{t('passportConstraints')}</h2>
            <button 
              onClick={()=>setEditingConstraints(value=>!value)} 
              className="min-h-11 border-2 border-[var(--ink)] px-4 py-2 text-xs font-mono-ui uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
            >
              {editingConstraints?t('passportDone'):t('passportEdit')}
            </button>
          </div>
          {editingConstraints ? (
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold mb-2 block">{t('passportLocation')}</span>
                <LocationAutocomplete
                  value={passport.constraints.location}
                  onChange={value=>updatePassport(previous=>{if(!previous)throw new Error('Passport unavailable');return {...previous,constraints:{...previous.constraints,location:value}}})}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold mb-2 block">{t('passportLearningHours')}</span>
                <input 
                  type="number" 
                  min="1" 
                  max="40" 
                  value={passport.constraints.weeklyLearningHours} 
                  onChange={event=>updatePassport(previous=>{if(!previous)throw new Error('Passport unavailable');return {...previous,constraints:{...previous.constraints,weeklyLearningHours:Number(event.target.value)}}})} 
                  className="mt-1 min-h-11 w-full border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-2 focus:border-[var(--ink)] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold mb-2 block">{t('passportBudget')}</span>
                <select 
                  value={passport.constraints.budgetLevel} 
                  onChange={event=>updatePassport(previous=>{if(!previous)throw new Error('Passport unavailable');return {...previous,constraints:{...previous.constraints,budgetLevel:event.target.value as 'low'|'medium'|'high'}}})} 
                  className="mt-1 min-h-11 w-full border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-2 focus:border-[var(--ink)] focus:outline-none"
                >
                  <option value="low">{t('passportBudgetLow')}</option>
                  <option value="medium">{t('passportBudgetMedium')}</option>
                  <option value="high">{t('passportBudgetHigh')}</option>
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-2 p-2 border-2 border-[var(--ink-faint)] bg-[var(--paper)] rounded cursor-pointer hover:border-[var(--ink)]">
                <input 
                  type="checkbox" 
                  checked={passport.constraints.canRelocate} 
                  onChange={event=>updatePassport(previous=>{if(!previous)throw new Error('Passport unavailable');return {...previous,constraints:{...previous.constraints,canRelocate:event.target.checked}}})}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('passportCanRelocate')}</span>
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-4">
                <span className="text-xs font-mono-ui uppercase text-[var(--ink-soft)] block mb-1">{t('passportLocation')}</span>
                <span className="text-sm font-semibold">{passport.constraints.location}</span>
              </div>
              <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-4">
                <span className="text-xs font-mono-ui uppercase text-[var(--ink-soft)] block mb-1">{t('passportRelocation')}</span>
                <span className="text-sm font-semibold">{passport.constraints.canRelocate ? t('passportYes') : t('passportNo')}</span>
              </div>
              <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-4">
                <span className="text-xs font-mono-ui uppercase text-[var(--ink-soft)] block mb-1">{t('passportLearningHours')}</span>
                <span className="text-sm font-semibold">{passport.constraints.weeklyLearningHours}h / week</span>
              </div>
              <div className="rounded border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-4">
                <span className="text-xs font-mono-ui uppercase text-[var(--ink-soft)] block mb-1">{t('passportBudget')}</span>
                <span className="text-sm font-semibold capitalize">
                  {passport.constraints.budgetLevel === 'low' ? t('passportBudgetLow') : passport.constraints.budgetLevel === 'medium' ? t('passportBudgetMedium') : t('passportBudgetHigh')}
                </span>
              </div>
            </div>
          )}
        </div>
      </GuidanceEntrance>
      {validating && <SkillValidationDialog claim={validating} onClose={()=>{sounds.modalClose();setValidating(null)}} onValidate={evidence=>{updatePassport(previous=>{if(!previous)throw new Error('Passport unavailable');const skills=previous.skills.map(claim=>claim.skillId===validating.skillId?addSkillEvidence(claim,evidence):claim);const next={...previous,skills};next.completeness=calculateCompleteness(next);return next});void logProgress(user?.id ?? null,'skill_validated',{skillId:validating.skillId,evidence});sounds.success();hapticSuccess();setValidating(null)}}/>}
      {scoreEvidence && <WhyPanel evidence={scoreEvidence} onClose={()=>setScoreEvidence(null)}/>}
      
      {/* Aspiration Update Dialog */}
      {editingAspiration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-lg w-full bg-[var(--paper-raised)] border-2 border-[var(--ink)] p-6 shadow-[var(--shadow-hard)]">
            <h3 className="font-display text-2xl mb-4">Update Your Aspiration</h3>
            <p className="text-sm text-[var(--ink-soft)] mb-4">
              Describe your career goals, what you want to achieve, and the themes that matter to you. 
              Separate themes with commas.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Your Aspiration Statement</label>
                <textarea
                  value={aspirationText}
                  onChange={(e) => setAspirationText(e.target.value)}
                  placeholder="e.g., I want to transition into data science, work with AI, and contribute to meaningful projects"
                  className="w-full border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-3 text-sm h-32 resize-none focus:border-[var(--ink)] focus:outline-none"
                  autoFocus
                />
                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                  Themes will be automatically extracted from your statement
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdateAspiration}
                  className="flex-1 bg-[var(--ink)] px-4 py-3 text-sm text-[var(--paper)] hover:shadow-lg transition-shadow"
                >
                  Update Aspiration
                </button>
                <button
                  onClick={() => {
                    setEditingAspiration(false);
                    setAspirationText('');
                  }}
                  className="flex-1 border-2 border-[var(--ink)] px-4 py-3 text-sm hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
                  className="w-full border-2 border-[var(--ink-faint)] bg-[var(--paper)] p-3 text-sm focus:border-[var(--ink)] focus:outline-none"
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
                      className={`flex-1 border-2 py-3 text-sm font-mono-ui transition-colors ${
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
                  className="flex-1 bg-[var(--ink)] px-4 py-3 text-sm text-[var(--paper)] hover:shadow-lg transition-shadow"
                >
                  Add Skill
                </button>
                <button
                  onClick={() => {
                    setAddingManualSkill(false);
                    setManualSkillName('');
                    setManualSkillProficiency(2);
                  }}
                  className="flex-1 border-2 border-[var(--ink)] px-4 py-3 text-sm hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skill Discovery Chat */}
      {showSkillDiscovery && passport && (
        <SkillDiscoveryChat
          onClose={() => setShowSkillDiscovery(false)}
          onSkillsDiscovered={handleSkillsDiscovered}
          passport={passport}
        />
      )}
    </div>
  );
}

export default PassportPage;
