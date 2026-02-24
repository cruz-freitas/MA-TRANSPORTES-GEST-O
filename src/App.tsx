import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NovaOperacao from "./pages/NovaOperacao";
import Historico from "./pages/Historico";
import Lojas from "./pages/Lojas";
import Motoristas from "./pages/Motoristas";
import ValidarRegistro from "./pages/ValidarRegistro";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/nova-operacao" replace />;

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={role === "admin" ? "/" : "/nova-operacao"} replace /> : <Login />} />
      <Route path="/validar/:numero" element={<ValidarRegistro />} />
      
      <Route path="/" element={<PrivateRoute allowedRoles={["admin"]}><Dashboard /></PrivateRoute>} />
      <Route path="/nova-operacao" element={<PrivateRoute><NovaOperacao /></PrivateRoute>} />
      <Route path="/historico" element={<PrivateRoute><Historico /></PrivateRoute>} />
      <Route path="/lojas" element={<PrivateRoute allowedRoles={["admin"]}><Lojas /></PrivateRoute>} />
      <Route path="/motoristas" element={<PrivateRoute allowedRoles={["admin"]}><Motoristas /></PrivateRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
