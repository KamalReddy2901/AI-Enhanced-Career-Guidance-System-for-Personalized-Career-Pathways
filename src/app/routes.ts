import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { RootLayout } from './pages/RootLayout';

const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const JobOverviewPage = lazy(() => import('./pages/JobOverviewPage').then(m => ({ default: m.JobOverviewPage })));
const JobDetailPage = lazy(() => import('./pages/JobDetailPage').then(m => ({ default: m.JobDetailPage })));
const SimulationPage = lazy(() => import('./pages/SimulationPage').then(m => ({ default: m.SimulationPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const QuizPage = lazy(() => import('./pages/QuizPage').then(m => ({ default: m.QuizPage })));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage').then(m => ({ default: m.ComparisonPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const InterviewPrepPage = lazy(() => import('./pages/InterviewPrepPage').then(m => ({ default: m.InterviewPrepPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const MoodMatchPage = lazy(() => import('./pages/MoodMatchPage').then(m => ({ default: m.MoodMatchPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const CareerTransitionPage = lazy(() => import('./pages/CareerTransitionPage').then(m => ({ default: m.CareerTransitionPage })));
const CareerRoadmapPage = lazy(() => import('./pages/CareerRoadmapPage').then(m => ({ default: m.CareerRoadmapPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));

// ── Phase 1: Guidance system pages ───────────────────────────────────────
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const AssessmentHubPage = lazy(() => import('./pages/AssessmentHubPage').then(m => ({ default: m.AssessmentHubPage })));
const AssessRiasecPage = lazy(() => import('./pages/AssessRiasecPage').then(m => ({ default: m.AssessRiasecPage })));
const AssessAptitudePage = lazy(() => import('./pages/AssessAptitudePage').then(m => ({ default: m.AssessAptitudePage })));
const AssessValuesPage = lazy(() => import('./pages/AssessValuesPage').then(m => ({ default: m.AssessValuesPage })));
const AssessAspirationsPage = lazy(() => import('./pages/AssessAspirationsPage').then(m => ({ default: m.AssessAspirationsPage })));
const PassportPage = lazy(() => import('./pages/PassportPage').then(m => ({ default: m.PassportPage })));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage').then(m => ({ default: m.RecommendationsPage })));
const PathwayPage = lazy(() => import('./pages/PathwayPage').then(m => ({ default: m.PathwayPage })));
const PathwaysPage = lazy(() => import('./pages/PathwaysPage').then(m => ({ default: m.PathwaysPage })));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const CounselorPage = lazy(() => import('./pages/CounselorPage').then(m => ({ default: m.CounselorPage })));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage').then(m => ({ default: m.HelpCenterPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const IntegrationPage = lazy(() => import('./pages/IntegrationPage').then(m => ({ default: m.IntegrationPage })));

export const router = createBrowserRouter([
  { path: '/', Component: RootLayout, children: [
    { index: true, Component: HomePage },
    { path: 'auth', Component: AuthPage },
    { path: 'job', Component: JobOverviewPage },
    { path: 'job/detail', Component: JobDetailPage },
    { path: 'simulation', Component: SimulationPage },
    { path: 'history', Component: HistoryPage },
    { path: 'quiz', Component: QuizPage },
    { path: 'compare', Component: ComparisonPage },
    { path: 'favorites', Component: FavoritesPage },
    { path: 'interview-prep', Component: InterviewPrepPage },
    { path: 'settings', Component: SettingsPage },
    { path: 'mood', Component: MoodMatchPage },
    { path: 'career-transition', Component: CareerTransitionPage },
    { path: 'roadmap', Component: CareerRoadmapPage },
    { path: 'pricing', Component: PricingPage },
    // ── Phase 1: Guidance system routes ───────────────────────────────────
    { path: 'onboarding', Component: OnboardingPage },
    { path: 'assess', Component: AssessmentHubPage },
    { path: 'assess/interests', Component: AssessRiasecPage },
    { path: 'assess/aptitude', Component: AssessAptitudePage },
    { path: 'assess/values', Component: AssessValuesPage },
    { path: 'assess/aspirations', Component: AssessAspirationsPage },
    { path: 'passport', Component: PassportPage },
    { path: 'recommendations', Component: RecommendationsPage },
    { path: 'pathway/:occupationId', Component: PathwayPage },
    { path: 'pathways', Component: PathwaysPage },
    { path: 'how-it-works', Component: HowItWorksPage },
    { path: 'counselor', Component: CounselorPage },
    { path: 'help', Component: HelpCenterPage },
    { path: 'about', Component: AboutPage },
    { path: 'integration', Component: IntegrationPage },
    { path: '*', Component: NotFoundPage },
  ]},
]);
