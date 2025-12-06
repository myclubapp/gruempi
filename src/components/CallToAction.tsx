import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CallToAction = () => {
  return (
    <section id="cta" className="py-24 px-4 bg-[#0a0a0f] relative overflow-hidden">
      {/* Glowing Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[100px]"
          style={{
            background: 'radial-gradient(ellipse, hsl(14 88% 58%) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Bereit für dein Turnier?
          </h2>

          <p className="text-lg text-white/60 mb-8">
            Starte jetzt kostenlos und erlebe wie einfach Turnierorganisation sein kann.
          </p>

          <Button
            size="lg"
            className="text-base px-8 py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 rounded-full shadow-lg shadow-orange-500/25"
            onClick={() => window.location.href = "/auth"}
          >
            Kostenlos starten
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-white/40 text-sm mt-6">
            Keine Kreditkarte erforderlich
          </p>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
