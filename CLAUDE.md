# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grümpi is a tournament management platform built with React, TypeScript, Vite, and Supabase. It allows organizers to create and manage sports tournaments with features including team registration, payment tracking, match scheduling, and custom tournament domains.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Tailwind CSS, shadcn/ui (Radix UI components)
- **Backend**: Supabase (PostgreSQL database, Edge Functions, Storage, Auth)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **Payments**: Swiss QR Bill generation using `swissqrbill` library
- **Date Handling**: date-fns

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development environment
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Routing Structure

- **Public Routes**:
  - `/` - Landing page
  - `/auth` - Authentication (Supabase Auth with magic links)
  - `/tournaments` - Public tournament listing
  - `/tournaments/:id` - Public tournament detail view
  - `/teams/:teamId/register/:token` - Player registration for teams
  - `/tournaments/:teamId/registration-success` - Registration success page

- **Protected Routes** (require authentication):
  - `/dashboard` - Organizer dashboard (tournament list)
  - `/dashboard/create-tournament` - Tournament creation form
  - `/dashboard/tournament/:id` - Tournament detail and management
  - `/dashboard/tournament/:id/cockpit` - Live tournament cockpit (match displays)
  - `/profile` - User profile management

### Custom Domain Routing

The `CustomDomainRouter` component handles custom domain mapping:
- Checks if the current hostname matches a tournament's custom domain
- Automatically redirects to the tournament's public page
- Updates domain status from "verifying" to "active" when accessed
- Skips domain checks for localhost, lovable.app, vercel.app, and gruempi.my-club.app

### Component Organization

- `/src/components/` - Shared components (Navigation, Layout, etc.)
- `/src/components/ui/` - shadcn/ui components (Button, Card, Dialog, etc.)
- `/src/components/tournament/` - Tournament-specific components:
  - `MatchScheduleGenerator.tsx` - Generates group phase and knockout matches
  - `TeamPaymentManagement.tsx` - Payment tracking and QR invoice generation
  - `GroupManagement.tsx` - Group creation and team assignments
  - `StandingsTable.tsx` - Tournament standings
  - `TeamRegistrationForm.tsx` - Team registration interface
  - `PaymentSettings.tsx` - Payment configuration
  - `DomainSettings.tsx` - Custom domain configuration

### Database Schema (Supabase)

Key tables:
- `profiles` - User profiles with creditor information for QR invoices
- `tournaments` - Tournament data including schedule, location, custom domain
- `tournament_categories` - Tournament categories with player limits and entry fees
- `tournament_groups` - Groups within categories
- `teams` - Team registrations with payment status
- `team_members` - Individual players on teams
- `team_group_assignments` - Team-to-group mappings
- `matches` - Match schedule and results
- `tournament_schedule_config` - Match duration, break times, field configuration
- `sponsors` - Tournament sponsors

### Supabase Edge Functions

Located in `/supabase/functions/`:
- `generate-qr-invoice` - Generates Swiss QR Bill PDFs for team payments using swissqrbill library and pdf-lib
- `create-team-payment` - Creates payment records for teams
- `send-team-confirmation` - Sends confirmation emails to teams
- `manage-vercel-domain` - Manages custom domain setup via Vercel API

### Path Alias

The project uses `@/` as an alias for the `/src` directory (configured in vite.config.ts).

Example: `import { Button } from "@/components/ui/button"`

## Key Features

### Tournament Categories and Groups

Tournaments can have multiple categories (e.g., "Sportler/innen", "Hobbyspieler"). Each category has:
- Player limits (min/max players per team, max licensed players)
- Team limits (min/max teams)
- Individual entry fee
- Multiple groups for round-robin play

### Match Schedule Generation

The `MatchScheduleGenerator` component creates:
1. **Group Phase**: Round-robin matches within each group
2. **Knockout Phase**: Elimination rounds with top teams from groups
3. Configurable match duration, break times, and number of fields
4. Automatic field assignment and time slot calculation

### Payment Management

Teams can pay via:
- Bar (cash)
- QR-Rechnung (Swiss QR Invoice) - automatically generated with team details
- Twint
- Other methods

QR invoices use the organizer's creditor information from their profile and generate a unique QR reference based on tournament and team IDs.

### Authentication Flow

- Uses Supabase Auth with magic link emails (no passwords)
- `ProtectedRoute` component wraps authenticated pages
- Session persists across page reloads
- User profiles created automatically on first login

## Important Conventions

### Supabase Client Usage

Always import the Supabase client from the integration:
```typescript
import { supabase } from "@/integrations/supabase/client";
```

### Type Safety

Database types are auto-generated in `/src/integrations/supabase/types.ts`. Use these for type-safe queries:
```typescript
import { Database } from "@/integrations/supabase/types";
```

### Date Formatting

Use `date-fns` for date operations with Swiss locale:
```typescript
import { format } from "date-fns";
import { de } from "date-fns/locale";
```

### Toast Notifications

Use `sonner` for user notifications:
```typescript
import { toast } from "sonner";
toast.success("Success message");
toast.error("Error message");
```

### Form Validation

Use React Hook Form with Zod schemas for form validation:
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
```

## Deployment

The application is deployed on Vercel (configured in vercel.json). The Supabase project is hosted at `whxquahduaoocoptlmfy.supabase.co`.

Environment variables are stored in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Testing Strategy

When making changes:
1. Test both authenticated and unauthenticated flows
2. Verify Supabase queries return expected data
3. Check responsive design (mobile/desktop)
4. Test with actual tournament data if possible
5. Verify custom domain routing doesn't break standard domains
