# CareerCase 🎯

**AI-assisted, evidence-led career guidance for India**

[![Demo Ready](https://img.shields.io/badge/status-demo--ready-green)](https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)

> A functional web prototype that helps individuals build a Career Passport, complete assessments, discover career matches, compare pathways, and explore roles through AI-assisted simulations and counseling.

---

## 🌟 Overview

CareerCase is an AI-enhanced career guidance platform designed for the Indian context, addressing Smart India Hackathon 2026 problem statement **SIH260480**. It combines **deterministic recommendation logic** with **generative AI assistance** to provide explainable, evidence-based career guidance.

### Key Differentiators

- **Hybrid Architecture**: Deterministic scoring (not AI-generated) + AI-assisted exploration
- **Evidence-Based Profile**: Skills carry confidence metadata and evidence sources
- **Multi-Objective Recommendations**: 11 weighted components with full transparency
- **Multiple Pathways**: Focused, lower-risk, and credential-first routes for each occupation
- **NCO/NSQF Grounded**: 100 occupations mapped to Indian occupational standards
- **Multilingual Support**: English, Hindi, and Telugu UI coverage

---

## 🚀 Features

### Career Passport
- Five user segments: school student, college student, job seeker, career switcher, professional
- Multi-source evidence: education, experience, assessments, projects, work samples
- Weighted completeness contract (100 points across 6 categories)
- Manual and AI-extracted skills with confidence tracking

### Assessments
- **RIASEC Interest Inventory**: 36-item Holland Code assessment
- **Aptitude Screener**: 24-item adaptive form (numerical, verbal, logical, spatial)
- **Work Values**: 15 comparisons across 6 dimensions
- **Aspirations**: Structured prompts with optional AI extraction

### Deterministic Recommendation Engine
Transparent 11-component scoring system:
1. Interest similarity (RIASEC)
2. Aptitude fit
3. Values alignment
4. Current skill coverage
5. Transferable evidence
6. Related experience
7. Aspiration match
8. Market signals
9. Progression options
10. Learning feasibility
11. Geographic fit

**13 diverse recommendations** across safe, stretch, and ambitious groupings with full component breakdown.

### Gap & Pathway Planning
- **Skill Gap Index**: Proficiency × importance × confidence
- **Readiness Score**: `100 - SGI` (planning signal, not success probability)
- **Three Routes per Occupation**:
  - Focused route (direct path)
  - Lower-risk route (stepping stones)
  - Credential-first route (formal qualifications)
- Gantt and checklist views with progress tracking

### AI-Assisted Exploration
- Career dossiers (grounded in knowledge base when available)
- Career simulations and interview preparation
- Grounded counselor with evidence-aware responses
- Career comparisons and transition plans
- Roadmap generation

---

## 🏗️ Architecture

### Frontend
- **React 18** with **TypeScript**
- **React Router 7** for routing
- **Vite 6** build tool
- **Tailwind CSS 4** for styling
- **Motion**, **GSAP**, **Three.js**, **Recharts** for animations and visualizations

### Backend Services
- **Supabase**: Authentication and guidance persistence
- **Cloudflare Worker**: Groq API proxy with key rotation and retry logic
- **Cloudflare Pages**: Static site hosting

### AI Infrastructure
- **Groq models**: `openai/gpt-oss-20b` and `openai/gpt-oss-120b`
- Tiered routing: lighter tasks → 20B, complex reasoning → 120B
- Authenticated worker prevents client-side key exposure
- Automatic key rotation, quarantine, and retry policies

---

## 📊 Knowledge Base

| Entity | Count |
|--------|------:|
| Occupations | 100 |
| Skills | 178 |
| Qualifications | 105 |
| Occupation Transitions | 300 |
| Market Signals | 100 |
| Vocational Entry Roles | 61 |

All occupations validated with structural integrity checks and three-route generation.

---

## 🛠️ Setup & Development

### Prerequisites
- Node.js 18+ (specified in `.node-version`)
- npm or pnpm
- Supabase account (for persistence)
- Groq API keys (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways.git
cd AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and other credentials

# Set up the Cloudflare Worker
cd worker
npm install
cp wrangler.toml.example wrangler.toml
# Configure Groq API keys as Cloudflare secrets
cd ..
```

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_PROXY_URL=your_cloudflare_worker_url
```

### Database Setup

```bash
# Run the Supabase migration
# Import supabase-guidance-migration.sql into your Supabase project
```

### Development

```bash
# Run type checking
npm run typecheck

# Validate knowledge base
npm run kb:validate

# Run guidance QA
npm run qa:guidance

# Run product audit
npm run qa:product

# Start development server
npm run dev
```

### Production Build

```bash
npm run build
```

---

## 🧪 Quality Assurance

### Automated Checks

```bash
# Type checking
npm run typecheck

# Knowledge base validation (178 skills, 100 occupations, 105 qualifications)
npm run kb:validate

# Guidance engine regression tests
npm run qa:guidance-regression

# Product audit (completeness contract, assessment flow, pathway stability)
npm run qa:product

# Worker unit tests (12 tests: key rotation, retry logic, policy handling)
cd worker && npm test
```

### Worker Key Health Check

```bash
cd worker
npm run keys:check
```

Validates:
- Key authentication
- Model availability
- JSON mode parsing
- SSE streaming completeness

---

## 📱 User Journey

### New User
1. Sign up and complete onboarding consent
2. Select segment and configure profile (education, experience, constraints)
3. Complete 4 assessment sections (interests, aptitude, values, aspirations)
4. Review Career Passport completeness (weighted 100-point contract)
5. Explore 13 ranked career recommendations with evidence
6. Build and save a pathway with 3 route options
7. Track progress and explore via dossiers, simulations, counselor

### Returning User
- Dashboard shows next incomplete canonical section
- Saved recommendations, pathways, progress, and history restored
- Evidence accumulation updates readiness dynamically

---

## 🌐 Deployment

### Cloudflare Pages (Frontend)
```bash
npm run build
# Deploy dist/ to Cloudflare Pages
```

### Cloudflare Worker (API Proxy)
```bash
cd worker
wrangler deploy
```

---

## 🎯 Current Status

**✅ Demo-ready and suitable for controlled user pilots**

### Implemented
- ✅ Deterministic recommendation engine with 11 components
- ✅ 4 assessment types (RIASEC, aptitude, values, aspirations)
- ✅ Career Passport with evidence tracking
- ✅ Gap analysis and 3-route pathway planning
- ✅ AI-assisted exploration (dossiers, simulations, counselor)
- ✅ Multilingual UI (English, Hindi, Telugu)
- ✅ Data export and deletion controls
- ✅ Supabase persistence with local fallback
- ✅ Worker key rotation and retry policies (12/12 tests passing)

### Not Yet Production-Ready
- ⚠️ Psychometric validation of assessments pending
- ⚠️ Real-time labor market data integration pending
- ⚠️ Security review and penetration testing pending
- ⚠️ Accessibility audit (WCAG 2.2 AA) pending
- ⚠️ Automated browser test coverage pending
- ⚠️ Government integration (SIDH, NCS, DigiLocker) pending
- ⚠️ Field pilots with representative user cohorts pending

See `PROJECT_BRIEF.md` for full readiness assessment and recommended path to production.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

This project was developed for Smart India Hackathon 2026. Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Contact

**Project Maintainer**: [Kamal Reddy](https://github.com/KamalReddy2901)

**Problem Statement**: SIH260480 - AI-Enhanced Career Guidance System for Personalized Career Pathways

---

## 🙏 Acknowledgments

- Smart India Hackathare 2026 for the problem statement
- NCO (National Classification of Occupations) for occupational taxonomy
- NSQF (National Skills Qualifications Framework) for skill level standards
- Groq for fast LLM inference
- Supabase for backend infrastructure
- Cloudflare for edge deployment

---

**⚠️ Disclaimer**: CareerCase is a prototype for evaluation purposes. Assessment results and career recommendations should be validated by qualified career counselors before making major life decisions. Market data and salary estimates are indicative, not authoritative labor statistics.
