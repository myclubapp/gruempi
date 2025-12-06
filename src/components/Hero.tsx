import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Logo from "./Logo";

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-gray-900 to-black pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden min-h-[90vh]">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-10 right-10 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 left-20 w-80 h-80 bg-red-500/10 rounded-full blur-3xl"></div>
        <div
          className="absolute top-1/2 left-1/3 w-40 h-40 bg-orange-500/15 rounded-full blur-2xl animate-float"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start">
              <Logo showText={false} linkTo="" />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
              <span className="text-orange-500">Grümpelturniere</span>, die
              <br />
              wieder <span className="text-orange-500">Freude</span> machen
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto lg:mx-0">
              Mit Grümpi wird aus Aufwand wieder Passion.
              <br />
              Digital. Einfach. Gemeinsam.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="bg-orange-500 text-white hover:bg-orange-600 text-lg px-8 py-6 rounded-full"
                onClick={() => window.location.href = "#features"}
              >
                Funktionen ansehen
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Right Content - App Screenshot */}
          <div className="hidden lg:flex items-center justify-center relative">
            <div className="relative">
              {/* Phone Frame */}
              <div className="relative w-[320px] h-[650px] bg-gray-800 rounded-[3rem] p-3 shadow-2xl border-4 border-gray-700">
                {/* Phone Screen */}
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                  {/* Status Bar */}
                  <div className="absolute top-0 left-0 right-0 h-8 bg-primary flex items-center justify-between px-6 z-10">
                    <span className="text-white text-xs font-medium">10:55</span>
                    <div className="w-20 h-5 bg-black rounded-full"></div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 bg-white/80 rounded-sm"></div>
                    </div>
                  </div>

                  {/* App Content Preview */}
                  <div className="pt-10 px-4 h-full bg-gray-50">
                    {/* Map Preview */}
                    <div className="w-full h-48 bg-gradient-to-br from-green-100 to-blue-100 rounded-xl mb-4 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-50">
                        <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg"></div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 bg-white rounded-lg p-2 shadow-sm">
                        <p className="text-xs font-medium text-gray-800 truncate">Sportplatz Musterstadt</p>
                        <p className="text-[10px] text-gray-500">Turniergelände</p>
                      </div>
                    </div>

                    {/* Match Info Cards */}
                    <div className="space-y-3">
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">G</span>
                          </div>
                          <span className="text-xs font-semibold text-gray-800">Grümpi Cup 2025</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>Gruppe A</span>
                          <span>15:30 Uhr</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full"></div>
                            <span className="text-xs font-medium">FC Muster</span>
                          </div>
                          <span className="text-lg font-bold text-gray-800">3:1</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">SV Sport</span>
                            <div className="w-8 h-8 bg-green-100 rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-[8px]">📅</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-800">Nächstes Spiel</p>
                            <p className="text-[10px] text-gray-500">16:00 Uhr · Platz 2</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -top-4 -right-4 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                100% Kostenlos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 w-full">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="fill-background">
          <path fillOpacity="1" d="M0,96L48,85.3C96,75,192,53,288,53.3C384,53,480,75,576,85.3C672,96,768,96,864,80C960,64,1056,32,1152,26.7C1248,21,1344,43,1392,53.3L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"/>
        </svg>
      </div>
    </section>
  );
};

export default Hero;
