import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Auth from "./pages/Auth";
import Pro from "./pages/Pro";
import JobNew from "./pages/JobNew";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import { I18nProvider } from "./i18n";
import Diagnostics from "./components/Diagnostics";
import DashboardClient from "./pages/DashboardClient";
import DashboardPro from "./pages/DashboardPro";
import DashboardBusiness from "./pages/DashboardBusiness";
import Messages from "./pages/Messages";
import Kyc from "./pages/Kyc";
import ProProfile from "./pages/ProProfile";
import ProSchedule from "./pages/ProSchedule";
import ProPortfolio from "./pages/ProPortfolio";
import TendersList from "./pages/TendersList";
import TenderDetail from "./pages/TenderDetail";
import Catalog from "./pages/Catalog";
import ProPublic from "./pages/ProPublic";
import Feed from "./pages/Feed";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminJobs from "./pages/admin/Jobs";
import AdminTenders from "./pages/admin/Tenders";
import AdminDisputes from "./pages/admin/Disputes";
import AdminFinance from "./pages/admin/Finance";
import AdminRisk from "./pages/admin/Risk";
import AdminContent from "./pages/admin/Content";
import AdminSettings from "./pages/admin/Settings";
import HowItWorks from "./pages/HowItWorks";
import PageTransition from "./components/PageTransition";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  
  return (
    <>
      <Header />
      <PageTransition>
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/pro" element={<Pro />} />
          <Route path="/job/new" element={<JobNew />} />
          <Route path="/dashboard" element={<DashboardClient />} />
          <Route path="/pro/dashboard" element={<DashboardPro />} />
          <Route path="/business/dashboard" element={<DashboardBusiness />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<Messages />} />
          <Route path="/kyc" element={<Kyc />} />
          <Route path="/pro/profile" element={<ProProfile />} />
          <Route path="/pro/schedule" element={<ProSchedule />} />
          <Route path="/portfolio" element={<ProPortfolio />} />
          <Route path="/tenders" element={<TendersList />} />
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
            <Route path="finance" element={<AdminFinance />} />
            <Route path="risk" element={<AdminRisk />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
      <Footer />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Diagnostics />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
