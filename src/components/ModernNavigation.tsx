import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sun, Moon, User, LogOut } from "lucide-react";
import Logo from "@/components/Logo";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ModernNavigation = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Erfolgreich abgemeldet");
    navigate("/");
  };

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Logo />

        {/* Center Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <a
            href="#tournaments"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Turniere
          </a>
          <a
            href="#features"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Funktionen
          </a>
          <a
            href="#cta"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Preise
          </a>
          <a
            href="#footer"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Über uns
          </a>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Theme wechseln</span>
          </Button>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <User className="h-4 w-4" />
                  <span className="sr-only">Benutzermenu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate("/auth")} size="sm" className="ml-2">
              Anmelden
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default ModernNavigation;
