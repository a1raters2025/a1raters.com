# Project Guidelines

## Frontend (`frontend/`)
- **Lint**: `cd frontend && npx eslint src --ext .ts,.tsx`
- **Typecheck**: `cd frontend && npx tsc --noEmit --skipLibCheck`
- **Build**: `cd frontend && npx vite build`
- **Dev server**: `cd frontend && npx vite` (defaults to port 5173, falls back to next available)

## Backend (`backend/`)
- **Run dev**: `cd backend && npm run dev` (Express JS on port 5000)
- **API base**: `http://localhost:5000/api/v1`
- **Typecheck**: `cd backend && npx tsc --noEmit`

## Architecture
- Stack: React 19 + TypeScript + Vite + Tailwind CSS 4 + Framer Motion 13 + lucide-react
- UI: All cards/components use glassmorphism via `GlassCard.tsx` or Tailwind glass utilities
- Auth is JWT-based via `authService.ts`
