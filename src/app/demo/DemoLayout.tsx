import { NavLink, Outlet } from 'react-router';
import { DemoDisclosure } from '../components/demo/DemoDisclosure';
import { useDemoSih } from '../context/DemoSihContext';

const views = [
  ['/demo', 'Overview'],
  ['/demo/student', 'Student'],
  ['/demo/mentor', 'Mentor'],
  ['/demo/recruiter', 'Recruiter'],
  ['/demo/institution', 'Institution'],
  ['/demo/faculty', 'Faculty'],
] as const;

export function DemoLayout() {
  const { dispatch } = useDemoSih();
  return (
    <div className="min-h-screen bg-[#f2eee4] text-[#111]">
      <a href="#demo-main" className="skip-nav">Skip to controlled demo content</a>
      <DemoDisclosure />
      <header className="border-b-2 border-black bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <NavLink to="/demo" className="text-xl font-black tracking-tight">CareerCase / SIH26044 Foundation</NavLink>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-black/55">Controlled reference implementation · in-memory only</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <nav className="flex max-w-full gap-1 overflow-x-auto pb-1" aria-label="Controlled role view switcher">
              {views.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/demo'}
                  className={({ isActive }) => `min-h-11 whitespace-nowrap border border-black px-3 py-3 font-mono-ui text-[10px] font-bold uppercase tracking-wide focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35] ${isActive ? 'bg-black text-white' : 'bg-white hover:bg-[#e7ff57]'}`}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESET_CONTROLLED_DEMO' })}
              className="min-h-11 border-2 border-black bg-[#ff5c35] px-4 py-2 font-mono-ui text-[10px] font-black uppercase tracking-wide text-white shadow-[3px_3px_0_#111] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
            >
              Reset controlled demo
            </button>
          </div>
        </div>
        <p className="mx-auto max-w-[1440px] px-4 pb-3 font-mono-ui text-[10px] uppercase tracking-wide text-black/55">
          View switcher only — this is not production authorization or RBAC.
        </p>
      </header>
      <main id="demo-main" className="mx-auto max-w-[1440px] px-4 py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
