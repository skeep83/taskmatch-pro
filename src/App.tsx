import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { MobileProvider } from "./mobile/providers/MobileProvider";
import { useDeviceDetection } from "./hooks/useDeviceDetection";
import { MobileBottomNav } from "./mobile/components/navigation/MobileBottomNav";

// Core pages loaded immediately
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import HowItWorks from "./pages/HowItWorks";

// UI components loaded immediately
import { AppNavigation } from "./components/navigation/AppNavigation";
import { FloatingActionButton } from "./components/navigation/FloatingActionButton";
import Footer from "./components/layout/Footer";
import { EnhancedI18nProvider } from "./i18n/enhanced";
import { DatabaseI18nProvider } from "./i18n/DatabaseI18n";
import Diagnostics from "./components/Diagnostics";
import { usePresenceTracking } from "./hooks/usePresenceTracking";

// Lazy-loaded pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const MobileFeed = lazy(() => import("./mobile/pages/MobileFeed"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const JobNew = lazy(() => import("./pages/JobNew"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const JobEdit = lazy(() => import("./pages/JobEdit"));
const DashboardClient = lazy(() => import("./pages/DashboardClient"));
const MobileDashboardClient = lazy(() => import("./mobile/pages/MobileDashboardClient"));
const DashboardPro = lazy(() => import("./pages/DashboardPro"));
const MobileDashboardPro = lazy(() => import("./mobile/pages/MobileDashboardPro"));
const DashboardBusiness = lazy(() => import("./pages/DashboardBusiness"));
const Messages = lazy(() => import("./pages/Messages"));
const MobileMessages = lazy(() => import("./mobile/pages/MobileMessages"));
const MobileJobNew = lazy(() => import("./mobile/pages/MobileJobNew"));
const MobileJobDetail = lazy(() => import("./mobile/pages/MobileJobDetail"));
const MobileJobRespond = lazy(() => import("./mobile/pages/MobileJobRespond"));
const MobileTenderDetail = lazy(() => import("./mobile/pages/MobileTenderDetail"));
const MobileProfileSettings = lazy(() => import("./mobile/pages/MobileProfileSettings"));
const Kyc = lazy(() => import("./pages/Kyc"));
const ProSchedule = lazy(() => import("./pages/ProSchedule"));
const ProPortfolio = lazy(() => import("./pages/ProPortfolio"));
const TendersList = lazy(() => import("./pages/TendersList"));
const TenderDetail = lazy(() => import("./pages/TenderDetail"));
const TenderNew = lazy(() => import("./pages/TenderNew"));
const Catalog = lazy(() => import("./pages/Catalog"));
const MobileCatalog = lazy(() => import("./mobile/pages/MobileCatalog"));
const ProPublic = lazy(() => import("./pages/ProPublic"));
const Feed = lazy(() => import("./pages/Feed"));
const ProUpgradeStatus = lazy(() => import("./pages/ProUpgradeStatus"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const ServiceHubDashboard = lazy(() => import("./pages/ServiceHubDashboard"));
const HallOfFame = lazy(() => import("./pages/HallOfFame"));

// Admin pages lazy-loaded
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminJobs = lazy(() => import("./pages/admin/Jobs"));
const AdminTenders = lazy(() => import("./pages/admin/Tenders"));
const AdminDisputes = lazy(() => import("./pages/admin/Disputes"));
const AdminFinance = lazy(() => import("./pages/admin/Finance"));
const AdminPayments = lazy(() => import("./pages/admin/Payments"));
const AdminRisk = lazy(() => import("./pages/admin/Risk"));
const AdminContent = lazy(() => import("./pages/admin/Content"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminTesting = lazy(() => import("./pages/admin/Testing"));
const AdminCurrencies = lazy(() => import("./pages/admin/Currencies"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminLogs = lazy(() => import("./pages/admin/Logs"));
const ProUpgradeRequests = lazy(() => import("./pages/admin/ProUpgradeRequests"));
const AdminKycVerification = lazy(() => import("./pages/admin/KycVerification"));
import PageTransition from "./components/PageTransition";
import { GlobalHaze } from "./components/GlobalHaze";

const AppContent = () => {
  const location = useLocation();
  const { isMobile } = useDeviceDetection();
  const isAuthRoute = location.pathname === "/auth";
  const isAdminRoute = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const hidePublicShell = isAuthRoute || isAdminRoute;

  // Отслеживаем присутствие пользователя на платформе
  usePresenceTracking(!isAuthRoute);

  const isLandingRoute = location.pathname === "/";

  return (
    <>
      {!isLandingRoute && <GlobalHaze />}
      {!hidePublicShell && !isMobile && <AppNavigation />}
      <PageTransition>
        <Suspense fallback={
          <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="relative">
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto mb-4"></div>
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Загрузка...</p>
            </div>
          </div>
        }>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/catalog" element={
              isMobile ? <MobileCatalog /> : <Catalog />
            } />
            <Route path="/auth" element={<Auth />} />
            <Route path="/job/:id" element={
              isMobile ? <MobileJobDetail /> : <JobDetail />
            } />
            <Route path="/job/:id/respond" element={<MobileJobRespond />} />
            <Route path="/job/:id/edit" element={<JobEdit />} />
            <Route path="/job/new" element={
              isMobile ? <MobileJobNew /> : <JobNew />
            } />
            <Route path="/jobs/search" element={<ServiceHubDashboard />} />
            <Route path="/hall-of-fame" element={<HallOfFame />} />
            <Route path="/dashboard/client" element={
              isMobile ? <MobileDashboardClient /> : <DashboardClient />
            } />
            <Route path="/dashboard/pro" element={
              isMobile ? <MobileDashboardPro /> : <DashboardPro />
            } />
            <Route path="/dashboard/business" element={<DashboardBusiness />} />
            <Route path="/dashboard" element={<Navigate to="/jobs/search" replace />} />
            <Route path="/messages" element={
              isMobile ? <MobileMessages /> : <Messages />
            } />
            <Route path="/messages/:id" element={
              isMobile ? <MobileMessages /> : <Messages />
            } />
            <Route path="/profile/settings" element={<ProfileSettings />} />
            <Route path="/mobile/profile-settings" element={<MobileProfileSettings />} />
            <Route path="/kyc" element={<Kyc />} />
            <Route path="/pro-upgrade-status" element={<ProUpgradeStatus />} />
            <Route path="/pro/profile" element={<Navigate to="/profile/settings" replace />} />
            <Route path="/pro/schedule" element={<ProSchedule />} />
            <Route path="/portfolio" element={<ProPortfolio />} />
            <Route path="/tenders" element={<TendersList />} />
            <Route path="/tenders/new" element={<TenderNew />} />
            <Route path="/tenders/:id" element={
              isMobile ? <MobileTenderDetail /> : <TenderDetail />
            } />
            <Route path="/pro/:id" element={<ProPublic />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/feed" element={isMobile ? <MobileFeed /> : <Feed />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="jobs" element={<AdminJobs />} />
              <Route path="tenders" element={<AdminTenders />} />
              <Route path="disputes" element={<AdminDisputes />} />
              <Route path="pro-requests" element={<ProUpgradeRequests />} />
              <Route path="kyc" element={<AdminKycVerification />} />
              <Route path="finance" element={<AdminFinance />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="risk" element={<AdminRisk />} />
              <Route path="content" element={<AdminContent />} />
              <Route path="currencies" element={<AdminCurrencies />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="testing" element={<AdminTesting />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </PageTransition>
      {!hidePublicShell && !isMobile && <FloatingActionButton />}
      {!hidePublicShell && !isMobile && <Footer />}
      {!hidePublicShell && isMobile && <MobileBottomNav />}
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  const routerBasename = (() => {
    const base = (import.meta.env.BASE_URL || '/').trim();
    if (!base || base === '/') return '/';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  })();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={routerBasename === '/' ? undefined : routerBasename}>
          <EnhancedI18nProvider>
            <DatabaseI18nProvider>
              <MobileProvider>
                <TooltipProvider>
                  <div style={{ background: 'var(--background-neomorphic)' }}>
                    <Toaster />
                    <Sonner />
                    <Diagnostics />
                    <AppContent />
                  </div>
                </TooltipProvider>
              </MobileProvider>
            </DatabaseI18nProvider>
          </EnhancedI18nProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;