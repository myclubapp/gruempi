# CLAUDE.md

Dieses File gibt Claude Code Anleitungen zur Arbeit im Repository.

## Projektübersicht

**Grümpi** ist eine Turniermanagement-Plattform für Grümpelturniere in der Schweiz. Gebaut mit React, TypeScript, Vite und Supabase.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui (Radix)
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth)
- **State**: TanStack Query
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod

## Commands

```bash
npm i            # Dependencies installieren
npm run dev      # Dev Server (Port 8080)
npm run build    # Production Build
npm run lint     # Code Linting
```

## Projektstruktur

```
src/
├── components/           # React Komponenten
│   ├── ui/              # shadcn/ui Basiskomponenten
│   └── tournament/      # Turnier-spezifische Komponenten
├── pages/               # Seitenkomponenten
├── integrations/        # Supabase Client & Types
├── hooks/               # Custom React Hooks
└── lib/                 # Utilities
```

## Routing

**Öffentlich:**
- `/` - Landing Page
- `/auth` - Authentifizierung
- `/tournaments` - Turnierliste
- `/tournaments/:id` - Turnierdetails

**Geschützt (Auth erforderlich):**
- `/dashboard` - Veranstalter Dashboard
- `/dashboard/tournament/:id` - Turnierverwaltung
- `/dashboard/tournament/:id/cockpit` - Live Cockpit

## Wichtige Konventionen

### Imports
```typescript
// Supabase Client
import { supabase } from "@/integrations/supabase/client";

// UI Komponenten
import { Button } from "@/components/ui/button";

// Types
import { Database } from "@/integrations/supabase/types";
```

### Notifications
```typescript
import { toast } from "sonner";
toast.success("Erfolg");
toast.error("Fehler");
```

### Datum formatieren
```typescript
import { format } from "date-fns";
import { de } from "date-fns/locale";
format(date, "d. MMMM yyyy", { locale: de });
```

## Kernfunktionen

1. **Team-Anmeldung** - Online-Registrierung mit Kategorien
2. **Spielplan-Generator** - Automatische Gruppen- & KO-Phase
3. **Zahlungsverwaltung** - Swiss QR-Rechnung Support
4. **Live-Resultate** - Echtzeit-Updates
5. **Custom Domains** - Eigene Turnierdomains

## Supabase Tabellen

- `tournaments` - Turnierdaten
- `tournament_categories` - Kategorien mit Gebühren
- `teams` - Teamregistrierungen
- `matches` - Spielplan & Resultate
- `profiles` - Benutzerprofile

## Testing

1. Auth-Flows testen (Login/Logout)
2. Supabase Queries prüfen
3. Responsive Design checken
4. Mit echten Turnierdaten testen
