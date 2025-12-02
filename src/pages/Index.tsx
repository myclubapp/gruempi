import ModernNavigation from "@/components/ModernNavigation";
import ModernFooter from "@/components/ModernFooter";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CallToAction from "@/components/CallToAction";
import TournamentCalendar from "@/components/TournamentCalendar";

const Index = () => {
  return (
    <div className="min-h-screen">
      <ModernNavigation />
      <Hero />
      <Features />
      
      {/* Tournament Calendar Section */}
      <section id="tournaments" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Kommende Grümpelturniere
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Entdecke spannende Turniere in deiner Region und melde dein Team an
            </p>
          </div>
          <TournamentCalendar />
        </div>
      </section>
      
      <CallToAction />
      <ModernFooter />
    </div>
  );
};

export default Index;
