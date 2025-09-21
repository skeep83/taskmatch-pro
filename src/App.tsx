import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense, lazy } from "react";
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
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const JobNew = lazy(() => import("./pages/JobNew"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const JobEdit = lazy(() => import("./pages/JobEdit"));
const DashboardClient = lazy(() => import("./pages/DashboardClient"));
const DashboardPro = lazy(() => import("./pages/DashboardPro"));
const DashboardBusiness = lazy(() => import("./pages/DashboardBusiness"));
const Messages = lazy(() => import("./pages/Messages"));
const Kyc = lazy(() => import("./pages/Kyc"));
const ProSchedule = lazy(() => import("./pages/ProSchedule"));
const ProPortfolio = lazy(() => import("./pages/ProPortfolio"));
const TendersList = lazy(() => import("./pages/TendersList"));
const TenderDetail = lazy(() => import("./pages/TenderDetail"));
const TenderNew = lazy(() => import("./pages/TenderNew"));
const Catalog = lazy(() => import("./pages/Catalog"));
const ProPublic = lazy(() => import("./pages/ProPublic"));
const Feed = lazy(() => import("./pages/Feed"));
const ProUpgradeStatus = lazy(() => import("./pages/ProUpgradeStatus"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));

// Admin pages lazy-loaded
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminJobs = lazy(() => import("./pages/admin/Jobs"));
const AdminTenders = lazy(() => import("./pages/admin/Tenders"));
const AdminDisputes = lazy(() => import("./pages/admin/Disputes"));
const AdminFinance = lazy(() => import("./pages/admin/Finance"));
const AdminRisk = lazy(() => import("./pages/admin/Risk"));
const AdminContent = lazy(() => import("./pages/admin/Content"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminTesting = lazy(() => import("./pages/admin/Testing"));
const AdminCurrencies = lazy(() => import("./pages/admin/Currencies"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const ProUpgradeRequests = lazy(() => import("./pages/admin/ProUpgradeRequests"));
import PageTransition from "./components/PageTransition";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const { isMobile } = useDeviceDetection();
  
  // Отслеживаем присутствие пользователя на платформе
  usePresenceTracking();
  
  return (
    <>
      {!isMobile && <AppNavigation />}
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
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/job/:id" element={<JobDetail />} />
            <Route path="/job/:id/edit" element={<JobEdit />} />
            <Route path="/job/new" element={<JobNew />} />
            <Route path="/dashboard/client" element={<DashboardClient />} />
            <Route path="/dashboard/pro" element={<DashboardPro />} />
            <Route path="/dashboard/business" element={<DashboardBusiness />} />
            <Route path="/dashboard" element={<Navigate to="/dashboard/client" replace />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<Messages />} />
            <Route path="/profile/settings" element={<ProfileSettings />} />
            <Route path="/kyc" element={<Kyc />} />
            <Route path="/pro-upgrade-status" element={<ProUpgradeStatus />} />
            <Route path="/pro/profile" element={<Navigate to="/profile/settings" replace />} />
            <Route path="/pro/schedule" element={<ProSchedule />} />
            <Route path="/portfolio" element={<ProPortfolio />} />
            <Route path="/tenders" element={<TendersList />} />
            <Route path="/tenders/new" element={<TenderNew />} />
            <Route path="/tenders/:id" element={<TenderDetail />} />
            <Route path="/pro/:id" element={<ProPublic />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="jobs" element={<AdminJobs />} />
              <Route path="tenders" element={<AdminTenders />} />
              <Route path="disputes" element={<AdminDisputes />} />
              <Route path="pro-requests" element={<ProUpgradeRequests />} />
              <Route path="finance" element={<AdminFinance />} />
              <Route path="risk" element={<AdminRisk />} />
              <Route path="content" element={<AdminContent />} />
              <Route path="currencies" element={<AdminCurrencies />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="testing" element={<AdminTesting />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </PageTransition>
      {!isMobile && <FloatingActionButton />}
      {!isMobile && <Footer />}
      {isMobile && <MobileBottomNav />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <EnhancedI18nProvider>
      <DatabaseI18nProvider>
        <MobileProvider>
          <TooltipProvider>
          <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-6"></div>
                  <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-primary/40 animate-spin mx-auto" style={{animationDuration: '1.5s'}}></div>
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">ServiceHub</h2>
                <p className="text-muted-foreground animate-pulse">Загрузка переводов...</p>
              </div>
            </div>
          }>
            <div style={{ background: 'var(--background-neomorphic)' }}>
              <Toaster />
              <Sonner />
              <Diagnostics />
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </div>
          </Suspense>
          </TooltipProvider>
        </MobileProvider>
      </DatabaseI18nProvider>
    </EnhancedI18nProvider>
  </QueryClientProvider>
);

export default App;