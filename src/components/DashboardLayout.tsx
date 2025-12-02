import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, LogOut, Settings } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  profileName?: string | null;
}

const DashboardLayout = ({ children, profileName }: DashboardLayoutProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => navigate("/dashboard")}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Grümpi</h1>
                <p className="text-sm text-muted-foreground">Veranstalter Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profileName && (
                <span className="text-sm text-muted-foreground mr-2">
                  {profileName}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/profile")}
                title="Profil bearbeiten"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Abmelden">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
