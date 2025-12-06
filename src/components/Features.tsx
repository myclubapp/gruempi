import { ClipboardList, Calendar, Trophy, Receipt } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: ClipboardList,
      title: "Team-Anmeldung",
      description: "Einfache Online-Anmeldung für Teams. Verschiedene Kategorien und automatische Bestätigungen.",
    },
    {
      icon: Calendar,
      title: "Spielplan-Generator",
      description: "Automatische Erstellung von Gruppenphase und K.O.-Runde mit konfigurierbaren Zeiten.",
    },
    {
      icon: Trophy,
      title: "Live-Resultate",
      description: "Echtzeit-Updates für alle Spiele. Automatische Tabellen und Ranglisten.",
    },
    {
      icon: Receipt,
      title: "QR-Rechnung",
      description: "Swiss QR-Rechnungen automatisch generieren. Zahlungsstatus immer im Blick.",
    },
  ];

  return (
    <section id="features" className="py-24 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Alles was du brauchst
          </h2>
          <p className="text-lg text-muted-foreground">
            Von der Anmeldung bis zur Siegerehrung – Grümpi macht Turnierorganisation einfach.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
