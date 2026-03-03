import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Play, MessageCircle, X, Send, Sparkles, Loader2, RefreshCw, Download,
  Briefcase, GraduationCap, Wrench, MapPin, TrendingUp, Lightbulb, ArrowRight,
  Calendar, CalendarDays, CalendarRange, Scale, Star, UserCheck, Share2
} from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useApp } from '../context/AppContext';
import { useFavorites } from '../hooks/useFavorites';
import { streamChat, hasApiKey, getRelatedCareers, type RelatedCareer } from '../services/ai';
import { toast } from 'sonner';
import { downloadDossierPDF } from '../utils/pdfExport';
import { generateShareUrl, decodeDossier } from '../utils/share';
import { sounds } from '../utils/sounds';

/**
 * Break up timeline text into paragraphs.
 * The AI often returns "Day: Mon: ... Day: Tue: ..." inline without newlines.
 * This helper inserts paragraph breaks before known label patterns.
 */
function formatTimelineContent(text: string): string[] {
  if (!text) return [];

  // Strip markdown bold/italic markers and lonely ** lines
  let processed = text
    .replace(/\*\*([^*]*)\*\*/g, '$1')   // **bold** → plain
    .replace(/\*([^*]+)\*/g, '$1')        // *italic* → plain
    .replace(/^\s*\*+\s*$/gm, '')         // lines that are just ** or *
    // Split on "Day: DayName:" or "Day: DayName -" patterns (case-insensitive)
    .replace(/(?<!\n)\s*(Day:\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s:])/gi, '\n$1')
    // "Month N:" or "Month N -"
    .replace(/(?<!\n)\s*(Month\s+\d+[\s:\-])/gi, '\n$1')
    // Quarters "Q1:", "Q2:", etc.
    .replace(/(?<!\n)\s*(Q[1-4][\s:\-])/gi, '\n$1')
    // Numbered items "1." "2." etc. at inline positions
    .replace(/(?<!\n)\s+(\d+\.\s)/g, '\n$1');

  // Split by double newlines OR single newlines
  const paragraphs = processed
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [text];
}

/** Parse a single timeline paragraph into { label, content } for timeline rendering */
function parseTimelineEntry(para: string): { label: string; content: string } | null {
  // Week: "Day: Monday - content" or "Day: Monday: content"
  const weekMatch = para.match(/^Day:\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[-:]+\s*(.*)/i);
  if (weekMatch) return { label: weekMatch[1], content: weekMatch[2].replace(/^[-\s]+/, '').trim() };

  // Quarter: "Month 1: content" or "Month 1: - content"
  const quarterMatch = para.match(/^Month\s+(\d+)\s*[:\s-]+\s*(.*)/i);
  if (quarterMatch) return { label: `Month ${quarterMatch[1]}`, content: quarterMatch[2].replace(/^[-\s]+/, '').trim() };

  // Year: "Q1: content" or "Q1 - content"
  const yearMatch = para.match(/^(Q[1-4])\s*[:\s-]+\s*(.*)/i);
  if (yearMatch) return { label: yearMatch[1], content: yearMatch[2].replace(/^[-\s]+/, '').trim() };

  return null;
}

export function JobDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentJob, setCurrentJob, searchJobAI, searchJob, addToHistory, setRefinementCount, isAIEnabled, setComparisonJob } = useApp();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [activeTimeline, setActiveTimeline] = useState<'week' | 'quarter' | 'year'>('week');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [relatedCareers, setRelatedCareers] = useState<RelatedCareer[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [exploringRelated, setExploringRelated] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isStreaming]);

  // Decode shared dossier from URL param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const encoded = params.get('d');
    if (encoded) {
      const decoded = decodeDossier(encoded);
      if (decoded) {
        setCurrentJob(decoded);
        addToHistory(decoded);
      }
    }
  }, []);

  // Load related careers
  useEffect(() => {
    if (currentJob && hasApiKey()) {
      setLoadingRelated(true);
      getRelatedCareers(currentJob.title)
        .then(setRelatedCareers)
        .catch(() => {})
        .finally(() => setLoadingRelated(false));
    }
  }, [currentJob?.title]);

  if (!currentJob) {
    navigate('/');
    return null;
  }

  const isFav = isFavorite(currentJob.title);

  const toggleFavorite = () => {
    if (isFav) {
      removeFavorite(currentJob.title);
      toast.success('Removed from favorites');
    } else {
      addFavorite(currentJob);
      toast.success('Added to favorites');
    }
  };

  const handleRegenerate = async () => {
    if (!hasApiKey()) return;
    setIsRegenerating(true);
    toast.info('Regenerating dossier with fresh AI data...');
    try {
      const fresh = await searchJobAI(currentJob.title, true);
      setCurrentJob(fresh);
      addToHistory(fresh);
      toast.success('Fresh dossier generated!');
    } catch (error) {
      toast.error('Regeneration failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleShare = () => {
    if (!currentJob) return;
    const url = generateShareUrl(currentJob);
    navigator.clipboard.writeText(url).then(() => {
      sounds.share();
      toast.success('Share link copied to clipboard!', { description: 'Anyone with this link can view this career dossier' });
    }).catch(() => {
      toast.error('Could not copy link - please copy manually', { description: url });
    });
  };

  const handlePrint = () => {
    if (!currentJob) return;
    downloadDossierPDF({
      title: currentJob.title,
      category: currentJob.category,
      avgSalary: currentJob.avgSalary,
      fullDescription: currentJob.fullDescription,
      skills: currentJob.skills,
      education: currentJob.education,
      workEnvironment: currentJob.workEnvironment,
      careerPath: currentJob.careerPath,
      funFact: currentJob.funFact,
      weekOverview: currentJob.weekOverview,
      quarterOverview: currentJob.quarterOverview,
      yearOverview: currentJob.yearOverview,
    });
    toast.success('Downloading dossier PDF…');
  };

  const handleExploreRelated = async (title: string) => {
    setExploringRelated(title);
    try {
      const jobData = isAIEnabled ? await searchJobAI(title) : searchJob(title);
      setCurrentJob(jobData);
      addToHistory(jobData);
      setRefinementCount(0);
      setChatMessages([]);
      setRelatedCareers([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(`Now viewing: ${title}`);
    } catch {
      toast.error('Failed to load career');
    } finally {
      setExploringRelated(null);
    }
  };

  const handleCompare = () => {
    setComparisonJob(0, currentJob);
    navigate('/compare');
    toast.info('Career A set - pick Career B to compare');
  };

  const handleAskQuestion = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    const updatedMessages = [...chatMessages, { role: 'user' as const, text: userMsg }];
    setChatMessages(updatedMessages);

    if (hasApiKey()) {
      setIsStreaming(true);
      setChatMessages(prev => [...prev, { role: 'assistant', text: '' }]);

      try {
        const jobContext = `${currentJob.shortDescription}\n\nCategory: ${currentJob.category}\nSalary: ${currentJob.avgSalary}\nSkills: ${currentJob.skills.join(', ')}\nWork Environment: ${currentJob.workEnvironment}`;

        const stream = streamChat(currentJob.title, jobContext, updatedMessages);
        let fullResponse = '';

        for await (const chunk of stream) {
          fullResponse += chunk;
          setChatMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { role: 'assistant', text: fullResponse };
            return msgs;
          });
        }
      } catch (error) {
        toast.error('Chat error');
        setChatMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = {
            role: 'assistant',
            text: `Sorry, I encountered an error. ${error instanceof Error ? error.message : 'Please try again.'}`
          };
          return msgs;
        });
      } finally {
        setIsStreaming(false);
      }
    } else {
      setTimeout(() => {
        const response = generateChatResponseFallback(currentJob.title, userMsg);
        setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
      }, 800 + Math.random() * 700);
    }
  };

  const timelineContent = {
    week: currentJob.weekOverview,
    quarter: currentJob.quarterOverview,
    year: currentJob.yearOverview,
  };

  return (
    <div className="min-h-screen bg-white pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back */}
        <motion.button
          onClick={() => navigate('/job')}
          className="flex items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter] print:hidden"
          style={{ fontSize: '0.82rem' }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ChevronLeft size={16} />
          Back to Overview
        </motion.button>

        {/* Title Section */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-black/10" />
            <span className="font-[Inter] text-black/30 uppercase tracking-[0.2em] flex items-center gap-1.5" style={{ fontSize: '0.6rem' }}>
              Full Dossier
              {isAIEnabled && <Sparkles size={10} className="text-black/25" />}
            </span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            <StickFigure pose="presenting" size={90} />
            <div className="flex-1">
              <h1 className="font-[Playfair_Display] text-black" style={{ fontSize: '2.5rem' }}>
                {currentJob.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="font-[Inter] text-black/40 border border-black/10 px-2.5 py-1 rounded-sm" style={{ fontSize: '0.72rem' }}>
                  {currentJob.category}
                </span>
                <span className="font-[Inter] text-black/40" style={{ fontSize: '0.72rem' }}>&bull;</span>
                <span className="font-[Inter] text-black/50" style={{ fontSize: '0.82rem' }}>
                  {currentJob.avgSalary}
                </span>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap gap-2 mt-4 print:hidden">
                {isAIEnabled && (
                  <motion.button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all disabled:opacity-40 font-[Inter]"
                    style={{ fontSize: '0.72rem' }}
                    whileHover={{ y: -1 }}
                  >
                    {isRegenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                  </motion.button>
                )}
                <motion.button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ y: -1 }}
                >
                  <Download size={12} />
                  Download PDF
                </motion.button>
                <motion.button
                  onClick={handleCompare}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ y: -1 }}
                >
                  <Scale size={12} />
                  Compare
                </motion.button>
                <motion.button
                  onClick={toggleFavorite}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ y: -1 }}
                >
                  {isFav ? <Star size={12} className="text-black/50" /> : <Star size={12} className="text-black/25" />}
                  {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                </motion.button>
                <motion.button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ y: -1 }}
                >
                  <Share2 size={12} />
                  Share
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Full Description */}
        <Section title="About the Role" icon={<Briefcase size={16} />} delay={0.1}>
          <p className="font-[Inter] text-black/65 leading-relaxed whitespace-pre-line" style={{ fontSize: '0.92rem' }}>
            {currentJob.fullDescription}
          </p>
        </Section>

        {/* Skills */}
        <Section title="Required Skills" icon={<Wrench size={16} />} delay={0.15}>
          <div className="flex flex-wrap gap-2">
            {currentJob.skills.map((skill, i) => (
              <motion.span
                key={skill + i}
                className="font-[Inter] text-black/60 border border-black/12 px-3 py-1.5 hover:bg-black hover:text-white hover:border-black transition-all cursor-default"
                style={{ fontSize: '0.82rem' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.03 }}
              >
                {skill}
              </motion.span>
            ))}
          </div>
        </Section>

        {/* Education */}
        <Section title="Education & Qualifications" icon={<GraduationCap size={16} />} delay={0.2}>
          <div className="space-y-3">
            {currentJob.education.map((edu, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-black/30 mt-2 shrink-0" />
                <p className="font-[Inter] text-black/65" style={{ fontSize: '0.9rem' }}>{edu}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Work Environment */}
        <Section title="Work Environment" icon={<MapPin size={16} />} delay={0.25}>
          <p className="font-[Inter] text-black/65 leading-relaxed" style={{ fontSize: '0.92rem' }}>
            {currentJob.workEnvironment}
          </p>
        </Section>

        {/* Career Path */}
        <Section title="Career Progression" icon={<TrendingUp size={16} />} delay={0.3}>
          <p className="font-[Inter] text-black/65 leading-relaxed" style={{ fontSize: '0.92rem' }}>
            {currentJob.careerPath}
          </p>
        </Section>

        {/* Fun Fact */}
        <Section title="Did You Know?" icon={<Lightbulb size={16} />} delay={0.35}>
          <p className="font-[Inter] text-black/65 italic" style={{ fontSize: '0.92rem' }}>
            {currentJob.funFact}
          </p>
        </Section>

        {/* Timeline Section */}
        <motion.div
          className="mt-12 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-black/10" />
            <span className="font-[Playfair_Display] text-black" style={{ fontSize: '1.3rem' }}>
              Life in the Role
            </span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <div className="flex border-2 border-black/15 mb-6 print:hidden">
            {[
              { key: 'week' as const, label: '1 Week', icon: <Calendar size={14} /> },
              { key: 'quarter' as const, label: '1 Quarter', icon: <CalendarDays size={14} /> },
              { key: 'year' as const, label: '1 Year', icon: <CalendarRange size={14} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTimeline(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-[Inter] transition-all ${
                  activeTimeline === tab.key ? 'bg-black text-white' : 'text-black/50 hover:bg-black/5'
                }`}
                style={{ fontSize: '0.82rem' }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTimeline}
              className="border border-black/10 p-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start gap-4">
                <StickFigure pose="reading" size={56} />
                <div className="flex-1 font-[Inter] text-black/65 leading-relaxed" style={{ fontSize: '0.9rem' }}>
                  {formatTimelineContent(timelineContent[activeTimeline]).map((para, i) => {
                    const entry = parseTimelineEntry(para);
                    return (
                      <motion.p
                        key={i}
                        className="mb-4 last:mb-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        {entry ? (
                          <>
                            <strong className="font-[Inter] font-semibold text-black">{entry.label}:</strong>
                            {' '}
                            <span className="text-black/60">{entry.content}</span>
                          </>
                        ) : para}
                      </motion.p>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Related Careers */}
        {(relatedCareers.length > 0 || loadingRelated) && (
          <motion.div
            className="mt-10 mb-10 print:hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-black/10" />
              <span className="font-[Playfair_Display] text-black flex items-center gap-2" style={{ fontSize: '1.15rem' }}>
                Related Careers
                <Sparkles size={12} className="text-black/25" />
              </span>
              <div className="h-px flex-1 bg-black/10" />
            </div>

            {loadingRelated ? (
              <div className="flex items-center justify-center gap-2 py-6 text-black/30">
                <Loader2 size={16} className="animate-spin" />
                <span className="font-[Inter]" style={{ fontSize: '0.82rem' }}>Finding related careers...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {relatedCareers.slice(0, 5).map((career, i) => (
                  <motion.button
                    key={career.title}
                    onClick={() => handleExploreRelated(career.title)}
                    disabled={exploringRelated !== null}
                    className="text-left border border-black/10 p-4 hover:border-black/25 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] transition-all group disabled:opacity-50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <h4 className="font-[Playfair_Display] text-black group-hover:underline mb-1" style={{ fontSize: '0.95rem' }}>
                      {exploringRelated === career.title ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        career.title
                      )}
                    </h4>
                    <p className="font-[Inter] text-black/30 mb-1" style={{ fontSize: '0.68rem' }}>
                      {career.similarity}
                    </p>
                    <p className="font-[Inter] text-black/50" style={{ fontSize: '0.78rem' }}>
                      {career.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 mt-10 print:hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={() => navigate('/simulation')}
            className="flex-1 flex items-center justify-center gap-3 bg-black text-white py-4 px-6 hover:bg-black/85 transition-colors font-[Inter] group"
            style={{ fontSize: '0.95rem' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Play size={20} className="group-hover:translate-x-0.5 transition-transform" />
            Start Day-in-the-Life Simulation
          </motion.button>

          {isAIEnabled && (
            <motion.button
              onClick={() => navigate('/interview-prep')}
              className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-4 px-6 hover:border-black/40 hover:text-black transition-all font-[Inter]"
              style={{ fontSize: '0.88rem' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <UserCheck size={18} />
              Interview Prep
              <Sparkles size={12} className="text-black/30" />
            </motion.button>
          )}

          <motion.button
            onClick={() => { setShowChat(true); sounds.slide(); }}
            className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-4 px-6 hover:border-black/40 hover:text-black transition-all font-[Inter]"
            style={{ fontSize: '0.88rem' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <MessageCircle size={18} />
            Ask Questions
            {isAIEnabled && <Sparkles size={12} className="text-black/30" />}
          </motion.button>
        </motion.div>
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => { setShowChat(false); sounds.slide(); }} />
            <motion.div
              className="relative w-full sm:max-w-lg bg-white border-2 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] sm:rounded-none max-h-[80vh] flex flex-col"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
                <div className="flex items-center gap-3">
                  <StickFigure pose="waving" size={32} animate={false} />
                  <div>
                    <h3 className="font-[Playfair_Display] text-black flex items-center gap-2" style={{ fontSize: '1.05rem' }}>
                      Ask about {currentJob.title}
                      {isAIEnabled && <Sparkles size={12} className="text-black/25" />}
                    </h3>
                    <p className="font-[Inter] text-black/40" style={{ fontSize: '0.7rem' }}>
                      {isAIEnabled ? 'AI-powered career assistant' : 'Career investigation assistant'}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setShowChat(false); sounds.slide(); }} className="text-black/30 hover:text-black transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <StickFigure pose="thinking" size={64} className="mx-auto mb-4 text-black/30" />
                    <p className="font-[Inter] text-black/30" style={{ fontSize: '0.85rem' }}>
                      Ask anything about being a {currentJob.title}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {[
                        'What\'s the work-life balance like?',
                        'What\'s the hardest part?',
                        'How do I get started?',
                        'What\'s the salary progression?',
                      ].map(q => (
                        <button
                          key={q}
                          onClick={() => setChatInput(q)}
                          className="font-[Inter] text-black/40 border border-black/10 px-3 py-1.5 hover:bg-black/5 transition-colors"
                          style={{ fontSize: '0.75rem' }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 font-[Inter] ${
                        msg.role === 'user'
                          ? 'bg-black text-white'
                          : 'bg-black/5 text-black/70 border border-black/10'
                      }`}
                      style={{ fontSize: '0.88rem' }}
                    >
                      {msg.text || (
                        <span className="flex items-center gap-2 text-black/40">
                          <Loader2 size={14} className="animate-spin" />
                          Thinking...
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-black/10 p-4">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                    placeholder={isStreaming ? 'AI is responding...' : 'Type your question...'}
                    disabled={isStreaming}
                    className="flex-1 border border-black/15 px-4 py-2.5 font-[Inter] text-black/70 placeholder:text-black/25 outline-none focus:border-black/40 disabled:bg-black/3"
                    style={{ fontSize: '0.88rem' }}
                  />
                  <motion.button
                    onClick={handleAskQuestion}
                    disabled={!chatInput.trim() || isStreaming}
                    className="bg-black text-white px-4 py-2.5 disabled:bg-black/30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Send size={16} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, icon, children, delay = 0 }: { title: string; icon: React.ReactNode; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      className="mb-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-black/40">{icon}</span>
        <h2 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.2rem' }}>{title}</h2>
        <div className="h-px flex-1 bg-black/8" />
      </div>
      {children}
    </motion.div>
  );
}

function generateChatResponseFallback(jobTitle: string, question: string): string {
  const q = question.toLowerCase();
  if (q.includes('work-life') || q.includes('balance') || q.includes('hours')) {
    return `Work-life balance as a ${jobTitle} varies depending on employer, level, and specialization. Entry-level positions often have more structured hours. Many professionals find that setting clear boundaries early is essential for long-term sustainability.`;
  }
  if (q.includes('hardest') || q.includes('difficult') || q.includes('challenge')) {
    return `The most challenging aspect of being a ${jobTitle} is the constant need to adapt and grow. The field evolves rapidly, and staying current requires continuous learning. Managing stakeholder expectations while maintaining quality can be demanding.`;
  }
  if (q.includes('started') || q.includes('begin') || q.includes('entry')) {
    return `Getting started as a ${jobTitle} typically involves building foundational knowledge, gaining practical experience through internships, building a network, and developing a portfolio. Finding a mentor is also highly recommended.`;
  }
  if (q.includes('salary') || q.includes('pay') || q.includes('earn')) {
    return `Compensation as a ${jobTitle} depends on experience, location, and specialization. Beyond base salary, many positions offer benefits including health insurance, retirement plans, and sometimes equity or bonuses.`;
  }
  return `That's a great question about being a ${jobTitle}. This role is multifaceted, and the answer depends on your specific context. Connect a free Groq API key for AI-powered, detailed answers!`;
}