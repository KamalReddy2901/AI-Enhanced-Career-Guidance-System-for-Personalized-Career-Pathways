import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Home } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 flex items-center justify-center px-6">
      <motion.div
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <StickFigure pose="searching" size={120} className="mx-auto mb-6" />

        <h1 className="font-[Playfair_Display] text-black mb-3" style={{ fontSize: '3rem' }}>
          404
        </h1>

        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="h-px w-8 bg-black/20" />
          <span className="font-[Inter] text-black/40 uppercase tracking-[0.15em]" style={{ fontSize: '0.7rem' }}>
            Case File Not Found
          </span>
          <div className="h-px w-8 bg-black/20" />
        </div>

        <p className="font-[Inter] text-black/50 mb-8" style={{ fontSize: '0.92rem' }}>
          Our investigator searched every corner but couldn't find this page. 
          It may have been moved, deleted, or never existed.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-black text-white py-3 px-6 font-[Inter] hover:bg-black/85 transition-colors"
            style={{ fontSize: '0.88rem' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Home size={16} />
            Go Home
          </motion.button>
          <motion.button
            onClick={() => navigate('/history')}
            className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-3 px-6 font-[Inter] hover:border-black/40 hover:text-black transition-all"
            style={{ fontSize: '0.88rem' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View History
            <ArrowRight size={16} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
