import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMC41NTItLjQ0OC0xLTEtMXMtMSAuNDQ4LTEgMSAuNDQ4IDEgMSAxIDEtLjQ0OCAxLTF6bTAgMjBjMC0uNTUyLS40NDgtMS0xLTFzLTEgLjQ0OC0xIDEgLjQ0OCAxIDEgMSAxLS40NDggMS0xeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 animate-fade-in">
            <Trophy className="w-5 h-5 text-primary-foreground" />
            <span className="text-primary-foreground font-medium">Turnierorganisation leicht gemacht</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-primary-foreground mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Grümpelturniere organisieren
          </h1>
          
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Die moderne Plattform für Sportvereine in der Schweiz. Von der Anmeldung bis zur Siegerehrung – alles an einem Ort.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Button variant="accent" size="lg" className="w-full sm:w-auto">
              <Calendar className="w-5 h-5" />
              Turnier erstellen
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Users className="w-5 h-5" />
              Demo ansehen
            </Button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: "0.4s" }}>
          {[
            { number: "500+", label: "Turniere organisiert" },
            { number: "10'000+", label: "Teams registriert" },
            { number: "100+", label: "Sportvereine" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-black text-primary-foreground mb-2">
                {stat.number}
              </div>
              <div className="text-primary-foreground/80 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
