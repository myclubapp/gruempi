import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ModernNavigation from "@/components/ModernNavigation";
import ModernFooter from "@/components/ModernFooter";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    title: "Allgemein",
    items: [
      {
        question: "Was ist Grümpi?",
        answer: "Grümpi ist eine kostenlose Turniermanagement-Plattform speziell für Grümpelturniere in der Schweiz. Die Plattform ermöglicht Vereinen und Organisatoren, Turniere einfach zu erstellen, Teams zu verwalten, Spielpläne zu generieren und Live-Resultate zu teilen."
      },
      {
        question: "Ist Grümpi wirklich kostenlos?",
        answer: "Ja, Grümpi ist zu 100% kostenlos für Veranstalter und Teams. Es entstehen keine versteckten Kosten oder Gebühren."
      },
      {
        question: "Welche Sportarten werden unterstützt?",
        answer: "Grümpi unterstützt aktuell Fussball, Volleyball, Handball und Unihockey. Die Plattform bietet sportartspezifische Ranking-Modi und Einstellungen."
      },
      {
        question: "Brauche ich ein Konto um Grümpi zu nutzen?",
        answer: "Für die Erstellung und Verwaltung von Turnieren benötigst du ein kostenloses Konto. Teams können sich jedoch ohne eigenes Konto für Turniere anmelden."
      },
    ],
  },
  {
    title: "Turnier erstellen",
    items: [
      {
        question: "Wie erstelle ich ein neues Turnier?",
        answer: "Nach der Anmeldung klickst du im Dashboard auf 'Turnier erstellen'. Dort gibst du alle wichtigen Informationen wie Turniername, Datum, Ort, Sportart und Startgebühr ein. Anschliessend kannst du Kategorien erstellen und das Turnier veröffentlichen."
      },
      {
        question: "Was sind Turnier-Kategorien?",
        answer: "Kategorien ermöglichen die Unterteilung deines Turniers in verschiedene Gruppen, z.B. 'Sportler/innen', 'Hobbyspieler' oder 'Mixed'. Jede Kategorie kann eigene Regeln haben, wie maximale Teamgrösse, Anzahl lizenzierter Spieler oder unterschiedliche Startgebühren."
      },
      {
        question: "Kann ich die Anzahl der Teams begrenzen?",
        answer: "Ja, pro Kategorie kannst du eine minimale und maximale Anzahl Teams festlegen. Wenn das Maximum erreicht ist, werden keine weiteren Anmeldungen mehr akzeptiert."
      },
      {
        question: "Wie lade ich Reglement und Teilnahmebedingungen hoch?",
        answer: "Im Bereich 'Regeln & Bedingungen' deines Turniers kannst du sowohl Texte als auch PDF-Dokumente hochladen. Diese werden den Teams bei der Anmeldung angezeigt und müssen akzeptiert werden."
      },
    ],
  },
  {
    title: "Team-Anmeldung",
    items: [
      {
        question: "Wie melden sich Teams für mein Turnier an?",
        answer: "Sobald du dein Turnier veröffentlichst, erhalten Teams über den öffentlichen Turnierlink Zugang zum Anmeldeformular. Dort geben sie Teamname, Kontaktdaten und weitere erforderliche Informationen ein."
      },
      {
        question: "Welche Informationen müssen Teams bei der Anmeldung angeben?",
        answer: "Teams geben ihren Teamnamen, eine Kategorie, Kontaktperson (Name, E-Mail, Telefon), optional eine Kostümbeschreibung und die bevorzugte Zahlungsmethode an. Ausserdem müssen sie die Regeln und Teilnahmebedingungen akzeptieren."
      },
      {
        question: "Kann ich die Anmeldefrist festlegen?",
        answer: "Ja, du kannst eine Anmeldefrist (Deadline) setzen. Nach Ablauf dieser Frist können sich keine weiteren Teams mehr anmelden."
      },
      {
        question: "Wie kann ich angemeldete Teams verwalten?",
        answer: "Im Dashboard unter 'Teams/Anmeldungen' siehst du alle angemeldeten Teams. Du kannst Teamdaten bearbeiten, Teams löschen oder den Zahlungsstatus ändern."
      },
    ],
  },
  {
    title: "Gruppen & Spielplan",
    items: [
      {
        question: "Wie erstelle ich Turniergruppen?",
        answer: "Im Bereich 'Gruppen' kannst du für jede Kategorie Gruppen erstellen. Teams können dann manuell oder per Zufallsgenerator den Gruppen zugewiesen werden."
      },
      {
        question: "Wie funktioniert der Spielplan-Generator?",
        answer: "Der Spielplan-Generator erstellt automatisch alle Gruppenspiele (Round-Robin) und optional K.O.-Runden. Du konfigurierst Spieldauer, Pausenzeiten und Anzahl Spielfelder – der Rest wird automatisch berechnet."
      },
      {
        question: "Welche K.O.-Phasen werden unterstützt?",
        answer: "Du kannst wählen zwischen: Nur Gruppenphase, Finale (Top 2), Halbfinale (Top 4), Viertelfinale (Top 8) oder Achtelfinale (Top 16). Zusätzlich werden automatisch Spiele um Platz 3, 5, 7 etc. generiert."
      },
      {
        question: "Kann ich den Spielplan manuell anpassen?",
        answer: "Ja, nach der Generierung kannst du einzelne Spiele bearbeiten – Zeiten ändern, Spielfelder anpassen oder Resultate eintragen."
      },
      {
        question: "Wie funktioniert die Ranglisten-Berechnung?",
        answer: "Je nach Sportart stehen verschiedene Ranking-Modi zur Verfügung: Punkte → Tordifferenz → Direktvergleich (Fussball/Handball) oder Punkte → Satzdifferenz → Direktvergleich (Volleyball/Unihockey)."
      },
    ],
  },
  {
    title: "Zahlungen & QR-Rechnung",
    items: [
      {
        question: "Welche Zahlungsmethoden werden unterstützt?",
        answer: "Grümpi unterstützt Bar-Zahlung, QR-Rechnung (Swiss QR Invoice), Twint und andere Zahlungsmethoden. Du kannst festlegen, welche Optionen du anbietest."
      },
      {
        question: "Wie funktioniert die QR-Rechnung?",
        answer: "Nach Eingabe deiner Zahlungsinformationen (IBAN, Name, Adresse) generiert Grümpi automatisch Swiss QR-Rechnungen als PDF für jedes Team. Die Referenznummer wird automatisch basierend auf der Team-ID erstellt."
      },
      {
        question: "Wie richte ich die QR-Rechnung ein?",
        answer: "Gehe zu 'Zahlungseinstellungen' im Turnier oder hinterlege deine Standarddaten in deinem Profil. Benötigt werden: IBAN, Empfängername, Adresse, PLZ und Ort."
      },
      {
        question: "Wie verfolge ich den Zahlungsstatus?",
        answer: "Im Bereich 'Zahlungen' siehst du alle Teams mit ihrem aktuellen Zahlungsstatus. Du kannst Teams als bezahlt markieren, die Zahlungsmethode ändern oder QR-Rechnungen generieren."
      },
    ],
  },
  {
    title: "Custom Domain",
    items: [
      {
        question: "Kann ich eine eigene Domain für mein Turnier verwenden?",
        answer: "Ja, du kannst eine eigene Domain (z.B. turnier.dein-verein.ch) für dein Turnier einrichten. Diese leitet dann direkt auf die öffentliche Turnierseite weiter."
      },
      {
        question: "Wie richte ich eine Custom Domain ein?",
        answer: "Gehe zu 'Domain Einstellungen' im Turnier und gib deine gewünschte Domain ein. Du erhältst dann DNS-Einstellungen (A-Record oder CNAME), die du bei deinem Domain-Anbieter hinterlegen musst."
      },
      {
        question: "Wie lange dauert die Domain-Verifizierung?",
        answer: "Nach dem Setzen der DNS-Einträge kann die Verifizierung bis zu 48 Stunden dauern, abhängig von deinem DNS-Anbieter. Du kannst den Status jederzeit im Dashboard überprüfen."
      },
    ],
  },
  {
    title: "Live-Resultate & Cockpit",
    items: [
      {
        question: "Wie trage ich Spielresultate ein?",
        answer: "Im Bereich 'Spielresultate' kannst du für jedes Spiel die Resultate eingeben. Die Tabellen und Ranglisten werden automatisch aktualisiert."
      },
      {
        question: "Was ist das Turnier-Cockpit?",
        answer: "Das Cockpit ist eine Echtzeit-Ansicht für den Turniertag. Es zeigt aktuelle Spiele, Spielfelder, Zeiten und kann auf einem grossen Bildschirm angezeigt werden."
      },
      {
        question: "Können Teams ihre Spiele und Resultate sehen?",
        answer: "Ja, über die öffentliche Turnierseite können alle Teilnehmer und Zuschauer den Spielplan, aktuelle Resultate und Tabellen einsehen – ohne Anmeldung."
      },
    ],
  },
  {
    title: "Technisches & Support",
    items: [
      {
        question: "Welche Browser werden unterstützt?",
        answer: "Grümpi funktioniert in allen modernen Browsern (Chrome, Firefox, Safari, Edge). Die Plattform ist vollständig responsive und funktioniert auch auf Smartphones und Tablets."
      },
      {
        question: "Sind meine Daten sicher?",
        answer: "Ja, alle Daten werden verschlüsselt übertragen und auf sicheren Servern in der Schweiz gespeichert. Wir verwenden Supabase als Backend-Infrastruktur."
      },
      {
        question: "An wen kann ich mich bei Fragen wenden?",
        answer: "Bei Fragen oder Problemen kannst du uns über das Kontaktformular oder per E-Mail erreichen. Wir helfen dir gerne weiter."
      },
    ],
  },
];

const FAQAccordionItem = ({ item, isOpen, onClick }: { item: FAQItem; isOpen: boolean; onClick: () => void }) => {
  return (
    <div className="border-b border-gray-800">
      <button
        className="w-full py-5 flex items-center justify-between text-left"
        onClick={onClick}
      >
        <span className="text-white font-medium pr-4">{item.question}</span>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-gray-400 leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
};

const FAQ = () => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    const key = `${categoryIndex}-${itemIndex}`;
    setOpenItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <ModernNavigation />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Häufig gestellte Fragen
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Finde Antworten zu den wichtigsten Fragen rund um Grümpi und die Turnierorganisation.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="pb-24 px-4">
        <div className="container mx-auto max-w-3xl">
          {faqData.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-12">
              <h2 className="text-xl font-semibold text-orange-500 mb-4">
                {category.title}
              </h2>
              <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
                {category.items.map((item, itemIndex) => (
                  <FAQAccordionItem
                    key={itemIndex}
                    item={item}
                    isOpen={openItems[`${categoryIndex}-${itemIndex}`] || false}
                    onClick={() => toggleItem(categoryIndex, itemIndex)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 border-t border-gray-800">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Noch Fragen?
          </h2>
          <p className="text-gray-400 mb-6">
            Wir helfen dir gerne weiter.
          </p>
          <a
            href="mailto:info@gruempi.ch"
            className="inline-flex items-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-full transition-colors"
          >
            Kontakt aufnehmen
          </a>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
};

export default FAQ;
