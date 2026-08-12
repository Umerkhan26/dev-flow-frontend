import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { AiAskPage } from "./pages/AiAskPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CycleDetailPage } from "./pages/CycleDetailPage";
import { CyclesPage } from "./pages/CyclesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { IssueDetailPage } from "./pages/IssueDetailPage";
import { IssuesPage } from "./pages/IssuesPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { PullRequestDetailPage } from "./pages/PullRequestDetailPage";
import { PullRequestsPage } from "./pages/PullRequestsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RepositoriesPage } from "./pages/RepositoriesPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="cycles" element={<CyclesPage />} />
            <Route path="cycles/:cycleId" element={<CycleDetailPage />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="issues/:issueId" element={<IssueDetailPage />} />
            <Route path="repositories" element={<RepositoriesPage />} />
            <Route path="pull-requests" element={<PullRequestsPage />} />
            <Route path="pull-requests/:pullRequestId" element={<PullRequestDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="ai" element={<AiAskPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
