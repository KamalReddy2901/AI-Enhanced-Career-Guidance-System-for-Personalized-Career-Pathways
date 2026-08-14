import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Sparkles, Loader2, ArrowRight, RotateCcw } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useApp } from '../context/AppContext';
import { getMoodMatches, type MoodMatch } from '../services/ai';
import { toast } from 'sonner';
import { sounds } from '../utils/sounds';
import { TextReveal } from '../motion/TextReveal';
import { EvidenceButton } from '../components/guidance/EvidenceButton';
import { hapticLight, hapticSuccess } from '../utils/haptic';
import { useT } from '../i18n';

export function MoodMatchPage() {
  const navigate = useNavigate();
  const { lang } = useT();
  const { searchJobAI, setCurrentJob, addToHistory, setRefinementCount } = useApp();
  const [mood, setMood] = useState('');
  const [matches, setMatches] = useState<MoodMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [exploringTitle, setExploringTitle] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood.trim()) return;
    setLoading(true);
    setMatches([]);
    sounds.search();
    try {
      const result = await getMoodMatches(mood.trim());
      setMatches(result);
      sounds.reveal();
      hapticSuccess();
    } catch {
      toast.error('Could not generate matches. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExplore = async (title: string) => {
    setExploringTitle(title);
    try {
      const jobData = await searchJobAI(title);
      setCurrentJob(jobData);
      addToHistory(jobData);
      setRefinementCount(0);
      navigate('/job');
    } catch (err) {
      toast.error('Could not load career');
    } finally {
      setExploringTitle(null);
    }
  };

  const moodPrompts = [
    'restless and want to build something',
    'calm and want to help people',
    'curious about how the world works',
    'competitive and driven',
    'creative and need to express myself',
    'analytical and love solving puzzles',
  ];

  return (
    <div className="editorial-utility min-h-screen bg-[var(--paper)] pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-6">
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
        <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <StickFigure pose="thinking" size={72} className="mx-auto mb-5" />
          <h1 className="font-display text-black mb-2 text-5xl"><TextReveal text="Career Mood Match" /></h1>
          <p className="font-[Inter] text-black/40 leading-relaxed" style={{ fontSize: '0.88rem' }}>
            Describe how you're feeling right now. We'll find careers that vibe with your energy.
          </p>
        </motion.div>

        {/* Input */}
        <motion.form
          onSubmit={handleSubmit}
          className="mb-8"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="border-2 border-black/15 focus-within:border-black/40 transition-colors">
            <textarea
              value={mood}
              onChange={e => setMood(e.target.value)}
              placeholder="e.g. restless and want to build something meaningful..."
              rows={3}
              className="w-full px-5 pt-4 pb-2 font-[Inter] text-black placeholder:text-black/25 focus:outline-none resize-none bg-white"
              style={{ fontSize: '0.9rem' }}
            />
            <div className="flex items-center justify-between px-5 py-3 border-t border-black/8">
              <span className="font-[Inter] text-black/25" style={{ fontSize: '0.72rem' }}>
                {mood.length} / 200
              </span>
              <button
                type="submit"
                disabled={!mood.trim() || loading}
                className="flex items-center gap-1.5 bg-black text-white px-4 py-2 font-[Inter] disabled:opacity-40 hover:bg-black/85 transition-colors"
                style={{ fontSize: '0.82rem' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loading ? 'Finding matches...' : 'Find my careers'}
              </button>
            </div>
          </div>
        </motion.form>

        {/* Quick prompts */}
        {matches.length === 0 && !loading && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="font-[Inter] text-black/30 uppercase tracking-[0.12em] mb-3" style={{ fontSize: '0.63rem' }}>
              Try one of these
            </p>
            <div className="flex flex-wrap gap-2">
              {moodPrompts.map(p => (
                <button
                  key={p}
                  onClick={() => { setMood(p); sounds.select(); hapticLight(); }}
                  className="font-[Inter] text-black/45 border border-black/10 px-3 py-1.5 hover:border-black/30 hover:text-black/65 transition-[color,background-color,border-color,opacity,transform,box-shadow] text-left"
                  style={{ fontSize: '0.78rem' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-center gap-1 mb-4">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-black/30"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }}
                />
              ))}
            </div>
            <p className="font-[Inter] text-black/30" style={{ fontSize: '0.85rem' }}>
              Reading your energy...
            </p>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {matches.length > 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 mb-2">
                  <StickFigure pose="celebrating" size={48} />
                  <p className="font-[Inter] text-black/30 uppercase tracking-[0.12em]" style={{ fontSize: '0.63rem' }}>
                    3 careers that match your vibe
                  </p>
                </div>
                <button
                  onClick={() => { setMood(''); setMatches([]); }}
                  className="font-[Inter] text-black/25 hover:text-black/50 transition-colors flex items-center gap-1"
                  style={{ fontSize: '0.72rem' }}
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              </div>

              {matches.map((match, i) => (
                <motion.div
                  key={match.title}
                  className="border-2 border-black/10 p-6 hover:border-black/25 transition-colors"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-[JetBrains_Mono] text-black/15" style={{ fontSize: '1.2rem' }}>
                          0{i + 1}
                        </span>
                        <h3 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.2rem' }}>
                          {match.title}
                        </h3>
                      </div>
                      <p className="font-[JetBrains_Mono] text-black/30 mb-3" style={{ fontSize: '0.7rem' }}>
                        {match.vibe}
                      </p>
                      <p className="font-[Inter] text-black/55 leading-relaxed" style={{ fontSize: '0.88rem' }}>
                        {match.reason}
                      </p>
                      <EvidenceButton testId={`mood-match-${i + 1}-why-btn`} label={lang === 'hi' ? 'यह मेल क्यों?' : lang === 'te' ? 'ఈ మ్యాచ్ ఎందుకు?' : 'Why matched?'} evidence={{ title:lang === 'hi' ? 'मूड मेल प्रमाण' : lang === 'te' ? 'మూడ్ మ్యాచ్ ఆధారం' : 'Mood-match evidence', eyebrow:match.vibe, summary:match.reason, method:lang === 'hi' ? 'मूड के कीवर्ड पहले एक नियत क्लस्टर और RIASEC गुण चुनते हैं; व्यवसायों को उसी क्लस्टर और गुण के ज्ञान-आधार मान से क्रम दिया जाता है। कोई LLM स्कोर या क्रम नहीं देता।' : lang === 'te' ? 'మూడ్ కీవర్డ్‌లు ముందుగా ఒక నిర్ణీత క్లస్టర్, RIASEC లక్షణాన్ని ఎంచుకుంటాయి; అదే క్లస్టర్, లక్షణ నాలెడ్జ్-బేస్ విలువతో వృత్తులు క్రమబద్ధం అవుతాయి. LLM స్కోర్ లేదా ర్యాంక్ ఇవ్వదు.' : 'Mood keywords first select a deterministic cluster and RIASEC attribute; occupations are ordered by that cluster and the attribute value in the knowledge base. No LLM supplies a score or rank.', items:[{label:lang === 'hi' ? 'आपका मूड' : lang === 'te' ? 'మీ మూడ్' : 'Your mood',detail:mood},{label:lang === 'hi' ? 'लागू नियम' : lang === 'te' ? 'వర్తించిన నియమం' : 'Rule fired',detail:match.vibe},{label:lang === 'hi' ? 'व्यवसाय गुण' : lang === 'te' ? 'వృత్తి లక్షణాలు' : 'Occupation attributes',detail:match.reason}], source:lang === 'hi' ? 'नियत मूड नियम · ज्ञान-आधार व्यवसाय प्रोफ़ाइल' : lang === 'te' ? 'నిర్ణీత మూడ్ నియమం · నాలెడ్జ్-బేస్ వృత్తి ప్రొఫైల్' : 'Deterministic mood rule · knowledge-base occupation profile' }} />
                    </div>
                    <motion.button
                      onClick={() => handleExplore(match.title)}
                      disabled={exploringTitle !== null}
                      className="shrink-0 flex items-center gap-1.5 border border-black/15 px-3 py-2 font-[Inter] text-black/50 hover:bg-black hover:text-white hover:border-black transition-[color,background-color,border-color,opacity,transform,box-shadow] disabled:opacity-40"
                      style={{ fontSize: '0.75rem' }}
                      whileHover={{ scale: 1.02 }}
                    >
                      {exploringTitle === match.title ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <ArrowRight size={13} />
                      )}
                      Explore
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
