import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ArrowRight, X, Scale, Loader2 } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useApp } from '../context/AppContext';
import type { JobData } from '../data/jobs';
import { toast } from 'sonner';

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
  const { history, comparisonJobs, setComparisonJob, searchJobAI, searchJob, isAIEnabled, addToHistory } = useApp();
  const [showPicker, setShowPicker] = useState<0 | 1 | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [loadingSlot, setLoadingSlot] = useState<0 | 1 | null>(null);

  const [jobA, jobB] = comparisonJobs;

  const handlePickFromHistory = (entry: { jobData: JobData }, slot: 0 | 1) => {
    setComparisonJob(slot, entry.jobData);
    setShowPicker(null);
  };

  const handleCustomSearch = async (slot: 0 | 1) => {
    if (!customTitle.trim()) return;
    setLoadingSlot(slot);
    setShowPicker(null);
    try {
      const jobData = isAIEnabled ? await searchJobAI(customTitle.trim()) : searchJob(customTitle.trim());
      setComparisonJob(slot, jobData);
      addToHistory(jobData);
      setCustomTitle('');
    } catch {
      toast.error('Failed to load career');
    } finally {
      setLoadingSlot(null);
    }
  };

  const CompareRow = ({ label, valueA, valueB }: { label: string; valueA: React.ReactNode; valueB: React.ReactNode }) => (
    <div className="grid grid-cols-[1fr_120px_1fr] gap-0 border-b border-black/8 last:border-b-0">
      <div className="p-4 font-[Inter] text-black/65" style={{ fontSize: '0.85rem' }}>{valueA}</div>
      <div className="p-4 flex items-center justify-center bg-black/3">
        <span className="font-[Inter] text-black/30 uppercase tracking-[0.1em]" style={{ fontSize: '0.6rem' }}>{label}</span>
      </div>
      <div className="p-4 font-[Inter] text-black/65" style={{ fontSize: '0.85rem' }}>{valueB}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pt-20 pb-16">
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
          <h1 className="font-[Playfair_Display] text-black mb-2" style={{ fontSize: '2rem' }}>
            Career Comparison
          </h1>
          <p className="font-[Inter] text-black/40" style={{ fontSize: '0.85rem' }}>
            Compare two careers side by side
          </p>
        </motion.div>

        {/* Selection Cards — explicit order so "vs" sits between the two */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] gap-4 mb-10 items-center">
          {/* Career A */}
          <CareerSlot
            slot={0}
            job={comparisonJobs[0]}
            isLoading={loadingSlot === 0}
            onClear={() => setComparisonJob(0, null)}
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
            onClear={() => setComparisonJob(1, null)}
            onOpen={() => { setShowPicker(1); setCustomTitle(''); }}
          />
        </div>

        {/* Comparison Table */}
        <AnimatePresence>
          {jobA && jobB && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-black/15"
            >
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

              <CompareRow label="Salary" valueA={jobA.avgSalary} valueB={jobB.avgSalary} />
              <CompareRow label="Category" valueA={jobA.category} valueB={jobB.category} />
              <CompareRow
                label="Skills"
                valueA={
                  <div className="flex flex-wrap gap-1">
                    {jobA.skills.slice(0, 6).map(s => (
                      <span key={s} className="border border-black/10 px-2 py-0.5 text-black/50" style={{ fontSize: '0.72rem' }}>{s}</span>
                    ))}
                  </div>
                }
                valueB={
                  <div className="flex flex-wrap gap-1">
                    {jobB.skills.slice(0, 6).map(s => (
                      <span key={s} className="border border-black/10 px-2 py-0.5 text-black/50" style={{ fontSize: '0.72rem' }}>{s}</span>
                    ))}
                  </div>
                }
              />
              <CompareRow
                label="Education"
                valueA={
                  <ul className="space-y-1">
                    {jobA.education.slice(0, 3).map((e, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-black/30 mt-2 shrink-0" />
                        <span style={{ fontSize: '0.8rem' }}>{e}</span>
                      </li>
                    ))}
                  </ul>
                }
                valueB={
                  <ul className="space-y-1">
                    {jobB.education.slice(0, 3).map((e, i) => (
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
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowPicker(null)} />
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
                <div className="flex gap-2">
                  <input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch(showPicker)}
                    placeholder="Type any job title..."
                    className="flex-1 border border-black/15 px-3 py-2 font-[Inter] text-black/70 placeholder:text-black/25 outline-none focus:border-black/40"
                    style={{ fontSize: '0.85rem' }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleCustomSearch(showPicker)}
                    disabled={!customTitle.trim()}
                    className="bg-black text-white px-4 py-2 font-[Inter] disabled:bg-black/30 hover:bg-black/85 transition-colors"
                    style={{ fontSize: '0.82rem' }}
                  >
                    <ArrowRight size={16} />
                  </button>
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
    </div>
  );
}