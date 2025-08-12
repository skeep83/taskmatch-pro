import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Diagnostics />
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/catalog" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pro" element={<Pro />} />
            <Route path="/job/new" element={<JobNew />} />
            <Route path="/dashboard" element={<DashboardClient />} />
            <Route path="/pro/dashboard" element={<DashboardPro />} />
            <Route path="/business/dashboard" element={<DashboardBusiness />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<Messages />} />
            <Route path="/kyc" element={<Kyc />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
