import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CallToAction = () => {
  return (
    <section className="py-20 px-4 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMC41NTItLjQ0OC0xLTEtMXMtMSAuNDQ4LTEgMSAuNDQ4IDEgMSAxIDEtLjQ0OCAxLTF6bTAgMjBjMC0uNTUyLS40NDgtMS0xLTFzLTEgLjQ0OC0xIDEgLjQ0OCAxIDEgMSAxLS40NDggMS0xeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
            <span className="text-primary-foreground text-sm font-medium">Kostenlos starten</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-primary-foreground mb-6">
            Bereit für dein nächstes Turnier?
          </h2>
          
          <p className="text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
            Erstelle in wenigen Minuten dein erstes Turnier und erlebe, wie einfach Turnierorganisation sein kann.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="accent" 
              size="lg" 
              className="w-full sm:w-auto group"
            >
              Jetzt kostenlos starten
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
            >
              Demo Turnier ansehen
            </Button>
          </div>
          
          <p className="text-primary-foreground/70 text-sm mt-6">
            Keine Kreditkarte erforderlich • Unbegrenzte Teilnehmer • Schweizer Hosting
          </p>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
