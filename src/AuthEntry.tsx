import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { EnhancedI18nProvider } from "@/i18n/enhanced";
import { DatabaseI18nProvider } from "@/i18n/DatabaseI18n";
import { Toaster } from "@/components/ui/toaster";
import Auth from "@/pages/Auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const routerBasename = import.meta.env.BASE_URL || "/";

export default function AuthEntry() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBasename === "/" ? undefined : routerBasename}>
        <EnhancedI18nProvider>
          <DatabaseI18nProvider>
            <Toaster />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
          </DatabaseI18nProvider>
        </EnhancedI18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
