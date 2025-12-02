import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Github } from "lucide-react";

const ModernFooter = () => {
  return (
    <footer id="footer" className="bg-background text-foreground pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div>
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              Grümpi
            </h3>
            <p className="text-muted-foreground mb-4">
              Die moderne Plattform für Turnierorganisation in der Schweiz.
              <br />
              Einfach. Digital. Gemeinsam.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="sr-only">Facebook</span>
                <Facebook className="h-6 w-6" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="sr-only">Twitter</span>
                <Twitter className="h-6 w-6" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="sr-only">Instagram</span>
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-6 w-6" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="sr-only">GitHub</span>
                <Github className="h-6 w-6" />
              </a>
            </div>
            {/* Swiss Made Badge */}
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 bg-card px-3 py-2 rounded-lg border border-border">
                <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">+</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  swiss made software
                </span>
              </div>
            </div>
          </div>

          {/* Produkt */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Produkt</h3>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                  Funktionen
                </a>
              </li>
              <li>
                <a href="#cta" className="text-muted-foreground hover:text-primary transition-colors">
                  Preise
                </a>
              </li>
              <li>
                <a href="#footer" className="text-muted-foreground hover:text-primary transition-colors">
                  Über uns
                </a>
              </li>
              <li>
                <Link to="/tournaments" className="text-muted-foreground hover:text-primary transition-colors">
                  Turniere
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Hilfe Center
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Kontakt
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Dokumentation
                </a>
              </li>
            </ul>
          </div>

          {/* Rechtliches */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Rechtliches</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/impressum" className="text-muted-foreground hover:text-primary transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link to="/datenschutz" className="text-muted-foreground hover:text-primary transition-colors">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link to="/agb" className="text-muted-foreground hover:text-primary transition-colors">
                  AGB
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Grümpi. Alle Rechte vorbehalten.
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link to="/impressum" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Impressum
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link to="/datenschutz" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Datenschutz
              </Link>
              <Link to="/agb" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                AGB
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ModernFooter;
