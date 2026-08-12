import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { streamChat } from '../services/ai';
import { renderMarkdown } from '../utils/markdown';
import { toast } from 'sonner';
import { sounds } from '../utils/sounds';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface AskAIPanelProps {
  /** Title for the chat context (e.g. job title, "Career Comparison") */
  contextTitle: string;
  /** Rich context string to pass to the AI */
  contextBody: string;
  /** Optional custom system prompt override */
  systemPrompt?: string;
}

export function AskAIPanel({ contextTitle, contextBody }: AskAIPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleAsk = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    const updatedMessages = [...chatMessages, { role: 'user' as const, text: userMsg }];
    setChatMessages(updatedMessages);

    setIsStreaming(true);
    setChatMessages(prev => [...prev, { role: 'assistant', text: '' }]);

    try {
      const stream = streamChat(contextTitle, contextBody, updatedMessages);
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
  };

  return (
    <>
      {/* Floating Ask AI button */}
      <motion.button
        onClick={() => {
          setIsOpen(true);
          sounds.slide();
        }}
        className="fixed bottom-20 right-5 z-40 flex items-center gap-2 bg-black text-white px-4 py-3 shadow-lg hover:bg-black/85 transition-colors font-[Inter] print:hidden sm:bottom-6"
        style={{ fontSize: '0.82rem' }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        aria-label="Ask AI about this page"
      >
        <MessageCircle size={16} />
        Ask AI
      </motion.button>

      {/* Chat overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm print:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
          >
            <motion.div
              className="relative bg-[#f9f8f7] border-2 border-black/15 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.08)] w-full max-w-md mx-4 h-[70vh] sm:h-[60vh] flex flex-col"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
            >
              {/* Header */}
              <div className="p-4 border-b border-black/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} className="text-black/40" />
                  <h3 className="font-[Playfair_Display] text-black" style={{ fontSize: '1rem' }}>
                    Ask AI
                  </h3>
                  <span className="font-[Inter] text-black/30" style={{ fontSize: '0.7rem' }}>
                    included on every page
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-black/30 hover:text-black transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle size={28} className="text-black/15 mx-auto mb-3" />
                    <p className="font-[Inter] text-black/30" style={{ fontSize: '0.82rem' }}>
                      Ask anything about this page's content
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 font-[Inter] whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-black text-white'
                          : 'bg-black/5 text-black/70 border border-black/10'
                      }`}
                      style={{ fontSize: '0.85rem', lineHeight: 1.6 }}
                    >
                      {msg.text ? (
                        msg.role === 'assistant' ? renderMarkdown(msg.text) : msg.text
                      ) : (
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

              {/* Input */}
              <div className="border-t border-black/10 p-4 shrink-0">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                    placeholder={isStreaming ? 'AI is responding...' : 'Type your question...'}
                    disabled={isStreaming}
                    className="flex-1 border border-black/15 px-4 py-2.5 font-[Inter] text-black/70 placeholder:text-black/25 outline-none focus:border-black/40 disabled:bg-black/3 bg-transparent"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <motion.button
                    onClick={handleAsk}
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
    </>
  );
}
