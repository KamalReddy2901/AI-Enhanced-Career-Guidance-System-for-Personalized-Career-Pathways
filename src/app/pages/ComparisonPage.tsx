import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ArrowRight, X, Scale, Loader2, Download, Share2, Search, Sparkles, Pencil, Zap } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { AskAIPanel } from '../components/AskAIPanel';
import { useApp } from '../context/AppContext';
import type { JobData } from '../data/jobs';
import {
  getWorkLifeBalance, getLearnMoreResources, getInterviewDifficulty, getGrowthOutlook,
  getJobSuggestions, getQuickDescription, getComparisonInsight,
  type WorkLifeBalance, type LearnMoreResources, type InterviewDifficulty,
} from '../services/ai';
import { downloadComparisonPDF } from '../utils/pdfExport';
import { toast } from 'sonner';
import { sounds } from '../utils/sounds';
import { TextReveal } from '../motion/TextReveal';
import { EvidenceButton } from '../components/guidance/EvidenceButton';
import { hapticLight } from '../utils/haptic';
import { useT } from '../i18n';

function WinnerCircle() {
  return <svg className="pointer-events-none absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)] text-[var(--accent-news)]" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="100" cy="40" rx="94" ry="34" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}

function CareerSlot({
  slot,
  job,
  isLoading,
  onClear,
  onOpen,
}: {
  slot: number;
  job: JobData | null;
  isLoading: boolean;
  onClear: () => void;
  onOpen: () => void;
}) {
  const { lang } = useT();
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: slot * 0.1 }}>
      {isLoading ? (
        <div className="border-2 border-dashed border-black/15 p-8 text-center">
          <Loader2 size={24} className="animate-spin text-black/30 mx-auto mb-2" />
          <p className="font-[Inter] text-black/30" style={{ fontSize: '0.82rem' }}>Loading...</p>
        </div>
      ) : job ? (
        <div className="border-2 border-black/20 p-6 relative">
          <button
            onClick={onClear}
            className="absolute top-3 right-3 text-black/20 hover:text-black transition-colors"
          >
            <X size={16} />
          </button>
          <h3 className="font-[Playfair_Display] text-black mb-1 pr-6" style={{ fontSize: '1.2rem' }}>
            {job.title}
          </h3>
          <span className="font-[Inter] text-black/40" style={{ fontSize: '0.72rem' }}>{job.category}</span>
          <p className="font-[Inter] text-black/50 mt-2" style={{ fontSize: '0.82rem' }}>{job.avgSalary}</p>
          <EvidenceButton testId={`comparison-career-${slot === 0 ? 'a' : 'b'}-why-btn`} label={lang === 'hi' ? 'ये संख्याएँ क्यों?' : lang === 'te' ? 'ఈ సంఖ్యలు ఎందుకు?' : 'Why these numbers?'} evidence={{title:lang === 'hi' ? `${job.title} के प्रमाण` : lang === 'te' ? `${job.title} ఆధారం` : `${job.title} evidence`,eyebrow:lang === 'hi' ? 'तुलना आयाम' : lang === 'te' ? 'పోలిక కొలతలు' : 'Comparison dimensions',summary:lang === 'hi' ? 'यह कॉलम चुने गए करियर डॉसियर के दर्ज मान दिखाता है; नया मिलान अंक नहीं बनता।' : lang === 'te' ? 'ఈ కాలమ్ ఎంచుకున్న కెరీర్ డోసియర్ విలువలను చూపుతుంది; కొత్త మ్యాచ్ స్కోర్ రూపొందదు.' : 'This column shows recorded values from the selected career dossier; it does not create a new match score.',method:lang === 'hi' ? 'वेतन, श्रेणी, कौशल और शिक्षा को उसी डॉसियर से साथ-साथ रखा जाता है।' : lang === 'te' ? 'జీతం, వర్గం, నైపుణ్యాలు, విద్య అదే డోసియర్ నుండి పక్కపక్కన ఉంచబడతాయి.' : 'Salary, category, skills, and education are placed side by side from the same dossier.',items:[{label:lang === 'hi' ? 'श्रेणी' : lang === 'te' ? 'వర్గం' : 'Category',detail:job.category},{label:lang === 'hi' ? 'औसत वेतन' : lang === 'te' ? 'సగటు జీతం' : 'Average salary',detail:job.avgSalary},{label:lang === 'hi' ? 'मुख्य कौशल' : lang === 'te' ? 'ముఖ్య నైపుణ్యాలు' : 'Key skills',detail:job.skills.slice(0,5).join(' · ')}],source:lang === 'hi' ? 'चुना गया करियर डॉसियर · कोई नया अंक नहीं' : lang === 'te' ? 'ఎంచుకున్న కెరీర్ డోసియర్ · కొత్త స్కోర్ లేదు' : 'Selected career dossier · no new score'}} />
        </div>
      ) : (
        <button
          onClick={onOpen}
          className="w-full border-2 border-dashed border-black/15 p-8 text-center hover:border-black/30 transition-colors"
        >
          <p className="font-[Playfair_Display] text-black/30 mb-1" style={{ fontSize: '1.1rem' }}>
            {slot === 0 ? 'Career A' : 'Career B'}
          </p>
          <p className="font-[Inter] text-black/25" style={{ fontSize: '0.75rem' }}>
            Click to select
          </p>
        </button>
      )}
    </motion.div>
  );
}

export function ComparisonPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { history, comparisonJobs, setComparisonJob, searchJobAI, addToHistory } = useApp();
  const [showPicker, setShowPicker] = useState<0 | 1 | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [loadingSlot, setLoadingSlot] = useState<0 | 1 | null>(null);
  const [wlbA, setWlbA] = useState<WorkLifeBalance | null>(null);
  const [wlbB, setWlbB] = useState<WorkLifeBalance | null>(null);
  const [learnMoreA, setLearnMoreA] = useState<LearnMoreResources | null>(null);
  const [learnMoreB, setLearnMoreB] = useState<LearnMoreResources | null>(null);
  const [wlbLoading, setWlbLoading] = useState(false);
  const [learnLoading, setLearnLoading] = useState(false);
  const [diffA, setDiffA] = useState<InterviewDifficulty | null>(null);
  const [diffB, setDiffB] = useState<InterviewDifficulty | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [growthA, setGrowthA] = useState<string | null>(null);
  const [growthB, setGrowthB] = useState<string | null>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  // Preliminary descriptions
  const [descA, setDescA] = useState('');
  const [descB, setDescB] = useState('');
  const [descALoading, setDescALoading] = useState(false);
  const [descBLoading, setDescBLoading] = useState(false);
  // Gated detailed comparison
  const [compareTriggered, setCompareTriggered] = useState(false);
  const [insight, setInsight] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  // AI suggestions for compare search
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  // Separate compare history
  const [compareHistory, setCompareHistory] = useState<Array<{ a: string; b: string; timestamp: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('cs_compare_history') || '[]'); } catch { return []; }
  });
  const [showCompareHistory, setShowCompareHistory] = useState(false);

  const [jobA, jobB] = comparisonJobs;

  // Load careers from URL params (shared link)
  useEffect(() => {
    const paramA = searchParams.get('a');
    const paramB = searchParams.get('b');
    if (paramA && !comparisonJobs[0]) {
      setLoadingSlot(0);
      searchJobAI(paramA)
        .then(job => { setComparisonJob(0, job); addToHistory(job); })
        .catch((err) => {
          toast.error(`Failed to load "${paramA}"`);
        })
        .finally(() => setLoadingSlot(prev => prev === 0 ? null : prev));
    }
    if (paramB && !comparisonJobs[1]) {
      setLoadingSlot(prev => prev === null ? 1 : prev);
      searchJobAI(paramB)
        .then(job => { setComparisonJob(1, job); addToHistory(job); })
        .catch((err) => {
          toast.error(`Failed to load "${paramB}"`);
        })
        .finally(() => setLoadingSlot(prev => prev === 1 ? null : prev));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to compare history when both jobs are set
  useEffect(() => {
    if (jobA && jobB) {
      setCompareHistory(prev => {
        const filtered = prev.filter(h => !(h.a === jobA.title && h.b === jobB.title));
        const updated = [{ a: jobA.title, b: jobB.title, timestamp: Date.now() }, ...filtered].slice(0, 10);
        localStorage.setItem('cs_compare_history', JSON.stringify(updated));
        return updated;
      });
    }
  }, [jobA?.title, jobB?.title]);

  // AI suggestions for search input
  useEffect(() => {
    if (!customTitle.trim() || customTitle.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setFetchingSuggestions(true);
      try {
        const results = await getJobSuggestions(customTitle.trim());
        setSuggestions(results);
      } catch { setSuggestions([]); }
      finally { setFetchingSuggestions(false); }
    }, 350);
    return () => { clearTimeout(timeout); setFetchingSuggestions(false); };
  }, [customTitle]);

  // Auto-fetch description for Career A when jobA changes
  useEffect(() => {
    if (!jobA) { setDescA(''); return; }
    setCompareTriggered(false); setInsight('');
    setWlbA(null); setWlbB(null); setLearnMoreA(null); setLearnMoreB(null);
    setDiffA(null); setDiffB(null); setGrowthA(null); setGrowthB(null);
    setDescALoading(true); setDescA('');
    getQuickDescription(jobA.title)
      .then(d => setDescA(d))
      .catch(() => {})
      .finally(() => setDescALoading(false));
  }, [jobA?.title]);

  // Auto-fetch description for Career B when jobB changes
  useEffect(() => {
    if (!jobB) { setDescB(''); return; }
    setCompareTriggered(false); setInsight('');
    setWlbA(null); setWlbB(null); setLearnMoreA(null); setLearnMoreB(null);
    setDiffA(null); setDiffB(null); setGrowthA(null); setGrowthB(null);
    setDescBLoading(true); setDescB('');
    getQuickDescription(jobB.title)
      .then(d => setDescB(d))
      .catch(() => {})
      .finally(() => setDescBLoading(false));
  }, [jobB?.title]);

  // handleCompare — explicitly triggered by button
  const handleCompare = useCallback(async () => {
    if (!jobA || !jobB) return;
    setCompareLoading(true);
    try {
      const ins = await getComparisonInsight(jobA.title, descA, jobB.title, descB);
      setInsight(ins);
      setCompareTriggered(true);
      // Now load all free enrichments in parallel
      setWlbLoading(true);
      Promise.all([getWorkLifeBalance(jobA.title), getWorkLifeBalance(jobB.title)])
        .then(([a, b]) => { setWlbA(a); setWlbB(b); })
        .catch(() => {})
        .finally(() => setWlbLoading(false));
      setLearnLoading(true);
      Promise.all([getLearnMoreResources(jobA.title), getLearnMoreResources(jobB.title)])
        .then(([a, b]) => { setLearnMoreA(a); setLearnMoreB(b); })
        .catch(() => {})
        .finally(() => setLearnLoading(false));
      setDiffLoading(true);
      Promise.all([getInterviewDifficulty(jobA.title), getInterviewDifficulty(jobB.title)])
        .then(([a, b]) => { setDiffA(a); setDiffB(b); })
        .catch(() => {})
        .finally(() => setDiffLoading(false));
      setGrowthLoading(true);
      Promise.all([getGrowthOutlook(jobA.title), getGrowthOutlook(jobB.title)])
        .then(([a, b]) => { setGrowthA(a); setGrowthB(b); })
        .catch(() => {})
        .finally(() => setGrowthLoading(false));
    } catch (err) {
      toast.error('Failed to run comparison — please try again.');
    } finally {
      setCompareLoading(false);
    }
  }, [jobA, jobB, descA, descB]);

  const handleShare = () => {
    const params = new URLSearchParams();
    if (jobA) params.set('a', jobA.title);
    if (jobB) params.set('b', jobB.title);
    const url = `${window.location.origin}/compare?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Compare link copied!', { description: 'Share this link to show the same comparison' });
    }).catch(() => toast.error('Could not copy link'));
  };

  const handleDownloadPDF = () => {
    if (!jobA || !jobB) return;
    downloadComparisonPDF(jobA, jobB, { wlbA, wlbB, learnMoreA, learnMoreB });
    sounds.download();
    toast.success('Downloading comparison PDF…');
  };

  const handlePickFromHistory = (entry: { jobData: JobData }, slot: 0 | 1) => {
    setComparisonJob(slot, entry.jobData);
    setShowPicker(null);
  };

  const handleCustomSearch = async (slot: 0 | 1) => {
    if (!customTitle.trim()) return;
    setLoadingSlot(slot);
    setShowPicker(null);
    try {
      const jobData = await searchJobAI(customTitle.trim());
      setComparisonJob(slot, jobData);
      addToHistory(jobData);
      sounds.addCompare();
      setCustomTitle('');
    } catch (err) {
      toast.error('Failed to load career');
    } finally {
      setLoadingSlot(null);
    }
  };

  const CompareRow = ({ label, valueA, valueB, winner }: { label: string; valueA: React.ReactNode; valueB: React.ReactNode; winner?:'a'|'b' }) => (
    <div className="grid grid-cols-[1fr_100px_1fr] gap-0 border-b border-[var(--ink)]/20 last:border-b-0">
      <div className="font-mono-ui relative p-4 text-sm text-[var(--ink-soft)]">{valueA}{winner==='a'&&<WinnerCircle/>}</div>
      <div className="flex items-center justify-center border-x border-[var(--ink)]/20 p-4">
        <span className="label-caps text-center">{label}</span>
      </div>
      <div className="font-mono-ui relative p-4 text-sm text-[var(--ink-soft)]">{valueB}{winner==='b'&&<WinnerCircle/>}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--paper)] pb-16 pt-20">
      <div className="max-w-5xl mx-auto px-6">
        {/* Back */}
        <motion.button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter]"
          style={{ fontSize: '0.82rem' }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ChevronLeft size={16} />
          Home
        </motion.button>

        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <StickFigure pose="reading" size={56} animate={false} />
            <Scale size={28} className="text-black/30" />
            <StickFigure pose="thinking" size={56} animate={false} />
          </div>
          <h1 className="font-display mb-2 text-5xl leading-[1.05] tracking-tighter text-[var(--ink)] md:text-6xl"><TextReveal text="Career Comparison" /></h1>
          <p className="font-[Inter] text-black/40" style={{ fontSize: '0.85rem' }}>
            Compare two careers side by side
          </p>
          {compareHistory.length > 0 && (
            <button
              onClick={() => setShowCompareHistory(true)}
              className="mt-3 inline-flex items-center gap-1.5 font-[Inter] text-black/35 hover:text-black/60 border border-black/10 px-3 py-1.5 hover:border-black/25 transition-[color,background-color,border-color,opacity,transform,box-shadow] mx-auto"
              style={{ fontSize: '0.72rem' }}
            >
              <Scale size={11} />
              Recent Comparisons ({compareHistory.length})
            </button>
          )}
        </motion.div>

        {/* Selection Cards - explicit order so "vs" sits between the two */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] gap-4 mb-10 items-center">
          {/* Career A */}
          <CareerSlot
            slot={0}
            job={comparisonJobs[0]}
            isLoading={loadingSlot === 0}
            onClear={() => { hapticLight(); setComparisonJob(0, null); }}
            onOpen={() => { setShowPicker(0); setCustomTitle(''); }}
          />

          {/* VS divider */}
          <div className="hidden md:flex items-center justify-center">
            <span className="font-[Playfair_Display] text-black/20 italic" style={{ fontSize: '1.4rem' }}>vs</span>
          </div>

          {/* Career B */}
          <CareerSlot
            slot={1}
            job={comparisonJobs[1]}
            isLoading={loadingSlot === 1}
            onClear={() => { hapticLight(); setComparisonJob(1, null); }}
            onOpen={() => { setShowPicker(1); setCustomTitle(''); }}
          />
        </div>

        {/* Preliminary Descriptions + Compare CTA */}
        <AnimatePresence>
          {(jobA || jobB) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-black/10 p-5 mb-6 bg-card"
            >
              <p className="font-[Inter] text-black/35 uppercase tracking-[0.1em] mb-4 flex items-center gap-1.5" style={{ fontSize: '0.6rem' }}>
                <Pencil size={9} className="opacity-60" />
                Your context <span className="normal-case tracking-normal text-black/25">(edit to tailor the comparison to your exact idea of each role)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* Description A */}
                <div>
                  <label className="block font-[Inter] text-black/30 mb-1.5" style={{ fontSize: '0.68rem' }}>
                    {jobA?.title || 'Career A'}
                  </label>
                  <div className="relative">
                    <textarea
                      value={descA}
                      onChange={e => setDescA(e.target.value)}
                      placeholder={descALoading ? 'Auto-generating…' : jobA ? 'Describe your specific interpretation…' : 'Select Career A first'}
                      rows={3}
                      disabled={descALoading || !jobA}
                      className="w-full border border-black/10 bg-transparent px-3 py-2 font-[Inter] text-black/70 placeholder:text-black/20 outline-none focus:border-black/30 transition-colors resize-none disabled:opacity-40 pr-6"
                      style={{ fontSize: '0.83rem' }}
                    />
                    {descALoading && <Loader2 size={11} className="animate-spin text-black/25 absolute top-2.5 right-2" />}
                  </div>
                </div>
                {/* Description B */}
                <div>
                  <label className="block font-[Inter] text-black/30 mb-1.5" style={{ fontSize: '0.68rem' }}>
                    {jobB?.title || 'Career B'}
                  </label>
                  <div className="relative">
                    <textarea
                      value={descB}
                      onChange={e => setDescB(e.target.value)}
                      placeholder={descBLoading ? 'Auto-generating…' : jobB ? 'Describe your specific interpretation…' : 'Select Career B first'}
                      rows={3}
                      disabled={descBLoading || !jobB}
                      className="w-full border border-black/10 bg-transparent px-3 py-2 font-[Inter] text-black/70 placeholder:text-black/20 outline-none focus:border-black/30 transition-colors resize-none disabled:opacity-40 pr-6"
                      style={{ fontSize: '0.83rem' }}
                    />
                    {descBLoading && <Loader2 size={11} className="animate-spin text-black/25 absolute top-2.5 right-2" />}
                  </div>
                </div>
              </div>

              {/* Compare button */}
              {jobA && jobB && (
                <div className="flex justify-center">
                <motion.button
                  onClick={handleCompare}
                  disabled={compareLoading || descALoading || descBLoading}
                  className="flex items-center gap-2 bg-black text-white px-5 py-2.5 font-[Inter] hover:bg-black/80 disabled:opacity-40 transition-colors"
                  style={{ fontSize: '0.85rem' }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {compareLoading ? <Loader2 size={14} className="animate-spin" /> : <Scale size={14} />}
                  {compareLoading ? 'Comparing…' : 'Compare Careers'}
                </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison Table — shown after Compare is clicked */}
        <AnimatePresence>
          {compareTriggered && jobA && jobB && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-black/15"
            >
              {/* AI Insight */}
              {insight && (
                <div className="p-5 border-b border-black/8 bg-black/2">
                  <p className="font-[Inter] text-black/60 italic" style={{ fontSize: '0.85rem' }}>{insight}</p>
                </div>
              )}
              {/* Header Row */}
              <div className="grid grid-cols-[1fr_120px_1fr] gap-0 border-b-2 border-black/15 bg-black/3">
                <div className="p-4 text-center">
                  <h3 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.1rem' }}>{jobA.title}</h3>
                </div>
                <div className="p-4 flex items-center justify-center">
                  <Scale size={16} className="text-black/30" />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.1rem' }}>{jobB.title}</h3>
                </div>
              </div>

              {/* PDF + Share buttons */}
              <div className="grid grid-cols-[1fr_120px_1fr] gap-0 border-b border-black/8">
                <div />
                <div className="p-3 flex flex-col gap-2 items-center bg-black/3">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-1 text-black/40 hover:text-black transition-colors font-[Inter]"
                    style={{ fontSize: '0.68rem' }}
                  >
                    <Download size={11} /> PDF
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 text-black/40 hover:text-black transition-colors font-[Inter]"
                    style={{ fontSize: '0.68rem' }}
                  >
                    <Share2 size={11} /> Share
                  </button>
                </div>
                <div />
              </div>

              <CompareRow label="Salary" valueA={jobA.avgSalary} valueB={jobB.avgSalary} />
              <CompareRow label="Category" valueA={jobA.category} valueB={jobB.category} />
              <CompareRow
                label="Overview"
                valueA={<span className="text-black/55" style={{ fontSize: '0.8rem' }}>{jobA.shortDescription}</span>}
                valueB={<span className="text-black/55" style={{ fontSize: '0.8rem' }}>{jobB.shortDescription}</span>}
              />
              <CompareRow
                label="Skills"
                valueA={
                  <div className="flex flex-wrap gap-1">
                    {(jobA.skills || []).slice(0, 6).map(s => (
                      <span key={s} className="border border-black/10 px-2 py-0.5 text-black/50" style={{ fontSize: '0.72rem' }}>{s}</span>
                    ))}
                  </div>
                }
                valueB={
                  <div className="flex flex-wrap gap-1">
                    {(jobB.skills || []).slice(0, 6).map(s => (
                      <span key={s} className="border border-black/10 px-2 py-0.5 text-black/50" style={{ fontSize: '0.72rem' }}>{s}</span>
                    ))}
                  </div>
                }
              />
              <CompareRow
                label="Education"
                valueA={
                  <ul className="space-y-1">
                    {(jobA.education || []).slice(0, 3).map((e, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-black/30 mt-2 shrink-0" />
                        <span style={{ fontSize: '0.8rem' }}>{e}</span>
                      </li>
                    ))}
                  </ul>
                }
                valueB={
                  <ul className="space-y-1">
                    {(jobB.education || []).slice(0, 3).map((e, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-black/30 mt-2 shrink-0" />
                        <span style={{ fontSize: '0.8rem' }}>{e}</span>
                      </li>
                    ))}
                  </ul>
                }
              />
              <CompareRow label="Environment" valueA={jobA.workEnvironment} valueB={jobB.workEnvironment} />
              <CompareRow label="Daily Life" valueA={jobA.dailyRoutine} valueB={jobB.dailyRoutine} />
              <CompareRow label="Career Path" valueA={jobA.careerPath} valueB={jobB.careerPath} />
              <CompareRow
                label="Fun Fact"
                valueA={<span className="italic">{jobA.funFact}</span>}
                valueB={<span className="italic">{jobB.funFact}</span>}
              />

              {/* Work-Life Balance */}
              {(wlbLoading || wlbA || wlbB) && (
                <CompareRow
                  label="Work-Life Balance"
                  winner={wlbA&&wlbB&&wlbA.overallScore!==wlbB.overallScore?(wlbA.overallScore>wlbB.overallScore?'a':'b'):undefined}
                  valueA={
                    wlbLoading ? (
                      <Loader2 size={12} className="animate-spin text-black/25" />
                    ) : wlbA ? (
                      <div className="space-y-1">
                        <span className="font-[Inter] font-medium text-black/60" style={{ fontSize: '0.85rem' }}>
                          {wlbA.overallScore}/100
                        </span>
                        <div className="w-24 h-1 bg-black/10 mt-1 mb-1">
                          <div className="h-full bg-black/50" style={{ width: `${wlbA.overallScore}%` }} />
                        </div>
                        <p className="font-[Inter] text-black/45" style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>{wlbA.bestFor}</p>
                      </div>
                    ) : null
                  }
                  valueB={
                    wlbLoading ? (
                      <Loader2 size={12} className="animate-spin text-black/25" />
                    ) : wlbB ? (
                      <div className="space-y-1">
                        <span className="font-[Inter] font-medium text-black/60" style={{ fontSize: '0.85rem' }}>
                          {wlbB.overallScore}/100
                        </span>
                        <div className="w-24 h-1 bg-black/10 mt-1 mb-1">
                          <div className="h-full bg-black/50" style={{ width: `${wlbB.overallScore}%` }} />
                        </div>
                        <p className="font-[Inter] text-black/45" style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>{wlbB.bestFor}</p>
                      </div>
                    ) : null
                  }
                />
              )}

              {/* Certifications */}
              {(learnLoading || learnMoreA || learnMoreB) && (
                <CompareRow
                  label="Certifications"
                  valueA={
                    learnLoading ? (
                      <Loader2 size={12} className="animate-spin text-black/25" />
                    ) : learnMoreA ? (
                      <div className="flex flex-col gap-0.5">
                        {learnMoreA.certifications.slice(0, 3).map((c, i) => (
                          <span key={i} className="font-[Inter] text-black/50" style={{ fontSize: '0.75rem' }}>· {c.name}</span>
                        ))}
                      </div>
                    ) : null
                  }
                  valueB={
                    learnLoading ? (
                      <Loader2 size={12} className="animate-spin text-black/25" />
                    ) : learnMoreB ? (
                      <div className="flex flex-col gap-0.5">
                        {learnMoreB.certifications.slice(0, 3).map((c, i) => (
                          <span key={i} className="font-[Inter] text-black/50" style={{ fontSize: '0.75rem' }}>· {c.name}</span>
                        ))}
                      </div>
                    ) : null
                  }
                />
              )}

              {/* Subreddits */}
              {(learnLoading || learnMoreA || learnMoreB) && (
                <CompareRow
                  label="Communities"
                  valueA={
                    learnLoading ? (
                      <Loader2 size={12} className="animate-spin text-black/25" />
                    ) : learnMoreA ? (
                      <div className="flex flex-col gap-0.5">
                        {learnMoreA.subreddits.slice(0, 3).map((r, i) => (
                          <a key={i} href={`https://reddit.com/r/${r.name.replace(/^r\//, '')}`} target="_blank" rel="noopener noreferrer"
                            className="font-[Inter] text-black/50 hover:text-black transition-colors underline underline-offset-2" style={{ fontSize: '0.75rem' }}>
                            r/{r.name.replace(/^r\//, '')}
                          </a>
                        ))}
                      </div>
                    ) : null
                  }
                  valueB={
                    learnLoading ? (
                      <Loader2 size={12} className="animate-spin text-black/25" />
                    ) : learnMoreB ? (
                      <div className="flex flex-col gap-0.5">
                        {learnMoreB.subreddits.slice(0, 3).map((r, i) => (
                          <a key={i} href={`https://reddit.com/r/${r.name.replace(/^r\//, '')}`} target="_blank" rel="noopener noreferrer"
                            className="font-[Inter] text-black/50 hover:text-black transition-colors underline underline-offset-2" style={{ fontSize: '0.75rem' }}>
                            r/{r.name.replace(/^r\//, '')}
                          </a>
                        ))}
                      </div>
                    ) : null
                  }
                />
              )}

              {/* Interview Difficulty */}
              {(diffLoading || diffA || diffB) && (
                <CompareRow
                  label="Interview"
                  winner={diffA&&diffB&&diffA.score!==diffB.score?(diffA.score<diffB.score?'a':'b'):undefined}
                  valueA={
                    diffLoading ? (
                      <Loader2 size={12} className="animate-spin text-black/25" />
                    ) : diffA ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={i < diffA.score ? 'text-black/70' : 'text-black/15'} style={{ fontSize: '0.9rem' }}>●</span>
                          ))}
                          <span className="font-[Inter] text-black/45 ml-1.5" style={{ fontSize: '0.72rem' }}>{diffA.label}</span>
                        </div>
                        <p className="font-[Inter] text-black/40" style={{ fontSize: '0.72rem' }}>{diffA.notes}</p>
                      </div>
                    ) : null
                  }
                  valueB={
                    diffLoading ? (
                      <Loader2 size={12} className="animate-spin text-black/25" />
                    ) : diffB ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={i < diffB.score ? 'text-black/70' : 'text-black/15'} style={{ fontSize: '0.9rem' }}>●</span>
                          ))}
                          <span className="font-[Inter] text-black/45 ml-1.5" style={{ fontSize: '0.72rem' }}>{diffB.label}</span>
                        </div>
                        <p className="font-[Inter] text-black/40" style={{ fontSize: '0.72rem' }}>{diffB.notes}</p>
                      </div>
                    ) : null
                  }
                />
              )}

              {/* Growth Outlook */}
              {(growthLoading || growthA || growthB) && (
                <CompareRow
                  label="Outlook"
                  valueA={
                    growthLoading ? (
                      <Loader2 size={12} className="animate-spin text-black/25" />
                    ) : growthA ? (
                      <span className="font-[Inter] text-black/55 italic" style={{ fontSize: '0.8rem' }}>{growthA}</span>
                    ) : null
                  }
                  valueB={
                    growthLoading ? (
                      <Loader2 size={12} className="animate-spin text-black/25" />
                    ) : growthB ? (
                      <span className="font-[Inter] text-black/55 italic" style={{ fontSize: '0.8rem' }}>{growthB}</span>
                    ) : null
                  }
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {(!jobA || !jobB) && (
          <motion.div className="text-center py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="font-[Inter] text-black/30" style={{ fontSize: '0.88rem' }}>
              Select two careers above to see a detailed comparison
            </p>
          </motion.div>
        )}
      </div>

      {/* Picker Modal */}
      <AnimatePresence>
        {showPicker !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => { setShowPicker(null); setSuggestions([]); }} />
            <motion.div
              className="relative bg-white border-2 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] w-full max-w-md mx-4 max-h-[70vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="p-6 border-b border-black/10">
                <h3 className="font-[Playfair_Display] text-black mb-3" style={{ fontSize: '1.1rem' }}>
                  Select Career {showPicker === 0 ? 'A' : 'B'}
                </h3>

                {/* Custom search */}
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch(showPicker)}
                        placeholder="Search any job title..."
                        className="w-full border border-black/15 px-3 py-2 font-[Inter] text-black/70 placeholder:text-black/25 outline-none focus:border-black/40"
                        style={{ fontSize: '0.85rem' }}
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => handleCustomSearch(showPicker)}
                      disabled={!customTitle.trim()}
                      className="bg-black text-white px-4 py-2 font-[Inter] disabled:bg-black/30 hover:bg-black/85 transition-colors"
                      style={{ fontSize: '0.82rem' }}
                    >
                      <Search size={16} />
                    </button>
                  </div>

                  {/* AI Suggestions Dropdown */}
                  {(suggestions.length > 0 || fetchingSuggestions) && customTitle.length >= 2 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-black/15 shadow-md max-h-48 overflow-y-auto">
                      {fetchingSuggestions && suggestions.length === 0 && (
                        <div className="px-4 py-3 flex items-center gap-2 text-black/35 font-[Inter]" style={{ fontSize: '0.8rem' }}>
                          <Loader2 size={12} className="animate-spin" />
                          Finding careers...
                        </div>
                      )}
                      {suggestions.map((s, i) => (
                        <button
                          key={s + i}
                          onClick={() => {
                            setCustomTitle(s);
                            setSuggestions([]);
                            // Auto-search
                            const slot = showPicker;
                            setLoadingSlot(slot);
                            setShowPicker(null);
                            searchJobAI(s)
                              .then(jobData => { setComparisonJob(slot, jobData); addToHistory(jobData); setCustomTitle(''); })
                              .catch(() => toast.error('Failed to load career'))
                              .finally(() => setLoadingSlot(null));
                          }}
                          className="w-full text-left px-4 py-2.5 font-[Inter] text-black/70 hover:bg-black/5 transition-colors border-b border-black/5 last:border-0"
                          style={{ fontSize: '0.85rem' }}
                        >
                          {s}
                          <Sparkles size={9} className="text-black/20 ml-1.5 inline" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* History list */}
              <div className="flex-1 overflow-y-auto p-4">
                {history.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-[Inter] text-black/30 uppercase tracking-[0.1em] mb-2" style={{ fontSize: '0.65rem' }}>
                      From your history
                    </p>
                    {history.map(entry => (
                      <button
                        key={entry.id}
                        onClick={() => handlePickFromHistory(entry, showPicker)}
                        className="w-full text-left p-3 border border-black/8 hover:border-black/20 transition-colors"
                      >
                        <span className="font-[Playfair_Display] text-black" style={{ fontSize: '0.95rem' }}>
                          {entry.jobTitle}
                        </span>
                        <span className="font-[Inter] text-black/30 ml-2" style={{ fontSize: '0.72rem' }}>
                          {entry.jobData.category}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center font-[Inter] text-black/30 py-8" style={{ fontSize: '0.85rem' }}>
                    No history yet. Search for a career above.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare History Drawer */}
      <AnimatePresence>
        {showCompareHistory && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowCompareHistory(false)} />
            <motion.div
              className="relative bg-white border-2 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] w-full max-w-sm mx-4 max-h-[60vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="p-5 border-b border-black/10 flex items-center justify-between">
                <h3 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.05rem' }}>Recent Comparisons</h3>
                <button onClick={() => setShowCompareHistory(false)} className="text-black/30 hover:text-black transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {compareHistory.length === 0 ? (
                  <p className="text-center font-[Inter] text-black/30 py-8" style={{ fontSize: '0.85rem' }}>
                    No comparisons yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {compareHistory.map((item, i) => (
                      <button
                        key={i}
                        onClick={async () => {
                          setShowCompareHistory(false);
                          setLoadingSlot(0);
                          try {
                            const [jA, jB] = await Promise.all([
                              searchJobAI(item.a),
                              searchJobAI(item.b),
                            ]);
                            setComparisonJob(0, jA);
                            setComparisonJob(1, jB);
                          } catch { toast.error('Failed to reload comparison'); }
                          finally { setLoadingSlot(null); }
                        }}
                        className="w-full text-left p-3 border border-black/8 hover:border-black/20 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-[Inter] text-black/70" style={{ fontSize: '0.85rem' }}>{item.a}</span>
                          <span className="font-[Inter] text-black/25" style={{ fontSize: '0.72rem' }}>vs</span>
                          <span className="font-[Inter] text-black/70" style={{ fontSize: '0.85rem' }}>{item.b}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {comparisonJobs[0] && comparisonJobs[1] && (
        <AskAIPanel
          contextTitle={`${comparisonJobs[0].title} vs ${comparisonJobs[1].title}`}
          contextBody={`Comparing ${comparisonJobs[0].title} (${comparisonJobs[0].category}, ${comparisonJobs[0].avgSalary}) vs ${comparisonJobs[1].title} (${comparisonJobs[1].category}, ${comparisonJobs[1].avgSalary}).`}
        />
      )}
    </div>
  );
}
