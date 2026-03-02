import { createBrowserRouter } from 'react-router';
import { RootLayout } from './pages/RootLayout';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { JobOverviewPage } from './pages/JobOverviewPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { SimulationPage } from './pages/SimulationPage';
import { HistoryPage } from './pages/HistoryPage';
import { QuizPage } from './pages/QuizPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { InterviewPrepPage } from './pages/InterviewPrepPage';
import { SettingsPage } from './pages/SettingsPage';
import { MoodMatchPage } from './pages/MoodMatchPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
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
      { path: '*', Component: NotFoundPage },
    ],
  },
]);