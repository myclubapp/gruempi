import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, CalendarDays, Trophy, BarChart3, Users, CheckCircle } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: ClipboardList,
      title: "Team-Anmeldung",
      description: "Einfache Online-Anmeldung für Teams mit verschiedenen Kategorien und Altersgruppen.",
      phase: "Vor dem Turnier"
    },
    {
      icon: CalendarDays,
      title: "Spielplan erstellen",
      description: "Automatische Spielplanung mit Pausen, Spieldauer und Platzanzahl.",
      phase: "Vor dem Turnier"
    },
    {
      icon: Trophy,
      title: "Live Resultate",
      description: "Echtzeit-Updates für Spielstände und Resultate direkt auf allen Geräten.",
      phase: "Während dem Turnier"
    },
    {
      icon: BarChart3,
      title: "Tabellen & Ranglisten",
      description: "Automatische Berechnung von Tabellen, Punkten und Rankings.",
      phase: "Während dem Turnier"
    },
    {
      icon: Users,
      title: "Zuschauer-Modus",
      description: "Öffentliche Ansicht für Zuschauer und Teilnehmende ohne Anmeldung.",
      phase: "Während dem Turnier"
    },
    {
      icon: CheckCircle,
      title: "Archivierung",
      description: "Automatische Archivierung und Statistiken vergangener Turniere.",
      phase: "Nach dem Turnier"
    },
  ];

  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Alles für dein Turnier
          </h2>
          <p className="text-xl text-muted-foreground">
            Von der ersten Anmeldung bis zur Siegerehrung – unsere Plattform begleitet dich durch alle Phasen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="border-border bg-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
                    {feature.phase}
                  </div>
                  <h3 className="text-xl font-bold text-card-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
