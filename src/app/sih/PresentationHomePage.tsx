import { Link, Navigate } from 'react-router';
import { isPresentationMode } from '../components/PresentationSwitcher';

const core = [
  ['01', 'Student', 'My Career', 'Private skill profile, career direction and assessments — never recruiter scoring.', '/career'],
  ['02', 'Student', 'Featured opportunity', 'Open the Clinical Research Data & Standardization Intern opportunity without searching.', '/opportunities/f0443000-0000-4000-8000-000000000002'],
  ['03', 'Student', 'Explainable readiness', 'See which requirements are supported, weak or currently unknown.', '/opportunities/f0443000-0000-4000-8000-000000000002/readiness'],
  ['04', 'Student', 'My verified evidence', 'Follow Data Visualization evidence from claim through faculty verification.', '/evidence?highlight=Data%20Visualization'],
  ['05', 'Student', 'Application', 'Review a consented snapshot, selected evidence and application timeline.', '/applications/a080bafe-ec71-4fd5-99b2-19ed8ac8cb87'],
  ['06', 'Recruiter', 'Recruiter review', 'Review consented evidence. Private Career Guidance remains private.', '/industry/applicants'],
  ['07', 'Institution', 'Institution action', 'Turn skills signals into named, human-owned interventions.', '/institution/interventions'],
] as const;
const platform = [
  ['Student growth', [['My Skill Profile', '/passport'], ['Assessments', '/assess'], ['Career directions', '/job'], ['Opportunities', '/opportunities'], ['My Verified Evidence', '/evidence'], ['Learning & Practice', '/development'], ['Applications', '/applications']]],
  ['Industry & recruitment', [['Opportunity management', '/industry/opportunities'], ['Applications to review', '/industry/applicants'], ['Questionnaires', '/industry/questionnaires'], ['Learning programs', '/development/manage'], ['Collaborations', '/collaborations']]],
  ['Faculty & academia', [['Faculty opportunities', '/faculty/opportunities'], ['Verification', '/verification'], ['Engagement history', '/faculty/engagements'], ['Collaborations', '/faculty/collaborations']]],
  ['Institution', [['Skills intelligence', '/institution/skills-intelligence'], ['Interventions', '/institution/interventions'], ['Collaborations', '/collaborations']]],
  ['Policy & governance', [['Policy skills intelligence', '/institution/skills-intelligence?presentation=policy']]],
] as const;

export function PresentationHomePage() {
  if (!isPresentationMode()) return <Navigate to="/" replace />;
  return <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
    <header className="border-b-2 border-black pb-6"><p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent-news)]">Presentation control system</p><h1 className="mt-2 font-display text-4xl leading-none md:text-6xl">Demo home</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-black/65">A seven-step story for the product demonstration. The complete platform remains one click away.</p></header>
    <section className="mt-8" aria-labelledby="core-story"><div className="flex items-baseline justify-between gap-4"><h2 id="core-story" className="font-display text-3xl">Core story</h2><span className="font-mono-ui text-[10px] font-black uppercase tracking-wide">7 steps</span></div><ol className="mt-4 grid gap-3 md:grid-cols-2">{core.map(([number, persona, title, detail, to]) => <li key={number} className="grid grid-cols-[auto_1fr] gap-x-4 border-2 border-black bg-white p-4 shadow-[3px_3px_0_#111]"><span className="font-mono-ui text-xl font-black text-[var(--accent-news)]">{number}</span><div><p className="font-mono-ui text-[10px] font-black uppercase tracking-wide text-black/50">{persona}</p><h3 className="mt-1 text-xl font-black">{title}</h3><p className="mt-1 text-sm leading-5 text-black/65">{detail}</p><Link to={to} className="mt-3 inline-flex min-h-9 items-center border-2 border-black bg-[#e7ff57] px-3 font-mono-ui text-[10px] font-black uppercase">Open</Link></div></li>)}</ol></section>
    <section id="platform" className="mt-12 border-t-2 border-black pt-7" aria-labelledby="platform-tour"><p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent-news)]">Beyond the core story</p><h2 id="platform-tour" className="mt-2 font-display text-3xl">Full platform tour</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{platform.map(([heading, links]) => <section key={heading} className="border-2 border-black bg-[var(--paper)] p-4"><h3 className="font-mono-ui text-xs font-black uppercase tracking-wide">{heading}</h3><div className="mt-3 flex flex-wrap gap-2">{links.map(([label, to]) => <Link key={label} to={to} className="border border-black/30 bg-white px-3 py-2 text-sm hover:bg-[#e7ff57] focus-visible:outline-2">{label}</Link>)}</div></section>)}</div><p className="mt-6 border-l-4 border-black bg-white p-4 text-sm"><strong>Platform trust:</strong> consented disclosure, verified evidence, immutable applications, role-based access and secure artifacts. Integration-ready is never presented as an active integration.</p></section>
  </main>;
}
