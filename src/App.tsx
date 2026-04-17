import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkBanner from "@/components/NetworkBanner";

// Lazy-loaded pages
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/PrivacyPolicyPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const DirectoryPage = lazy(() => import("@/pages/DirectoryPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const CourseManagePage = lazy(() => import("@/pages/CourseManagePage"));
const CertificatePage = lazy(() => import("@/pages/CertificatePage"));
const ExamsPage = lazy(() => import("@/pages/ExamsPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const GroupsPage = lazy(() => import("@/pages/GroupsPage"));
const FeedPage = lazy(() => import("@/pages/FeedPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const ClassroomsPage = lazy(() => import("@/pages/ClassroomsPage"));
const ClassManagePage = lazy(() => import("@/pages/ClassManagePage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const DocumentsPage = lazy(() => import("@/pages/DocumentsPage"));
const AnnouncementsPage = lazy(() => import("@/pages/AnnouncementsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Added from upf-connect
const PendingApproval = lazy(() => import("@/pages/PendingApproval"));
const Rejected = lazy(() => import("@/pages/Rejected"));
const GroupDetail = lazy(() => import("@/pages/GroupDetail"));
const ClassroomDetail = lazy(() => import("@/pages/ClassroomDetail"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));

const queryClient = new QueryClient();

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <NetworkBanner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/feed" replace />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/pending" element={<PendingApproval />} />
                <Route path="/rejected" element={<Rejected />} />
                <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
                <Route path="/courses" element={<ProtectedLayout><CoursesPage /></ProtectedLayout>} />
                <Route path="/courses/:id" element={<ProtectedLayout><CourseDetail /></ProtectedLayout>} />
                <Route path="/courses/:id/manage" element={<ProtectedLayout><CourseManagePage /></ProtectedLayout>} />
                <Route path="/courses/:id/certificate" element={<CertificatePage />} />
                <Route path="/exams" element={<ProtectedLayout><ExamsPage /></ProtectedLayout>} />
                <Route path="/messages" element={<ProtectedLayout><MessagesPage /></ProtectedLayout>} />
                <Route path="/groups" element={<ProtectedLayout><GroupsPage /></ProtectedLayout>} />
                <Route path="/groups/:id" element={<ProtectedLayout><GroupDetail /></ProtectedLayout>} />
                <Route path="/feed" element={<ProtectedLayout><FeedPage /></ProtectedLayout>} />
                <Route path="/calendar" element={<ProtectedLayout><CalendarPage /></ProtectedLayout>} />
                <Route path="/search" element={<ProtectedLayout><SearchPage /></ProtectedLayout>} />
                <Route path="/classrooms" element={<ProtectedLayout><ClassroomsPage /></ProtectedLayout>} />
                <Route path="/classrooms/:id" element={<ProtectedLayout><ClassroomDetail /></ProtectedLayout>} />
                <Route path="/classrooms/:id/manage" element={<ProtectedLayout><ClassManagePage /></ProtectedLayout>} />
                <Route path="/admin" element={<ProtectedLayout><AdminPage /></ProtectedLayout>} />
                <Route path="/profile" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
                <Route path="/profile/:userId" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
                <Route path="/notifications" element={<ProtectedLayout><NotificationsPage /></ProtectedLayout>} />
                <Route path="/documents" element={<ProtectedLayout><DocumentsPage /></ProtectedLayout>} />
                <Route path="/announcements" element={<ProtectedLayout><AnnouncementsPage /></ProtectedLayout>} />
                <Route path="/directory" element={<ProtectedLayout><DirectoryPage /></ProtectedLayout>} />
                <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
