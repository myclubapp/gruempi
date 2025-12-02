import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar, ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative bg-gradient-hero pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background Decoration Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-10 right-10 w-64 h-64 bg-primary/20 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-10 left-20 w-80 h-80 bg-orange-500/10 rounded-full blur-xl"></div>
        <div 
          className="absolute top-1/2 left-1/3 w-40 h-40 bg-primary/15 rounded-full blur-lg animate-float" 
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Trophy className="w-5 h-5 text-primary-foreground" />
                <span className="text-primary-foreground font-medium">Turnierorganisation leicht gemacht</span>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-6 leading-tight">
              <span className="text-primary bg-clip-text">Grümpelturniere</span> organisieren,{" "}
              <span className="text-primary bg-clip-text">die begeistern</span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto lg:mx-0">
              Die moderne Plattform für Sportvereine in der Schweiz.
              <br />
              Von der Anmeldung bis zur Siegerehrung – alles an einem Ort.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                variant="accent" 
                size="lg" 
                className="text-lg px-8 py-6 rounded-full"
                onClick={() => window.location.href = "/auth"}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Turnier erstellen
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 rounded-full bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => window.location.href = "/tournaments"}
              >
                <Users className="w-5 h-5 mr-2" />
                Turniere ansehen
              </Button>
            </div>
          </div>

          {/* Right Content - Stats/Features Display */}
          <div className="hidden lg:flex items-center justify-center relative">
            <div className="relative w-full max-w-md">
              {/* Decorative Cards */}
              <div className="absolute -top-4 -left-4 w-48 h-32 bg-card/90 backdrop-blur-sm rounded-2xl shadow-xl border border-border p-4 animate-float">
                <div className="text-3xl font-black text-primary mb-1">500+</div>
                <div className="text-sm text-muted-foreground">Turniere organisiert</div>
              </div>
              
              <div 
                className="absolute top-1/2 -right-8 w-48 h-32 bg-card/90 backdrop-blur-sm rounded-2xl shadow-xl border border-border p-4 animate-float"
                style={{ animationDelay: '0.5s' }}
              >
                <div className="text-3xl font-black text-primary mb-1">10'000+</div>
                <div className="text-sm text-muted-foreground">Teams registriert</div>
              </div>
              
              <div 
                className="absolute -bottom-4 left-1/4 w-48 h-32 bg-card/90 backdrop-blur-sm rounded-2xl shadow-xl border border-border p-4 animate-float"
                style={{ animationDelay: '1s' }}
              >
                <div className="text-3xl font-black text-primary mb-1">100+</div>
                <div className="text-sm text-muted-foreground">Sportvereine</div>
              </div>

              {/* Central Trophy */}
              <div className="w-64 h-64 mx-auto flex items-center justify-center">
                <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Trophy className="w-16 h-16 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Stats */}
        <div className="grid grid-cols-3 gap-4 mt-16 lg:hidden">
          {[
            { number: "500+", label: "Turniere" },
            { number: "10'000+", label: "Teams" },
            { number: "100+", label: "Vereine" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl md:text-3xl font-black text-primary-foreground mb-1">
                {stat.number}
              </div>
              <div className="text-primary-foreground/70 text-sm font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 w-full">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 1440 120" 
          className="fill-background"
        >
          <path 
            fillOpacity="1" 
            d="M0,96L48,85.3C96,75,192,53,288,53.3C384,53,480,75,576,85.3C672,96,768,96,864,80C960,64,1056,32,1152,26.7C1248,21,1344,43,1392,53.3L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
