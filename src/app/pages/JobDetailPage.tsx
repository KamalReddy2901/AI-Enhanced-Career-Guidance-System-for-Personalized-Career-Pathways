import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Play,
  MessageCircle,
  X,
  Send,
  Sparkles,
  Loader2,
  RefreshCw,
  Download,
  Zap,
  Briefcase,
  GraduationCap,
  Wrench,
  MapPin,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Calendar,
  CalendarDays,
  CalendarRange,
  Scale,
  Star,
  UserCheck,
  Share2,
  BookOpen,
  Hash,
  Award,
  ExternalLink,
  Activity,
  Building2,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { StickFigure } from "../components/StickFigure";
import { TextReveal } from "../motion/TextReveal";
import { useApp } from "../context/AppContext";
import { useFavorites } from "../hooks/useFavorites";
import {
  streamChat,
  getRelatedCareers,
  getLearnMoreResources,
  getWorkLifeBalance,
  getGoodBadUgly,
  assessCareerCompatibility,
  type RelatedCareer,
  type LearnMoreResources,
  type WorkLifeBalance,
  type GoodBadUgly,
} from "../services/ai";
import { toast } from "sonner";
import { renderMarkdown } from "../utils/markdown";
import { downloadDossierPDF } from "../utils/pdfExport";
import { generateShareUrl, decodeDossier } from "../utils/share";
import { sounds } from "../utils/sounds";
import { usePreferences } from "../hooks/usePreferences";
import { useGuidance } from "../context/GuidanceContext";
import { marketFor, occupationById } from "../data/knowledge";
import { WhyPanel } from "../components/guidance/WhyPanel";
import { TrustStrip } from "../components/guidance/TrustStrip";
import type { CareerRecommendation } from "../engine/types";

/**
 * Break up timeline text into paragraphs.
 * The AI often returns "Day: Mon: ... Day: Tue: ..." inline without newlines.
 * This helper inserts paragraph breaks before known label patterns.
 */
function formatTimelineContent(text: string): string[] {
  if (!text) return [];

  // Strip markdown bold/italic markers and lonely ** lines
  let processed = text
    .replace(/\*\*([^*]*)\*\*/g, "$1") // **bold** → plain
    .replace(/\*([^*]+)\*/g, "$1") // *italic* → plain
    .replace(/^\s*\*+\s*$/gm, "") // lines that are just ** or *
    // Split on "Day: DayName:" or "Day: DayName -" patterns (case-insensitive)
    .replace(
      /(?<!\n)\s*(Day:\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s:])/gi,
      "\n$1",
    )
    // "Month N:" or "Month N -"
    .replace(/(?<!\n)\s*(Month\s+\d+[\s:\-])/gi, "\n$1")
    // Quarters "Q1:", "Q2:", etc.
    .replace(/(?<!\n)\s*(Q[1-4][\s:\-])/gi, "\n$1")
    // Numbered items "1." "2." etc. at inline positions
    .replace(/(?<!\n)\s+(\d+\.\s)/g, "\n$1");

  // Split by double newlines OR single newlines
  const paragraphs = processed
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [text];
}

/** Parse a single timeline paragraph into { label, content } for timeline rendering */
function parseTimelineEntry(
  para: string,
): { label: string; content: string } | null {
  // Week: "Day: Monday - content" or "Day: Monday: content"
  const weekMatch = para.match(
    /^Day:\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[-:]+\s*(.*)/i,
  );
  if (weekMatch)
    return {
      label: weekMatch[1],
      content: weekMatch[2].replace(/^[-\s]+/, "").trim(),
    };

  // Quarter: "Month 1: content" or "Month 1: - content"
  const quarterMatch = para.match(/^Month\s+(\d+)\s*[:\s-]+\s*(.*)/i);
  if (quarterMatch)
    return {
      label: `Month ${quarterMatch[1]}`,
      content: quarterMatch[2].replace(/^[-\s]+/, "").trim(),
    };

  // Year: "Q1: content" or "Q1 - content"
  const yearMatch = para.match(/^(Q[1-4])\s*[:\s-]+\s*(.*)/i);
  if (yearMatch)
    return {
      label: yearMatch[1],
      content: yearMatch[2].replace(/^[-\s]+/, "").trim(),
    };

  return null;
}

export function JobDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentJob,
    setCurrentJob,
    searchJobAI,
    addToHistory,
    history,
    setRefinementCount,
    setComparisonJob,
  } = useApp();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { preferences } = usePreferences();
  const { passport, recommendations } = useGuidance();
  const [fitExplanation, setFitExplanation] =
    useState<CareerRecommendation | null>(null);
  const [activeTimeline, setActiveTimeline] = useState<
    "week" | "quarter" | "year"
  >(preferences.defaultView);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [relatedCareers, setRelatedCareers] = useState<RelatedCareer[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [exploringRelated, setExploringRelated] = useState<string | null>(null);
  const [learnMore, setLearnMore] = useState<LearnMoreResources | null>(null);
  const [learnMoreLoading, setLearnMoreLoading] = useState(false);
  const [wlbData, setWlbData] = useState<WorkLifeBalance | null>(null);
  const [wlbLoading, setWlbLoading] = useState(false);
  const [gbuData, setGbuData] = useState<GoodBadUgly | null>(null);
  const [gbuLoading, setGbuLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const simulateBtnRef = useRef<HTMLButtonElement>(null);
  const [showJumpBtn, setShowJumpBtn] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [showDossierNav, setShowDossierNav] = useState(false);
  const [compatibility, setCompatibility] = useState('');
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);
  const requestedLoadRef = useRef<string | null>(null);
  const params = new URLSearchParams(location.search);
  const requestedOccupation = occupationById.get(params.get("occupation") ?? "");
  const requestedTitle = requestedOccupation?.title ?? "";
  const requestedJobReady = !requestedTitle || currentJob?.title.toLowerCase() === requestedTitle.toLowerCase();

  // Section refs for scroll tracking
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const registerSection = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  const DOSSIER_SECTIONS = [
    { id: "about", label: "About" },
    { id: "good-bad-ugly", label: "Good/Bad/Ugly" },
    { id: "skills", label: "Skills" },
    { id: "education", label: "Education" },
    { id: "environment", label: "Environment" },
    { id: "career-path", label: "Career Path" },
    { id: "fun-fact", label: "Fun Fact" },
    { id: "timeline", label: "Timeline" },
    { id: "wlb", label: "Work-Life" },
    { id: "learn-more", label: "Learn More" },
    { id: "related", label: "Related" },
    { id: "actions", label: "Actions" },
  ];

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      setShowDossierNav(window.scrollY > 300);

      // Calculate scroll progress
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docH > 0 ? Math.min(window.scrollY / docH, 1) : 0);

      // Determine active section — a section is active when its top is at or just below the fixed headers
      // Navbar 56 px + progress bar 3 px + dossier nav ~40 px + spacing = ~110 px
      const HEADER_OFFSET = 110;
      const entries = Object.entries(sectionRefs.current).filter(
        ([, el]) => el !== null,
      );
      let currentSection = "";
      for (const [id, el] of entries) {
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= HEADER_OFFSET + 16) currentSection = id;
        }
      }
      setActiveSection(currentSection);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const btn = simulateBtnRef.current;
    if (!btn) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowJumpBtn(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(btn);
    return () => observer.disconnect();
  }, [currentJob?.title]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isStreaming]);

  // Decode shared dossier from URL param
  useEffect(() => {
    const encoded = params.get("d");
    if (encoded) {
      const decoded = decodeDossier(encoded);
      if (decoded) {
        setCurrentJob(decoded);
        addToHistory(decoded);
      }
    }
  }, []);

  // Recommendation cards use a durable occupation id. Resolve it here rather
  // than relying on transient in-memory job state, so deep links and reloads
  // always open the requested dossier.
  useEffect(() => {
    if (!requestedTitle || requestedJobReady || requestedLoadRef.current === requestedTitle) return;
    requestedLoadRef.current = requestedTitle;
    const cached = history.find(item => item.jobTitle.toLowerCase() === requestedTitle.toLowerCase())?.jobData;
    if (cached?.fullDescription) {
      setCurrentJob(cached);
      return;
    }
    let active = true;
    void searchJobAI(requestedTitle)
      .then(job => {
        if (!active) return;
        setCurrentJob(job);
        addToHistory(job);
      })
      .catch(() => {
        if (active) navigate('/job?fresh=1', { replace: true });
      });
    return () => { active = false; };
  }, [requestedTitle, requestedJobReady, history, searchJobAI, setCurrentJob, addToHistory, navigate]);

  // Load related careers
  useEffect(() => {
    if (currentJob) {
      setLoadingRelated(true);
      getRelatedCareers(currentJob.title)
        .then(setRelatedCareers)
        .catch(() => {})
        .finally(() => setLoadingRelated(false));
    }
  }, [currentJob?.title]);

  // Load Learn More & Work-Life Balance lazily
  useEffect(() => {
    if (!currentJob) return;
    setLearnMoreLoading(true);
    getLearnMoreResources(currentJob.title)
      .then(setLearnMore)
      .catch(() => {})
      .finally(() => setLearnMoreLoading(false));
    setWlbLoading(true);
    getWorkLifeBalance(currentJob.title)
      .then(setWlbData)
      .catch(() => {})
      .finally(() => setWlbLoading(false));
    setGbuLoading(true);
    getGoodBadUgly(currentJob.title)
      .then(setGbuData)
      .catch(() => {})
      .finally(() => setGbuLoading(false));
  }, [currentJob?.title]);

  useEffect(() => {
    if (!currentJob && !requestedTitle && !params.get("d")) navigate('/job?fresh=1', { replace: true });
  }, [currentJob, requestedTitle, navigate, location.search]);

  if (!currentJob || !requestedJobReady) {
    return <div className="flex min-h-[70vh] items-center justify-center px-6 text-center"><div><StickFigure pose="typing" size={80} className="mx-auto"/><h1 className="font-display mt-5 text-3xl">Building the {requestedTitle || 'career'} dossier…</h1><p className="mt-2 text-sm text-[var(--ink-soft)]">Researching the role, market context, and practical next steps.</p></div></div>;
  }

  const isFav = isFavorite(currentJob.title);
  const knowledgeOccupation = [...occupationById.values()].find(
    (occupation) =>
      occupation.title.toLowerCase() === currentJob.title.toLowerCase() ||
      occupation.title.toLowerCase().includes(currentJob.title.toLowerCase()) ||
      currentJob.title.toLowerCase().includes(occupation.title.toLowerCase()),
  );
  const personalFit = knowledgeOccupation
    ? recommendations?.recommendations.find(
        (item) => item.occupationId === knowledgeOccupation.id,
      )
    : undefined;
  const marketSignal=knowledgeOccupation?marketFor(knowledgeOccupation.id):undefined;

  const toggleFavorite = () => {
    if (isFav) {
      removeFavorite(currentJob.title);
      toast.success("Removed from favorites");
    } else {
      addFavorite(currentJob);
      toast.success("Added to favorites");
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    toast.info("Regenerating dossier with fresh AI data...");
    try {
      const fresh = await searchJobAI(currentJob.title, true);
      setCurrentJob(fresh);
      addToHistory(fresh);
      toast.success("Fresh dossier generated!");
    } catch (error) {
      toast.error("Regeneration failed", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleShare = () => {
    if (!currentJob) return;
    const url = generateShareUrl(currentJob);
    navigator.clipboard
      .writeText(url)
      .then(() => {
        sounds.share();
        toast.success("Share link copied to clipboard!", {
          description: "Anyone with this link can view this career dossier",
        });
      })
      .catch(() => {
        toast.error("Could not copy link - please copy manually", {
          description: url,
        });
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
    sounds.download();
    toast.success("Downloading dossier PDF…");
  };

  const handleExploreRelated = async (title: string) => {
    setExploringRelated(title);
    try {
      const jobData = await searchJobAI(title);
      setCurrentJob(jobData);
      addToHistory(jobData);
      setRefinementCount(0);
      setChatMessages([]);
      setRelatedCareers([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success(`Now viewing: ${title}`);
    } catch (err) {
      toast.error("Failed to load career");
    } finally {
      setExploringRelated(null);
    }
  };

  const handleCompare = () => {
    setComparisonJob(0, currentJob);
    navigate("/compare");
    toast.info("Career A set - pick Career B to compare");
  };

  const handleCompatibilityCheck = async () => {
    if (!passport) { toast.info('Complete your Career Passport first so this check can be personal to you.'); navigate('/onboarding'); return; }
    setCheckingCompatibility(true);
    setCompatibility('');
    try {
      const result = await assessCareerCompatibility({
        title: currentJob.title,
        dossier: `${currentJob.shortDescription}\nSkills: ${currentJob.skills.join(', ')}\nWork environment: ${currentJob.workEnvironment}\nCareer path: ${currentJob.careerPath}`,
        passport: { education: passport.education, experiences: passport.experiences, skills: passport.skills, riasec: passport.riasec, aptitude: passport.aptitude, values: passport.values, aspiration: passport.aspiration, constraints: passport.constraints },
      });
      setCompatibility(result);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not check compatibility. Please try again.'); }
    finally { setCheckingCompatibility(false); }
  };

  const handleAskQuestion = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const updatedMessages = [
      ...chatMessages,
      { role: "user" as const, text: userMsg },
    ];
    setChatMessages(updatedMessages);

    setIsStreaming(true);
    setChatMessages((prev) => [...prev, { role: "assistant", text: "" }]);

    try {
      const jobContext = `${currentJob.shortDescription}\n\nCategory: ${currentJob.category}\nSalary: ${currentJob.avgSalary}\nSkills: ${currentJob.skills.join(", ")}\nWork Environment: ${currentJob.workEnvironment}`;

      const stream = streamChat(currentJob.title, jobContext, updatedMessages);
      let fullResponse = "";

      for await (const chunk of stream) {
        fullResponse += chunk;
        setChatMessages((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { role: "assistant", text: fullResponse };
          return msgs;
        });
      }
    } catch (error) {
      toast.error("Chat error");
      setChatMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role: "assistant",
          text: `Sorry, I encountered an error. ${error instanceof Error ? error.message : "Please try again."}`,
        };
        return msgs;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const timelineContent = {
    week: currentJob.weekOverview,
    quarter: currentJob.quarterOverview,
    year: currentJob.yearOverview,
  };

  return (
    <div className="editorial-article min-h-screen bg-[var(--paper)] pt-20 pb-16">
      {/* ── SCROLL PROGRESS BAR ───────────────────────────── */}
      <motion.div
        className="fixed top-14 left-0 right-0 z-40 h-[3px] bg-black/5 print:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: showDossierNav ? 1 : 0 }}
      >
        <motion.div
          className="h-full bg-black origin-left"
          style={{ scaleX: scrollProgress, transformOrigin: "left" }}
          transition={{ duration: 0.1 }}
        />
      </motion.div>

      {/* ── DOSSIER SECTION NAV ───────────────────────────── */}
      <AnimatePresence>
        {showDossierNav && (
          <motion.div
            className="fixed top-[calc(3.5rem+3px)] left-0 right-0 z-[39] bg-[#f9f8f7]/95 backdrop-blur-md border-b border-black/6 print:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="max-w-4xl mx-auto px-4">
              <div
                className="flex items-center gap-0.5 overflow-x-auto scrollbar-none py-2"
                style={{ scrollbarWidth: "none" }}
              >
                {DOSSIER_SECTIONS.filter((s) => {
                  // Only show sections that exist in the DOM
                  if (s.id === "wlb") return wlbData || wlbLoading;
                  if (s.id === "learn-more")
                    return learnMore || learnMoreLoading;
                  if (s.id === "related")
                    return (
                      preferences.showRelatedCareers &&
                      (relatedCareers.length > 0 || loadingRelated)
                    );
                  return true;
                }).map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      const el = sectionRefs.current[section.id];
                      if (el) {
                        // Navbar 56px + progress bar 3px + dossier nav ~40px = ~99px, add 8px breathing room
                        const HEADER_OFFSET = 107;
                        const top =
                          el.getBoundingClientRect().top +
                          window.scrollY -
                          HEADER_OFFSET;
                        window.scrollTo({ top, behavior: "smooth" });
                      }
                    }}
                    className={`shrink-0 px-2.5 py-1 font-[Inter] transition-[color,background-color,border-color,opacity,transform,box-shadow] whitespace-nowrap ${
                      activeSection === section.id
                        ? "bg-black text-white"
                        : "text-black/40 hover:text-black/70 hover:bg-black/5"
                    }`}
                    style={{ fontSize: "0.68rem" }}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-6">
        {/* Back */}
        <motion.button
            onClick={() => { setCurrentJob(null); navigate("/job?fresh=1"); }}
          className="flex items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter] print:hidden"
          style={{ fontSize: "0.82rem" }}
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
            <span
              className="font-[Inter] text-black/30 uppercase tracking-[0.2em] flex items-center gap-1.5"
              style={{ fontSize: "0.6rem" }}
            >
              Full Dossier
              <Sparkles size={10} className="text-black/25" />
            </span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            <StickFigure pose="presenting" size={90} />
            <div className="flex-1">
              <h1 className="font-display text-black"><TextReveal text={currentJob.title} /></h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {knowledgeOccupation && <span className="label-caps">{knowledgeOccupation.sector} · NSQF {knowledgeOccupation.nsqfEntryLevel}{marketSignal?` · demand ${marketSignal.demandIndex}`:''}</span>}
                <span
                  className="font-[Inter] text-black/40 border border-black/10 px-2.5 py-1"
                  style={{ fontSize: "0.72rem" }}
                >
                  {currentJob.category}
                </span>
                <span
                  className="font-[Inter] text-black/40"
                  style={{ fontSize: "0.72rem" }}
                >
                  &bull;
                </span>
                <span
                  className="font-[Inter] text-black/50"
                  style={{ fontSize: "0.82rem" }}
                >
                  {currentJob.avgSalary}
                </span>
              </div>

              {/* Top Companies — compact inline clickable logos */}
              {currentJob.topCompanies &&
                currentJob.topCompanies.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span
                      className="font-[Inter] text-black/25 uppercase tracking-[0.1em] shrink-0"
                      style={{ fontSize: "0.58rem" }}
                    >
                      Hiring at:
                    </span>
                    {currentJob.topCompanies.slice(0, 6).map((company, i) => (
                      <a
                        key={i}
                        href={`https://www.google.com/search?q=${encodeURIComponent(company.name + " " + currentJob.title + " jobs")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={company.name}
                        className="flex items-center gap-1.5 border border-black/12 px-2 py-1 hover:border-black/30 hover:bg-black/3 transition-[color,background-color,border-color,opacity,transform,box-shadow] group"
                      >
                        <div className="w-4 h-4 flex items-center justify-center overflow-hidden shrink-0">
                          <img
                            src={`https://logo.clearbit.com/${company.domain}`}
                            alt={company.name}
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = "none";
                              const span =
                                img.nextElementSibling as HTMLElement | null;
                              if (span) span.style.display = "inline";
                            }}
                          />
                          <span
                            className="font-[Inter] text-black/50 font-bold"
                            style={{ fontSize: "0.52rem", display: "none" }}
                          >
                            {company.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span
                          className="font-[Inter] text-black/50 group-hover:text-black transition-colors"
                          style={{ fontSize: "0.7rem" }}
                        >
                          {company.name}
                        </span>
                      </a>
                    ))}
                  </div>
                )}

              {/* Action bar */}
              <div className="flex flex-wrap gap-2 mt-4 print:hidden">
                <motion.button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="flex items-center gap-2 text-black/40 hover:text-black border border-black/10 px-3.5 py-2 hover:border-black/25 transition-[color,background-color,border-color,opacity,transform,box-shadow] disabled:opacity-40 font-[Inter] rounded-sm"
                  style={{ fontSize: "0.75rem" }}
                  whileHover={{ y: -1 }}
                >
                  {isRegenerating ? (
                    <Loader2 size={13} className="animate-spin" strokeWidth={2} />
                  ) : (
                    <RefreshCw size={13} strokeWidth={1.5} />
                  )}
                  {isRegenerating ? "Regenerating..." : "Regenerate"}
                </motion.button>
                <motion.button
                  onClick={handlePrint}
                  className="flex items-center gap-2 text-black/40 hover:text-black border border-black/10 px-3.5 py-2 hover:border-black/25 transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter] rounded-sm"
                  style={{ fontSize: "0.75rem" }}
                  whileHover={{ y: -1 }}
                >
                  <Download size={13} strokeWidth={1.5} />
                  Download PDF
                </motion.button>
                <motion.button
                  onClick={handleCompare}
                  className="flex items-center gap-2 text-black/40 hover:text-black border border-black/10 px-3.5 py-2 hover:border-black/25 transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter] rounded-sm"
                  style={{ fontSize: "0.75rem" }}
                  whileHover={{ y: -1 }}
                >
                  <Scale size={13} strokeWidth={1.5} />
                  Compare
                </motion.button>
                <motion.button
                  onClick={toggleFavorite}
                  className="flex items-center gap-2 text-black/40 hover:text-black border border-black/10 px-3.5 py-2 hover:border-black/25 transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter] rounded-sm"
                  style={{ fontSize: "0.75rem" }}
                  whileHover={{ y: -1 }}
                >
                  {isFav ? (
                    <Star size={13} className="text-black/50 fill-black/50" strokeWidth={1.5} />
                  ) : (
                    <Star size={13} className="text-black/25" strokeWidth={1.5} />
                  )}
                  {isFav ? "Favorited" : "Favorite"}
                </motion.button>
                <motion.button
                  onClick={handleShare}
                  className="flex items-center gap-2 text-black/40 hover:text-black border border-black/10 px-3.5 py-2 hover:border-black/25 transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter] rounded-sm"
                  style={{ fontSize: "0.75rem" }}
                  whileHover={{ y: -1 }}
                >
                  <Share2 size={13} strokeWidth={1.5} />
                  Share
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Full Description */}
        {passport && personalFit && knowledgeOccupation && (
          <motion.section
            className="mb-8 border-y-4 border-double border-black bg-white p-6"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest">
              Your fit · deterministic passport signal
            </div>
            <div className="mt-4 grid gap-5 sm:grid-cols-[120px_1fr]">
              <div>
                <div className="text-6xl font-[Playfair_Display]">
                  {personalFit.totalScore}
                </div>
                <div className="font-[JetBrains_Mono] text-[10px] uppercase">
                  {personalFit.confidence} confidence
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-[Playfair_Display]">
                  A strong option to explore—not a verdict
                </h2>
                <ul className="mt-2 space-y-1 font-[Inter] text-sm text-black/65">
                  {personalFit.topReasons.slice(0, 3).map((reason) => (
                    <li key={reason}>→ {reason}</li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setFitExplanation(personalFit)}
                    className="min-h-11 border border-black/20 px-4 py-3 font-[Inter] text-sm"
                  >
                    Why this score?
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/pathway/${knowledgeOccupation.id}`)
                    }
                    className="min-h-11 bg-black px-4 py-3 font-[Inter] text-sm text-white"
                  >
                    Build pathway →
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-4 font-[JetBrains_Mono] text-[9px] uppercase text-black/40">
              Deterministic scoring over KB {recommendations?.kbVersion} ·
              profile v{passport.version} · LLM used for wording only.
            </p>
          </motion.section>
        )}
        <Section
          title="About the Role"
          icon={<Briefcase size={16} />}
          delay={0.1}
          sectionRef={registerSection("about")}
        >
          <p
            className="font-[Inter] text-black/65 leading-relaxed whitespace-pre-line"
            style={{ fontSize: "0.92rem" }}
          >
            {currentJob.fullDescription}
          </p>
        </Section>

        {/* The Good, The Bad & The Ugly */}
        <Section
          title="The Good, The Bad & The Ugly"
          icon={<Activity size={16} />}
          delay={0.12}
          sectionRef={registerSection("good-bad-ugly")}
        >
          {gbuLoading ? (
            <div className="flex items-center gap-2 text-black/30">
              <Loader2 size={14} className="animate-spin" />
              <span className="font-[Inter]" style={{ fontSize: "0.82rem" }}>
                Loading honest assessment…
              </span>
            </div>
          ) : gbuData ? (
            <div className="space-y-6">
              {/* The Good */}
              <div>
                <h4
                  className="font-[Inter] font-semibold text-emerald-700 uppercase tracking-[0.12em] mb-3"
                  style={{ fontSize: "0.7rem" }}
                >
                  ✦ The Good
                </h4>
                <div className="space-y-2">
                  {(gbuData.good ?? []).map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 border-l-2 border-emerald-300 pl-3 py-1"
                    >
                      <div>
                        <span
                          className="font-[Inter] font-medium text-black/75"
                          style={{ fontSize: "0.85rem" }}
                        >
                          {item.title}
                        </span>
                        <p
                          className="font-[Inter] text-black/50"
                          style={{ fontSize: "0.8rem" }}
                        >
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* The Bad */}
              <div>
                <h4
                  className="font-[Inter] font-semibold text-amber-700 uppercase tracking-[0.12em] mb-3"
                  style={{ fontSize: "0.7rem" }}
                >
                  ✦ The Bad
                </h4>
                <div className="space-y-2">
                  {(gbuData.bad ?? []).map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 border-l-2 border-amber-300 pl-3 py-1"
                    >
                      <div>
                        <span
                          className="font-[Inter] font-medium text-black/75"
                          style={{ fontSize: "0.85rem" }}
                        >
                          {item.title}
                        </span>
                        <p
                          className="font-[Inter] text-black/50"
                          style={{ fontSize: "0.8rem" }}
                        >
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* The Ugly */}
              <div>
                <h4
                  className="font-[Inter] font-semibold text-red-700 uppercase tracking-[0.12em] mb-3"
                  style={{ fontSize: "0.7rem" }}
                >
                  ✦ The Ugly
                </h4>
                <div className="space-y-2">
                  {(gbuData.ugly ?? []).map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 border-l-2 border-red-300 pl-3 py-1"
                    >
                      <div>
                        <span
                          className="font-[Inter] font-medium text-black/75"
                          style={{ fontSize: "0.85rem" }}
                        >
                          {item.title}
                        </span>
                        <p
                          className="font-[Inter] text-black/50"
                          style={{ fontSize: "0.8rem" }}
                        >
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verdict */}
              <div className="border-t border-black/8 pt-4">
                <p
                  className="font-[Inter] text-black/60 italic leading-relaxed"
                  style={{ fontSize: "0.85rem" }}
                >
                  {gbuData.verdict}
                </p>
              </div>
            </div>
          ) : (
            <p
              className="font-[Inter] text-black/30"
              style={{ fontSize: "0.82rem" }}
            >
              Could not load assessment.
            </p>
          )}
        </Section>

        {/* Skills */}
        <Section
          title="Required Skills"
          icon={<Wrench size={16} />}
          delay={0.15}
          sectionRef={registerSection("skills")}
        >
          <div className="flex flex-wrap gap-2">
            {currentJob.skills.map((skill, i) => (
              <motion.span
                key={skill + i}
                className="font-[Inter] text-black/60 border border-black/12 px-3 py-1.5 hover:bg-black hover:text-white hover:border-black transition-[color,background-color,border-color,opacity,transform,box-shadow] cursor-default"
                style={{ fontSize: "0.82rem" }}
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
        <Section
          title="Education & Qualifications"
          icon={<GraduationCap size={16} />}
          delay={0.2}
          sectionRef={registerSection("education")}
        >
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
                <p
                  className="font-[Inter] text-black/65"
                  style={{ fontSize: "0.9rem" }}
                >
                  {edu}
                </p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Work Environment */}
        <Section
          title="Work Environment"
          icon={<MapPin size={16} />}
          delay={0.25}
          sectionRef={registerSection("environment")}
        >
          <p
            className="font-[Inter] text-black/65 leading-relaxed"
            style={{ fontSize: "0.92rem" }}
          >
            {currentJob.workEnvironment}
          </p>
        </Section>

        {/* Career Path */}
        <Section
          title="Career Progression"
          icon={<TrendingUp size={16} />}
          delay={0.3}
          sectionRef={registerSection("career-path")}
        >
          <p
            className="font-[Inter] text-black/65 leading-relaxed"
            style={{ fontSize: "0.92rem" }}
          >
            {currentJob.careerPath}
          </p>
        </Section>

        {/* Fun Fact */}
        <Section
          title="Did You Know?"
          icon={<Lightbulb size={16} />}
          delay={0.35}
          sectionRef={registerSection("fun-fact")}
        >
          <p
            className="font-[Inter] text-black/65 italic"
            style={{ fontSize: "0.92rem" }}
          >
            {currentJob.funFact}
          </p>
        </Section>

        <motion.div
          ref={registerSection("timeline")}
          className="mt-12 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-black/10" />
            <span
              className="font-[Playfair_Display] text-black"
              style={{ fontSize: "1.3rem" }}
            >
              Life in the Role
            </span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <div className="flex border-2 border-black/15 mb-6 print:hidden">
            {[
              {
                key: "week" as const,
                label: "1 Week",
                icon: <Calendar size={14} />,
              },
              {
                key: "quarter" as const,
                label: "1 Quarter",
                icon: <CalendarDays size={14} />,
              },
              {
                key: "year" as const,
                label: "1 Year",
                icon: <CalendarRange size={14} />,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTimeline(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-[Inter] transition-[color,background-color,border-color,opacity,transform,box-shadow] ${
                  activeTimeline === tab.key
                    ? "bg-black text-white"
                    : "text-black/50 hover:bg-black/5"
                }`}
                style={{ fontSize: "0.82rem" }}
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
                <div
                  className="flex-1 font-[Inter] text-black/65 leading-relaxed"
                  style={{ fontSize: "0.9rem" }}
                >
                  {formatTimelineContent(timelineContent[activeTimeline]).map(
                    (para, i) => {
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
                              <strong className="font-[Inter] font-semibold text-black">
                                {entry.label}:
                              </strong>{" "}
                              <span className="text-black/60">
                                {entry.content}
                              </span>
                            </>
                          ) : (
                            para
                          )}
                        </motion.p>
                      );
                    },
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ── Work-Life Balance Radar ──────────────────────── */}
        {(wlbData || wlbLoading) && (
          <motion.div
            ref={registerSection("wlb")}
            className="mt-10 mb-10 print:hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-black/10" />
              <span
                className="font-[Playfair_Display] text-black flex items-center gap-2"
                style={{ fontSize: "1.15rem" }}
              >
                Work-Life Balance
                <Activity size={14} className="text-black/25" />
              </span>
              <div className="h-px flex-1 bg-black/10" />
            </div>

            {wlbLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-black/30">
                <Loader2 size={16} className="animate-spin" />
                <span className="font-[Inter]" style={{ fontSize: "0.82rem" }}>
                  Analysing work-life balance…
                </span>
              </div>
            ) : wlbData ? (
              <div className="border border-black/10 p-6">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Radar chart */}
                  <div className="w-full md:w-72 shrink-0">
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={wlbData.metrics ?? []}>
                        <PolarGrid stroke="rgba(0,0,0,0.1)" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{
                            fontFamily: "Inter",
                            fontSize: 11,
                            fill: "rgba(0,0,0,0.5)",
                          }}
                        />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="rgba(0,0,0,0.7)"
                          fill="rgba(0,0,0,0.08)"
                          strokeWidth={1.5}
                        />
                        <Tooltip
                          formatter={(v: number) => [`${v}/100`, "Score"]}
                          contentStyle={{
                            fontFamily: "Inter",
                            fontSize: "0.75rem",
                            border: "1px solid rgba(0,0,0,0.15)",
                            borderRadius: 0,
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Summary */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-3xl font-[Playfair_Display] text-black">
                        {wlbData.overallScore}
                      </div>
                      <div>
                        <p
                          className="font-[Inter] text-black/35"
                          style={{
                            fontSize: "0.65rem",
                            letterSpacing: "0.1em",
                          }}
                        >
                          OVERALL SCORE /100
                        </p>
                        <div className="w-32 h-1.5 bg-black/10 mt-1">
                          <div
                            className="h-full bg-black"
                            style={{ width: `${wlbData.overallScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <p
                      className="font-[Inter] text-black/60 mb-4 leading-relaxed"
                      style={{ fontSize: "0.88rem" }}
                    >
                      {wlbData.summary}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-200">
                        <p
                          className="font-[Inter] text-emerald-700 mb-1"
                          style={{
                            fontSize: "0.62rem",
                            letterSpacing: "0.1em",
                          }}
                        >
                          BEST FOR
                        </p>
                        <p
                          className="font-[Inter] text-black/65"
                          style={{ fontSize: "0.82rem" }}
                        >
                          {wlbData.bestFor}
                        </p>
                      </div>
                      <div className="p-3 bg-rose-50 border border-rose-200">
                        <p
                          className="font-[Inter] text-rose-700 mb-1"
                          style={{
                            fontSize: "0.62rem",
                            letterSpacing: "0.1em",
                          }}
                        >
                          CHALLENGING FOR
                        </p>
                        <p
                          className="font-[Inter] text-black/65"
                          style={{ fontSize: "0.82rem" }}
                        >
                          {wlbData.worstFor}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* ── Learn More ──────────────────────────────────── */}
        {(learnMore || learnMoreLoading) && (
          <motion.div
            ref={registerSection("learn-more")}
            className="mt-10 mb-10 print:hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-black/10" />
              <span
                className="font-[Playfair_Display] text-black flex items-center gap-2"
                style={{ fontSize: "1.15rem" }}
              >
                Learn More
                <BookOpen size={14} className="text-black/25" />
              </span>
              <div className="h-px flex-1 bg-black/10" />
            </div>

            {learnMoreLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-black/30">
                <Loader2 size={16} className="animate-spin" />
                <span className="font-[Inter]" style={{ fontSize: "0.82rem" }}>
                  Finding resources…
                </span>
              </div>
            ) : learnMore ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Subreddits */}
                {learnMore.subreddits.length > 0 && (
                  <div className="border border-black/10 p-5">
                    <h4
                      className="font-[Inter] text-black/35 uppercase tracking-[0.1em] mb-3 flex items-center gap-1.5"
                      style={{ fontSize: "0.62rem" }}
                    >
                      <Hash size={11} /> Subreddits
                    </h4>
                    <ul className="space-y-2.5">
                      {(learnMore.subreddits ?? []).map((sr, i) => (
                        <li key={i}>
                          <a
                            href={`https://reddit.com/${sr.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 group"
                          >
                            <ExternalLink
                              size={12}
                              className="text-black/25 mt-1 shrink-0 group-hover:text-black transition-colors"
                            />
                            <div>
                              <p
                                className="font-[Inter] text-black group-hover:underline"
                                style={{ fontSize: "0.82rem" }}
                              >
                                {sr.name}
                              </p>
                              <p
                                className="font-[Inter] text-black/40"
                                style={{ fontSize: "0.72rem" }}
                              >
                                {sr.description}
                              </p>
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Certifications */}
                {learnMore.certifications.length > 0 && (
                  <div className="border border-black/10 p-5">
                    <h4
                      className="font-[Inter] text-black/35 uppercase tracking-[0.1em] mb-3 flex items-center gap-1.5"
                      style={{ fontSize: "0.62rem" }}
                    >
                      <Award size={11} /> Certifications
                    </h4>
                    <ul className="space-y-2.5">
                      {(learnMore.certifications ?? []).map((cert, i) => (
                        <li key={i}>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(cert.name + " certification " + cert.provider)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start gap-1.5"
                          >
                            <ExternalLink
                              size={11}
                              className="text-black/20 mt-1 shrink-0 group-hover:text-black transition-colors"
                            />
                            <div>
                              <p
                                className="font-[Inter] text-black group-hover:underline"
                                style={{ fontSize: "0.82rem" }}
                              >
                                {cert.name}
                              </p>
                              <p
                                className="font-[Inter] text-black/40"
                                style={{ fontSize: "0.72rem" }}
                              >
                                {cert.provider}
                              </p>
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Search terms */}
                {learnMore.searchTerms.length > 0 && (
                  <div className="border border-black/10 p-5">
                    <h4
                      className="font-[Inter] text-black/35 uppercase tracking-[0.1em] mb-3 flex items-center gap-1.5"
                      style={{ fontSize: "0.62rem" }}
                    >
                      <ArrowRight size={11} /> Search Terms
                    </h4>
                    <ul className="space-y-2.5">
                      {(learnMore.searchTerms ?? []).map((st, i) => (
                        <li key={i}>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(st.term)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group"
                          >
                            <p
                              className="font-[Inter] text-black group-hover:underline"
                              style={{ fontSize: "0.82rem" }}
                            >
                              "{st.term}"
                            </p>
                            <p
                              className="font-[Inter] text-black/40"
                              style={{ fontSize: "0.72rem" }}
                            >
                              {st.context}
                            </p>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Books */}
                {learnMore.books.length > 0 && (
                  <div className="border border-black/10 p-5">
                    <h4
                      className="font-[Inter] text-black/35 uppercase tracking-[0.1em] mb-3 flex items-center gap-1.5"
                      style={{ fontSize: "0.62rem" }}
                    >
                      <BookOpen size={11} /> Recommended Books
                    </h4>
                    <ul className="space-y-2.5">
                      {(learnMore.books ?? []).map((book, i) => (
                        <li key={i}>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(book.title + " by " + book.author)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start gap-1.5"
                          >
                            <ExternalLink
                              size={11}
                              className="text-black/20 mt-1 shrink-0 group-hover:text-black transition-colors"
                            />
                            <div>
                              <p
                                className="font-[Inter] text-black font-medium group-hover:underline"
                                style={{ fontSize: "0.82rem" }}
                              >
                                {book.title}
                              </p>
                              <p
                                className="font-[Inter] text-black/40"
                                style={{ fontSize: "0.72rem" }}
                              >
                                by {book.author}
                              </p>
                              <p
                                className="font-[Inter] text-black/50"
                                style={{ fontSize: "0.72rem" }}
                              >
                                {book.why}
                              </p>
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}

        {/* Related Careers — shown after Learn More */}
        {preferences.showRelatedCareers &&
          (relatedCareers.length > 0 || loadingRelated) && (
            <motion.div
              ref={registerSection("related")}
              className="mt-10 mb-10 print:hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-black/10" />
                <span
                  className="font-[Playfair_Display] text-black flex items-center gap-2"
                  style={{ fontSize: "1.15rem" }}
                >
                  Related Careers
                  <Sparkles size={12} className="text-black/25" />
                </span>
                <div className="h-px flex-1 bg-black/10" />
              </div>

              {loadingRelated ? (
                <div className="flex items-center justify-center gap-2 py-6 text-black/30">
                  <Loader2 size={16} className="animate-spin" />
                  <span
                    className="font-[Inter]"
                    style={{ fontSize: "0.82rem" }}
                  >
                    Finding related careers...
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {relatedCareers.slice(0, 5).map((career, i) => (
                    <motion.button
                      key={career.title}
                      onClick={() => handleExploreRelated(career.title)}
                      disabled={exploringRelated !== null}
                      className="text-left border border-black/10 p-4 hover:border-black/25 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] transition-[color,background-color,border-color,opacity,transform,box-shadow] group disabled:opacity-50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      whileHover={{ y: -2 }}
                    >
                      <h4
                        className="font-[Playfair_Display] text-black group-hover:underline mb-1"
                        style={{ fontSize: "0.95rem" }}
                      >
                        {exploringRelated === career.title ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          career.title
                        )}
                      </h4>
                      <p
                        className="font-[Inter] text-black/30 mb-1"
                        style={{ fontSize: "0.68rem" }}
                      >
                        {career.similarity}
                      </p>
                      <p
                        className="font-[Inter] text-black/50"
                        style={{ fontSize: "0.78rem" }}
                      >
                        {career.description}
                      </p>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        {/* ── Level Up — Affiliate Learning Links ─────────────── */}
        {(() => {
          const cat = currentJob.category || "";
          type AffLink = { label: string; provider: string; url: string };
          const links: AffLink[] = [];
          if (cat.includes("Technology") || cat.includes("Engineering")) {
            links.push(
              {
                label: "Top Tech Courses",
                provider: "Scaler",
                url: "https://www.scaler.com/courses/?utm_source=careercasehq",
              },
              {
                label: "Online Certifications",
                provider: "Coursera",
                url: "https://www.coursera.org/browse/computer-science?utm_source=careercasehq",
              },
              {
                label: "Project-based Learning",
                provider: "Udemy",
                url: "https://www.udemy.com/topic/software-development/?utm_source=careercasehq",
              },
            );
          } else if (cat.includes("Healthcare") || cat.includes("Social")) {
            links.push(
              {
                label: "Healthcare Courses",
                provider: "Coursera",
                url: "https://www.coursera.org/browse/health?utm_source=careercasehq",
              },
              {
                label: "Clinical Skills",
                provider: "Udemy",
                url: "https://www.udemy.com/topic/medical/?utm_source=careercasehq",
              },
            );
          } else if (cat.includes("Finance") || cat.includes("Management")) {
            links.push(
              {
                label: "Finance & MBA Prep",
                provider: "Coursera",
                url: "https://www.coursera.org/browse/business?utm_source=careercasehq",
              },
              {
                label: "Finance Courses",
                provider: "Udemy",
                url: "https://www.udemy.com/topic/finance/?utm_source=careercasehq",
              },
            );
          } else if (cat.includes("Creative") || cat.includes("Design")) {
            links.push(
              {
                label: "Design & Creative",
                provider: "Coursera",
                url: "https://www.coursera.org/browse/arts-and-humanities?utm_source=careercasehq",
              },
              {
                label: "Creative Skills",
                provider: "Udemy",
                url: "https://www.udemy.com/topic/design/?utm_source=careercasehq",
              },
            );
          } else {
            links.push(
              {
                label: "Professional Courses",
                provider: "Coursera",
                url: "https://www.coursera.org?utm_source=careercasehq",
              },
              {
                label: "Skill Building",
                provider: "Udemy",
                url: "https://www.udemy.com?utm_source=careercasehq",
              },
            );
          }
          links.push({
            label: "Internships & Entry Jobs",
            provider: "Internshala",
            url: "https://internshala.com?utm_source=careercasehq",
          });
          return (
            <motion.div
              className="mt-8 mb-6 print:hidden"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="border border-black/8 rounded-lg p-5">
                <p
                  className="font-[Inter] text-black/30 uppercase tracking-[0.15em] mb-3"
                  style={{ fontSize: "0.6rem" }}
                >
                  Level Up
                </p>
                <div className="flex flex-wrap gap-2">
                  {links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-black/12 hover:border-black/30 hover:shadow-sm transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter] text-black/60 hover:text-black"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <ExternalLink size={10} className="text-black/25" />
                      <span>{link.label}</span>
                      <span className="text-black/25">— {link.provider}</span>
                    </a>
                  ))}
                </div>
                <p
                  className="font-[Inter] text-black/20 mt-2.5"
                  style={{ fontSize: "0.6rem" }}
                >
                  Affiliate links — we may earn a small commission at no extra
                  cost to you
                </p>
              </div>
            </motion.div>
          );
        })()}

        <motion.div
          ref={registerSection("actions")}
          className="flex flex-col sm:flex-row gap-4 mt-10 mb-4 print:hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            ref={simulateBtnRef}
            onClick={() => navigate("/simulation")}
            className="flex-1 flex items-center justify-center gap-3 bg-black text-white py-4 px-6 hover:bg-black/85 transition-colors font-[Inter] group"
            style={{ fontSize: "0.95rem" }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Play
              size={20}
              className="group-hover:translate-x-0.5 transition-transform"
            />
            Start Day-in-the-Life Simulation
          </motion.button>

          <motion.button
            onClick={() => void handleCompatibilityCheck()}
            disabled={checkingCompatibility}
            className="flex items-center justify-center gap-2 border-2 border-black/20 py-4 px-6 font-[Inter] text-black/60 hover:border-black/40 hover:text-black disabled:opacity-40"
            style={{ fontSize: "0.88rem" }}
            whileHover={checkingCompatibility ? {} : { scale: 1.01 }} whileTap={checkingCompatibility ? {} : { scale: 0.99 }}
          >
            {checkingCompatibility ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            Does it fit me?
          </motion.button>

          <motion.button
            onClick={() => navigate("/interview-prep")}
            className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-4 px-6 hover:border-black/40 hover:text-black transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter]"
            style={{ fontSize: "0.88rem" }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <UserCheck size={18} />
            Interview Prep
            <Sparkles size={12} className="text-black/30" />
          </motion.button>

          <motion.button
            onClick={() => {
              setShowChat(true);
              sounds.slide();
            }}
            className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-4 px-6 hover:border-black/40 hover:text-black transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter]"
            style={{ fontSize: "0.88rem" }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <MessageCircle size={18} />
            Ask Questions
            <Sparkles size={12} className="text-black/30" />
          </motion.button>
        </motion.div>

        {(compatibility || checkingCompatibility) && <div className="mb-8 border-l-4 border-[var(--accent-news)] border-y border-r border-black/15 bg-black/[.015] p-6 print:hidden">
          <p className="mb-3 flex items-center gap-2 font-mono-ui text-[.65rem] uppercase tracking-[.12em] text-[var(--accent-news)]"><Sparkles size={13}/> Personal compatibility check</p>
          {checkingCompatibility ? <div className="flex items-center gap-2 text-sm text-black/50"><Loader2 size={15} className="animate-spin"/> Reading your Passport and this dossier…</div> : <div className="whitespace-pre-wrap font-[Inter] text-sm leading-relaxed text-black/75">{compatibility}</div>}
        </div>}

        {/* Roadmap + Transition CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-20 sm:mb-10 print:hidden">
          <motion.button
            onClick={() =>
              navigate(`/roadmap?job=${encodeURIComponent(currentJob.title)}`)
            }
            className="flex items-center justify-center gap-2 border border-black/15 text-black/55 py-3 px-4 hover:border-black/35 hover:text-black transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter]"
            style={{ fontSize: "0.85rem" }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <TrendingUp size={15} />
            Build My Roadmap
          </motion.button>
          <motion.button
            onClick={() =>
              navigate(
                `/career-transition?to=${encodeURIComponent(currentJob.title)}`,
              )
            }
            className="flex items-center justify-center gap-2 border border-black/15 text-black/55 py-3 px-4 hover:border-black/35 hover:text-black transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter]"
            style={{ fontSize: "0.85rem" }}
            aria-label="Plan a career transition into this role"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <ArrowRight size={15} />
            Transition Into This Role
          </motion.button>
        </div>
      </div>

      {/* Floating "Jump to Simulation" button */}
      <AnimatePresence>
        {showJumpBtn && (
          <motion.button
            onClick={() =>
              simulateBtnRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }
            className="fixed bottom-20 sm:bottom-6 right-4 z-30 flex items-center gap-2 bg-black text-white px-4 py-2.5 shadow-lg font-[Inter] print:hidden"
            style={{ fontSize: "0.82rem" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Play size={14} />
            Jump to Simulation
          </motion.button>
        )}
      </AnimatePresence>

      {/* Back to top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="fixed bottom-20 sm:bottom-6 left-4 z-30 flex items-center justify-center w-9 h-9 border border-black/20 bg-background/90 backdrop-blur-sm text-black/50 hover:text-black hover:border-black/40 transition-colors shadow-sm print:hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={14} className="rotate-90" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => {
                setShowChat(false);
                sounds.slide();
              }}
            />
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
                    <h3
                      className="font-[Playfair_Display] text-black flex items-center gap-2"
                      style={{ fontSize: "1.05rem" }}
                    >
                      Ask about {currentJob.title}
                      <Sparkles size={12} className="text-black/25" />
                    </h3>
                    <p
                      className="font-[Inter] text-black/40"
                      style={{ fontSize: "0.7rem" }}
                    >
                      Ask AI chat is included
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowChat(false);
                    sounds.slide();
                  }}
                  className="text-black/30 hover:text-black transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <StickFigure
                      pose="thinking"
                      size={64}
                      className="mx-auto mb-4 text-black/30"
                    />
                    <p
                      className="font-[Inter] text-black/30"
                      style={{ fontSize: "0.85rem" }}
                    >
                      Ask anything about being a {currentJob.title}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {[
                        "What's the work-life balance like?",
                        "What's the hardest part?",
                        "How do I get started?",
                        "What's the salary progression?",
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => setChatInput(q)}
                          className="font-[Inter] text-black/40 border border-black/10 px-3 py-1.5 hover:bg-black/5 transition-colors"
                          style={{ fontSize: "0.75rem" }}
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
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 font-[Inter] ${
                        msg.role === "user"
                          ? "bg-black text-white"
                          : "bg-black/5 text-black/70 border border-black/10"
                      }`}
                      style={{ fontSize: "0.88rem", lineHeight: 1.6 }}
                    >
                      {msg.text ? (
                        msg.role === "assistant" ? (
                          renderMarkdown(msg.text)
                        ) : (
                          msg.text
                        )
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

              <div className="border-t border-black/10 p-4">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                    placeholder={
                      isStreaming
                        ? "AI is responding..."
                        : "Type your question..."
                    }
                    disabled={isStreaming}
                    className="flex-1 border border-black/15 px-4 py-2.5 font-[Inter] text-black/70 placeholder:text-black/25 outline-none focus:border-black/40 disabled:bg-black/3"
                    style={{ fontSize: "0.88rem" }}
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

      {/* Mobile floating action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden bg-[#f9f8f7]/95 backdrop-blur-md border-t border-black/10 flex print:hidden">
        {knowledgeOccupation && <button onClick={()=>navigate(`/pathway/${knowledgeOccupation.id}`)} data-testid="job-detail-build-pathway" aria-label="Build my pathway" className="flex-[1.6] bg-black px-3 py-3 font-mono-ui text-xs uppercase text-white">Build my pathway</button>}
        <button
          onClick={() => {
            sounds.click();
            navigate(
              `/simulation?job=${encodeURIComponent(currentJob?.title ?? "")}`,
            );
          }}
          aria-label="Start day-in-the-life simulation"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-black/60 hover:text-black transition-colors"
        >
          <Play size={17} />
          <span
            style={{ fontSize: "0.58rem", letterSpacing: "0.05em" }}
            className="font-[Inter] uppercase"
          >
            Simulate
          </span>
        </button>
        <button
          onClick={() => {
            sounds.click();
            navigate(
              `/interview-prep?job=${encodeURIComponent(currentJob?.title ?? "")}`,
            );
          }}
          aria-label="Go to interview prep"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-black/60 hover:text-black transition-colors"
        >
          <UserCheck size={17} />
          <span
            style={{ fontSize: "0.58rem", letterSpacing: "0.05em" }}
            className="font-[Inter] uppercase"
          >
            Interview
          </span>
        </button>
        <button
          onClick={() => {
            setShowChat(true);
            sounds.slide();
          }}
          aria-label="Ask AI about this career"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-black/60 hover:text-black transition-colors"
        >
          <MessageCircle size={17} />
          <span
            style={{ fontSize: "0.58rem", letterSpacing: "0.05em" }}
            className="font-[Inter] uppercase"
          >
            Ask AI
          </span>
        </button>
        <button
          onClick={handleShare}
          aria-label="Copy share link for this dossier"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-black/60 hover:text-black transition-colors"
        >
          <Share2 size={17} />
          <span
            style={{ fontSize: "0.58rem", letterSpacing: "0.05em" }}
            className="font-[Inter] uppercase"
          >
            Share
          </span>
        </button>
      </div>
      <div className="mx-auto max-w-6xl px-6 print:hidden"><TrustStrip /></div>
      {fitExplanation && passport && (
        <WhyPanel
          recommendation={fitExplanation}
          segment={passport.segment}
          onClose={() => setFitExplanation(null)}
        />
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  delay = 0,
  sectionRef,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  sectionRef?: (el: HTMLElement | null) => void;
}) {
  return (
    <motion.div
      ref={sectionRef}
      className="mb-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="rule-top flex items-center gap-2.5 mb-4 pt-3">
        <span className="text-black/40">{icon}</span>
        <span className="label-caps">Case section</span><h2 className="font-display text-2xl text-black">
          {title}
        </h2>
        <div className="h-px flex-1 bg-black/8" />
      </div>
      {children}
    </motion.div>
  );
}
