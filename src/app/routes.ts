import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { RootLayout } from "./pages/RootLayout";
import { RouteErrorPage } from "./pages/RouteErrorPage";
import { LegacyCareerCaseRuntime } from "./pages/LegacyCareerCaseRuntime";
import { DemoSihRuntime } from "./demo/DemoSihRuntime";
import { SihProductionRuntime } from "./sih/SihProductionContext";
import { SihProductionLayout } from "./sih/SihProductionLayout";

const AuthPage = lazy(() =>
  import("./pages/AuthPage").then((m) => ({ default: m.AuthPage })),
);
const HomePage = lazy(() =>
  import("./pages/HomePage").then((m) => ({ default: m.HomePage })),
);
const JobOverviewPage = lazy(() =>
  import("./pages/JobOverviewPage").then((m) => ({
    default: m.JobOverviewPage,
  })),
);
const JobDetailPage = lazy(() =>
  import("./pages/JobDetailPage").then((m) => ({ default: m.JobDetailPage })),
);
const SimulationPage = lazy(() =>
  import("./pages/SimulationPage").then((m) => ({ default: m.SimulationPage })),
);
const HistoryPage = lazy(() =>
  import("./pages/HistoryPage").then((m) => ({ default: m.HistoryPage })),
);
const QuizPage = lazy(() =>
  import("./pages/QuizPage").then((m) => ({ default: m.QuizPage })),
);
const ComparisonPage = lazy(() =>
  import("./pages/ComparisonPage").then((m) => ({ default: m.ComparisonPage })),
);
const FavoritesPage = lazy(() =>
  import("./pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })),
);
const InterviewPrepPage = lazy(() =>
  import("./pages/InterviewPrepPage").then((m) => ({
    default: m.InterviewPrepPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const MoodMatchPage = lazy(() =>
  import("./pages/MoodMatchPage").then((m) => ({ default: m.MoodMatchPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);
const CareerTransitionPage = lazy(() =>
  import("./pages/CareerTransitionPage").then((m) => ({
    default: m.CareerTransitionPage,
  })),
);
const CareerRoadmapPage = lazy(() =>
  import("./pages/CareerRoadmapPage").then((m) => ({
    default: m.CareerRoadmapPage,
  })),
);
const PricingPage = lazy(() =>
  import("./pages/PricingPage").then((m) => ({ default: m.PricingPage })),
);

// ── Phase 1: Guidance system pages ───────────────────────────────────────
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const OnboardingPage = lazy(() =>
  import("./pages/OnboardingPage").then((m) => ({ default: m.OnboardingPage })),
);
const AssessmentHubPage = lazy(() =>
  import("./pages/AssessmentHubPage").then((m) => ({
    default: m.AssessmentHubPage,
  })),
);
const AssessRiasecPage = lazy(() =>
  import("./pages/AssessRiasecPage").then((m) => ({
    default: m.AssessRiasecPage,
  })),
);
const AssessAptitudePage = lazy(() =>
  import("./pages/AssessAptitudePage").then((m) => ({
    default: m.AssessAptitudePage,
  })),
);
const AssessValuesPage = lazy(() =>
  import("./pages/AssessValuesPage").then((m) => ({
    default: m.AssessValuesPage,
  })),
);
const AssessAspirationsPage = lazy(() =>
  import("./pages/AssessAspirationsPage").then((m) => ({
    default: m.AssessAspirationsPage,
  })),
);
const PassportPage = lazy(() =>
  import("./pages/PassportPage").then((m) => ({ default: m.PassportPage })),
);
const RecommendationsPage = lazy(() =>
  import("./pages/RecommendationsPage").then((m) => ({
    default: m.RecommendationsPage,
  })),
);
const PathwayPage = lazy(() =>
  import("./pages/PathwayPage").then((m) => ({ default: m.PathwayPage })),
);
const PathwaysPage = lazy(() =>
  import("./pages/PathwaysPage").then((m) => ({ default: m.PathwaysPage })),
);
const HowItWorksPage = lazy(() =>
  import("./pages/HowItWorksPage").then((m) => ({ default: m.HowItWorksPage })),
);
const CounselorPage = lazy(() =>
  import("./pages/CounselorPage").then((m) => ({ default: m.CounselorPage })),
);
const HelpCenterPage = lazy(() =>
  import("./pages/HelpCenterPage").then((m) => ({ default: m.HelpCenterPage })),
);
const AboutPage = lazy(() =>
  import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })),
);
const IntegrationPage = lazy(() =>
  import("./pages/IntegrationPage").then((m) => ({
    default: m.IntegrationPage,
  })),
);
const VerificationPage = lazy(() =>
  import("./pages/VerificationPage").then((m) => ({
    default: m.VerificationPage,
  })),
);
const CareerWorkspacePage = lazy(() =>
  import("./sih/SihProductionPages").then((m) => ({
    default: m.CareerWorkspacePage,
  })),
);
const OpportunitiesPage = lazy(() =>
  import("./sih/SihStudentProductionPages").then((m) => ({
    default: m.OpportunitiesPage,
  })),
);
const OpportunityDetailPage = lazy(() =>
  import("./sih/SihStudentProductionPages").then((m) => ({
    default: m.OpportunityDetailPage,
  })),
);
const ReadinessPage = lazy(() =>
  import("./sih/SihStudentProductionPages").then((m) => ({
    default: m.ReadinessPage,
  })),
);
const GapClosurePage = lazy(() =>
  import("./sih/SihStudentProductionPages").then((m) => ({
    default: m.GapClosurePage,
  })),
);
const EvidencePage = lazy(() =>
  import("./sih/SihStudentProductionPages").then((m) => ({ default: m.EvidencePage })),
);
const ApplicationsPage = lazy(() =>
  import("./sih/SihStudentProductionPages").then((m) => ({
    default: m.ApplicationsPage,
  })),
);
const ApplicationPreparationPage = lazy(() =>
  import("./sih/SihStudentProductionPages").then((m) => ({
    default: m.ApplicationPreparationPage,
  })),
);
const IndustryPage = lazy(() =>
  import("./sih/SihProductionPages").then((m) => ({ default: m.IndustryPage })),
);
const ApplicantsPage = lazy(() =>
  import("./sih/SihProductionPages").then((m) => ({
    default: m.ApplicantsPage,
  })),
);
const FacultyPage = lazy(() =>
  import("./sih/SihProductionPages").then((m) => ({ default: m.FacultyPage })),
);
const InstitutionPage = lazy(() =>
  import("./sih/SihProductionPages").then((m) => ({
    default: m.InstitutionPage,
  })),
);
const DemoOverviewPage = lazy(() =>
  import("./demo/DemoPages").then((m) => ({ default: m.DemoOverviewPage })),
);
const DemoStudentPage = lazy(() =>
  import("./demo/DemoPages").then((m) => ({ default: m.DemoStudentPage })),
);
const DemoMentorPage = lazy(() =>
  import("./demo/DemoPages").then((m) => ({ default: m.DemoMentorPage })),
);
const DemoRecruiterPage = lazy(() =>
  import("./demo/DemoPages").then((m) => ({ default: m.DemoRecruiterPage })),
);
const DemoInstitutionPage = lazy(() =>
  import("./demo/DemoPages").then((m) => ({ default: m.DemoInstitutionPage })),
);
const DemoFacultyPage = lazy(() =>
  import("./demo/DemoPages").then((m) => ({ default: m.DemoFacultyPage })),
);
const DemoFacultyCollaborationDetailPage = lazy(() =>
  import("./demo/DemoPages").then((m) => ({
    default: m.DemoFacultyCollaborationDetailPage,
  })),
);

export const router = createBrowserRouter([
  {
    Component: LegacyCareerCaseRuntime,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        path: "/",
        Component: RootLayout,
        children: [
          { index: true, Component: HomePage },
          { path: "auth", Component: AuthPage },
          { path: "job", Component: JobOverviewPage },
          { path: "job/detail", Component: JobDetailPage },
          { path: "simulation", Component: SimulationPage },
          { path: "history", Component: HistoryPage },
          { path: "quiz", Component: QuizPage },
          { path: "compare", Component: ComparisonPage },
          { path: "favorites", Component: FavoritesPage },
          { path: "interview-prep", Component: InterviewPrepPage },
          { path: "settings", Component: SettingsPage },
          { path: "mood", Component: MoodMatchPage },
          { path: "career-transition", Component: CareerTransitionPage },
          { path: "roadmap", Component: CareerRoadmapPage },
          { path: "pricing", Component: PricingPage },
          // ── Phase 1: Guidance system routes ─────────────────────────────────
          { path: "dashboard", Component: DashboardPage },
          { path: "onboarding", Component: OnboardingPage },
          { path: "assess", Component: AssessmentHubPage },
          { path: "assess/interests", Component: AssessRiasecPage },
          { path: "assess/aptitude", Component: AssessAptitudePage },
          { path: "assess/values", Component: AssessValuesPage },
          { path: "assess/aspirations", Component: AssessAspirationsPage },
          { path: "passport", Component: PassportPage },
          { path: "recommendations", Component: RecommendationsPage },
          { path: "pathway/:occupationId", Component: PathwayPage },
          { path: "pathways", Component: PathwaysPage },
          { path: "how-it-works", Component: HowItWorksPage },
          { path: "counselor", Component: CounselorPage },
          { path: "help", Component: HelpCenterPage },
          { path: "about", Component: AboutPage },
          { path: "integration", Component: IntegrationPage },
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
  },
  {
    Component: SihProductionRuntime,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        Component: SihProductionLayout,
        children: [
          { path: "career", Component: CareerWorkspacePage },
          { path: "opportunities", Component: OpportunitiesPage },
          {
            path: "opportunities/:opportunityVersionId",
            Component: OpportunityDetailPage,
          },
          {
            path: "opportunities/:opportunityVersionId/readiness",
            Component: ReadinessPage,
          },
          {
            path: "opportunities/:opportunityVersionId/apply",
            Component: ApplicationPreparationPage,
          },
          { path: "gap-closure", Component: GapClosurePage },
          { path: "evidence", Component: EvidencePage },
          { path: "verification", Component: VerificationPage },
          { path: "applications", Component: ApplicationsPage },
          { path: "industry", Component: IndustryPage },
          { path: "industry/opportunities", Component: IndustryPage },
          { path: "industry/opportunities/new", Component: IndustryPage },
          { path: "industry/applicants", Component: ApplicantsPage },
          {
            path: "industry/applicants/:applicationId",
            Component: ApplicantsPage,
          },
          { path: "faculty", Component: FacultyPage },
          { path: "faculty/opportunities", Component: FacultyPage },
          { path: "faculty/engagements", Component: FacultyPage },
          { path: "faculty/collaboration", Component: FacultyPage },
          { path: "institution", Component: InstitutionPage },
          {
            path: "institution/skills-intelligence",
            Component: InstitutionPage,
          },
          { path: "institution/interventions", Component: InstitutionPage },
          { path: "institution/collaboration", Component: InstitutionPage },
          { path: "institution/opportunities", Component: InstitutionPage },
        ],
      },
    ],
  },
  {
    path: "/demo",
    Component: DemoSihRuntime,
    ErrorBoundary: RouteErrorPage,
    children: [
      { index: true, Component: DemoOverviewPage },
      { path: "student", Component: DemoStudentPage },
      { path: "mentor", Component: DemoMentorPage },
      { path: "recruiter", Component: DemoRecruiterPage },
      { path: "institution", Component: DemoInstitutionPage },
      { path: "faculty", Component: DemoFacultyPage },
      {
        path: "faculty/:collaborationId",
        Component: DemoFacultyCollaborationDetailPage,
      },
      { path: "*", Component: DemoOverviewPage },
    ],
  },
]);