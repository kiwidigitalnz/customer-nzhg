
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PodioSetupPage from "./pages/PodioSetupPage";
import PodioCallbackPage from "./pages/PodioCallbackPage";
import PackingSpecDetailsPage from "./pages/PackingSpecDetailsPage";
import NotFound from "./pages/NotFound";
import AdminRoute from "./components/AdminRoute";

// Create the query client with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  },
});

const App = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/packing-spec/:id" element={<PackingSpecDetailsPage />} />
              
              {/* Allow PodioCallbackPage in production for OAuth flow */}
              <Route path="/podio-callback" element={<PodioCallbackPage />} />
              
              {/* Admin routes - only accessible in development mode */}
              {isDevelopment ? (
                <>
                  <Route path="/podio-setup" element={<PodioSetupPage />} />
                  <Route path="/admin/*" element={<AdminRoute />} />
                </>
              ) : (
                <>
                  <Route path="/podio-setup" element={<Navigate to="/" replace />} />
                  <Route path="/admin/*" element={<Navigate to="/" replace />} />
                </>
              )}
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
