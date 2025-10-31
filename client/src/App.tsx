// Based on blueprint:javascript_auth_all_persistance
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/lib/protected-route";
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";
import Notebook from "@/pages/Notebook";
import Templates from "@/pages/Templates";
import Settings from "@/pages/Settings";
import VerifyEmail from "@/pages/VerifyEmail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/verify-email" component={VerifyEmail} />
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/notebook/:id" component={Notebook} />
      <ProtectedRoute path="/templates" component={Templates} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const isAuthPage = location === "/auth";

  // Show auth page without sidebar when on /auth
  if (isAuthPage || !isAuthenticated) {
    return <Router />;
  }

  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <Router />
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
