
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

const queryClient = new QueryClient();

const App = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/packing-spec/:id" element={<PackingSpecDetailsPage />} />
              
              {/* Admin routes - only accessible in development mode */}
              {isDevelopment ? (
                <>
                  <Route path="/podio-setup" element={<PodioSetupPage />} />
                  <Route path="/podio-callback" element={<PodioCallbackPage />} />
                  <Route path="/admin/*" element={<AdminRoute />} />
                </>
              ) : (
                <>
                  <Route path="/podio-setup" element={<Navigate to="/" replace />} />
                  <Route path="/podio-callback" element={<Navigate to="/" replace />} />
                  <Route path="/admin/*" element={<Navigate to="/" replace />} />
                </>
              )}
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
