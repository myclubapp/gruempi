import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CustomDomainRouter = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkCustomDomain = async () => {
      const hostname = window.location.hostname;
      
      // Skip for localhost and standard domains
      if (
        hostname === "localhost" ||
        hostname.endsWith(".lovable.app") ||
        hostname.endsWith(".vercel.app") ||
        hostname === "gruempi.my-club.app" // Main app domain
      ) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if this hostname matches a tournament's custom domain
        const { data: tournament, error } = await supabase
          .from("tournaments")
          .select("id, domain_status")
          .eq("custom_domain", hostname)
          .single();

        if (error || !tournament) {
          console.log("No tournament found for domain:", hostname);
          setIsLoading(false);
          return;
        }

        // Update domain status to active if it was verifying
        if (tournament.domain_status === "verifying") {
          await supabase
            .from("tournaments")
            .update({ domain_status: "active" })
            .eq("id", tournament.id);
        }

        // Redirect to the tournament's public page if on root or not on tournament page
        const tournamentPath = `/tournaments/${tournament.id}`;
        if (location.pathname === "/" || !location.pathname.startsWith("/tournaments/")) {
          navigate(tournamentPath, { replace: true });
        }
      } catch (err) {
        console.error("Error checking custom domain:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkCustomDomain();
  }, [navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default CustomDomainRouter;
