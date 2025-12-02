import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CallToAction from "@/components/CallToAction";
import TournamentCalendar from "@/components/TournamentCalendar";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <Features />
      
      {/* Tournament Calendar Section */}
      <section className="py-20 px-4 bg-muted/30">
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
      
      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-foreground mb-4">Grümpi</h3>
              <p className="text-muted-foreground text-sm">
                Die moderne Plattform für Turnierorganisation in der Schweiz.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Funktionen</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Preise</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Updates</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Hilfe Center</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Kontakt</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Datenschutz</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">AGB</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Impressum</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>© 2024 Grümpi. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
