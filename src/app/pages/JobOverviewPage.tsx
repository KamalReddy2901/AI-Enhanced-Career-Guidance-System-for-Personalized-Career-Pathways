import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RefreshCw, ArrowRight, ChevronLeft, Sparkles } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useApp } from '../context/AppContext';
import { refineJobDescription, hasApiKey } from '../services/ai';
import { toast } from 'sonner';

export function JobOverviewPage() {
  const navigate = useNavigate();
  const { currentJob, setCurrentJob, refinementCount, setRefinementCount, isAIEnabled } = useApp();
  const [showRefinement, setShowRefinement] = useState(false);
  const [refinementText, setRefinementText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [description, setDescription] = useState(currentJob?.shortDescription || '');
  const [refinementHistory, setRefinementHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!currentJob) {
      navigate('/');
    }
  }, [currentJob, navigate]);

  useEffect(() => {
    if (currentJob) {
      setDescription(currentJob.shortDescription);
    }
  }, [currentJob]);

  if (!currentJob) return null;

  const handleConfirm = () => {
    navigate('/job/detail');
  };

  const handleRefine = async () => {
    if (!refinementText.trim() || refinementCount >= 5) return;

    setIsRefining(true);
    setRefinementHistory(prev => [...prev, refinementText]);

    try {
      let refined: string;

      if (hasApiKey()) {
        // AI-powered refinement
        refined = await refineJobDescription(
          currentJob.title,
          description,
          refinementText,
          refinementHistory
        );
        toast.success('Description refined by AI');
      } else {
        // Fallback template refinement
        refined = applyRefinementFallback(currentJob.title, description, refinementText);
      }

      setDescription(refined);
      const updatedJob = { ...currentJob, shortDescription: refined };
      setCurrentJob(updatedJob);
      setRefinementCount(refinementCount + 1);
      setRefinementText('');
      setShowRefinement(false);
    } catch (error) {
      console.error('Refinement failed:', error);
      toast.error('AI refinement failed - using fallback');
      // Fallback
      const refined = applyRefinementFallback(currentJob.title, description, refinementText);
      setDescription(refined);
      const updatedJob = { ...currentJob, shortDescription: refined };
      setCurrentJob(updatedJob);
      setRefinementCount(refinementCount + 1);
      setRefinementText('');
      setShowRefinement(false);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        {/* Back button */}
        <motion.button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter]"
          style={{ fontSize: '0.82rem' }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ChevronLeft size={16} />
          New Search
        </motion.button>

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-black/10" />
            <span className="font-[Inter] text-black/30 uppercase tracking-[0.2em]" style={{ fontSize: '0.65rem' }}>
              Case File
            </span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <div className="flex items-start gap-5">
            <StickFigure pose="thinking" size={80} />
            <div className="flex-1">
              <h1 className="font-[Playfair_Display] text-black mb-1" style={{ fontSize: '2.2rem' }}>
                {currentJob.title}
              </h1>
              <div className="flex items-center gap-2">
                <span className="inline-block font-[Inter] text-black/40 border border-black/10 px-2 py-0.5 rounded-sm" style={{ fontSize: '0.72rem' }}>
                  {currentJob.category}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Description Card */}
        <motion.div
          className="border-2 border-black/15 p-8 mb-6 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="absolute -top-3 left-6 bg-background px-3">
            <span className="font-[Inter] text-black/40 uppercase tracking-[0.15em]" style={{ fontSize: '0.65rem' }}>
              Preliminary Assessment
            </span>
          </div>

          <p className="font-[Inter] text-black/70 leading-relaxed" style={{ fontSize: '0.95rem' }}>
            {description}
          </p>

          {refinementHistory.length > 0 && (
            <div className="mt-6 pt-4 border-t border-black/10">
              <p className="font-[Inter] text-black/30 mb-2" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Refinement notes ({refinementCount}/5)
              </p>
              {refinementHistory.map((note, i) => (
                <p key={i} className="font-[Inter] text-black/40 italic" style={{ fontSize: '0.8rem' }}>
                  "{note}"
                </p>
              ))}
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3.5 px-6 hover:bg-black/85 transition-colors font-[Inter]"
            style={{ fontSize: '0.88rem' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Check size={18} />
            Yes, this is the role I'm looking for
          </motion.button>

          {refinementCount < 5 && (
            <motion.button
              onClick={() => setShowRefinement(!showRefinement)}
              className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-3.5 px-6 hover:border-black/40 hover:text-black transition-all font-[Inter]"
              style={{ fontSize: '0.88rem' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <RefreshCw size={16} />
              Not quite right
            </motion.button>
          )}
        </motion.div>

        {/* Refinement Panel */}
        <AnimatePresence>
          {showRefinement && (
            <motion.div
              className="mt-6 border-2 border-black/10 p-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start gap-4">
                <StickFigure pose="reading" size={56} />
                <div className="flex-1">
                  <h3 className="font-[Playfair_Display] text-black mb-2" style={{ fontSize: '1.1rem' }}>
                    Tell us what's different
                  </h3>
                  <p className="font-[Inter] text-black/40 mb-4" style={{ fontSize: '0.8rem' }}>
                    {isAIEnabled
                      ? "Describe your specific situation - location, work style, specialization, industry, company size - and AI will rewrite the description to match."
                      : "Is it a different location, work style, specialization, or industry focus? Help us narrow it down."
                    }
                  </p>

                  <textarea
                    value={refinementText}
                    onChange={(e) => setRefinementText(e.target.value)}
                    placeholder="E.g., 'I'm thinking more about a remote position focused on frontend development at a Series A startup in Austin' or 'This is more of a clinical research role at a university hospital'..."
                    className="w-full border border-black/15 p-4 font-[Inter] text-black/70 placeholder:text-black/25 resize-none outline-none focus:border-black/40 transition-colors"
                    style={{ fontSize: '0.88rem' }}
                    rows={3}
                  />

                  <div className="flex items-center justify-between mt-4">
                    <span className="font-[Inter] text-black/30" style={{ fontSize: '0.72rem' }}>
                      {5 - refinementCount} refinement{5 - refinementCount !== 1 ? 's' : ''} remaining
                    </span>

                    <motion.button
                      onClick={handleRefine}
                      disabled={!refinementText.trim() || isRefining}
                      className="flex items-center gap-2 bg-black text-white px-5 py-2.5 disabled:bg-black/30 font-[Inter]"
                      style={{ fontSize: '0.82rem' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isRefining ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          >
                            <RefreshCw size={14} />
                          </motion.div>
                          {isAIEnabled ? 'AI Refining...' : 'Refining...'}
                        </>
                      ) : (
                        <>
                          {isAIEnabled && <Sparkles size={12} />}
                          <ArrowRight size={14} />
                          Refine Description
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Fallback refinement when no API key
function applyRefinementFallback(title: string, currentDesc: string, refinement: string): string {
  const r = refinement.toLowerCase();
  let additions = '';

  if (r.includes('remote') || r.includes('home')) {
    additions += ` This particular variant of the role emphasizes remote work, with professionals operating from home offices and leveraging digital collaboration tools.`;
  }
  if (r.includes('rural') || r.includes('small town')) {
    additions += ` In this context, the role is situated in a rural or small-town setting, where the professional often serves as a generalist.`;
  }
  if (r.includes('startup') || r.includes('small company')) {
    additions += ` Within a startup environment, this role takes on a broader scope - wearing multiple hats and directly influencing the company's direction.`;
  }
  if (r.includes('corporate') || r.includes('large company')) {
    additions += ` In a corporate setting, this role is more specialized with clearly defined responsibilities and structured advancement.`;
  }
  if (r.includes('freelance') || r.includes('independent')) {
    additions += ` As an independent practitioner, this role involves managing your own client relationships and balancing multiple projects.`;
  }

  if (!additions) {
    additions = ` Based on the context - "${refinement}" - this role takes on a more specialized character tailored to these requirements.`;
  }

  return currentDesc + additions;
}