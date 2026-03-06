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
    { path: '*', Component: NotFoundPage },
  ]},
]);
