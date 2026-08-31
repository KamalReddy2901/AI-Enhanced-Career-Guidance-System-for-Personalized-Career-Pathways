import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { createDemoInitialState, demoReducer } from '../demo/demoReducer';
import {
  buildDemoInstitutionAnalytics,
  buildDemoRecruiterSharePreview,
  currentDemoReadiness,
  currentDemoRecruiterProjection,
} from '../demo/demoScenario';
import type { DemoAction, DemoDerivedState, DemoState } from '../demo/demoTypes';

interface DemoSihContextValue extends DemoDerivedState {
  readonly state: DemoState;
  readonly dispatch: (action: DemoAction) => void;
}

const DemoSihContext = createContext<DemoSihContextValue | undefined>(undefined);

export function DemoSihProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(demoReducer, undefined, createDemoInitialState);
  const value = useMemo<DemoSihContextValue>(() => ({
    state,
    dispatch,
    currentReadiness: currentDemoReadiness(state),
    recruiterSharePreview: buildDemoRecruiterSharePreview(state),
    recruiterProjection: currentDemoRecruiterProjection(state),
    institutionAnalytics: buildDemoInstitutionAnalytics(state),
  }), [state]);
  return <DemoSihContext.Provider value={value}>{children}</DemoSihContext.Provider>;
}

export function useDemoSih(): DemoSihContextValue {
  const context = useContext(DemoSihContext);
  if (!context) throw new Error('useDemoSih must be used within DemoSihProvider');
  return context;
}
