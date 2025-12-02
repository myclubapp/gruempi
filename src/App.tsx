import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateTournament from "./pages/CreateTournament";
import TournamentDetail from "./pages/TournamentDetail";
import TournamentCockpit from "./pages/TournamentCockpit";
import PublicTournaments from "./pages/PublicTournaments";
import PublicTournamentDetail from "./pages/PublicTournamentDetail";
import PlayerRegistration from "./pages/PlayerRegistration";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/tournaments" element={<PublicTournaments />} />
          <Route path="/tournaments/:id" element={<PublicTournamentDetail />} />
          <Route path="/teams/:teamId/register/:token" element={<PlayerRegistration />} />
          <Route path="/tournaments/:teamId/registration-success" element={<RegistrationSuccess />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/create-tournament"
            element={
              <ProtectedRoute>
                <CreateTournament />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tournament/:id"
            element={
              <ProtectedRoute>
                <TournamentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tournament/:id/cockpit"
            element={
              <ProtectedRoute>
                <TournamentCockpit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
