# Helix Client

React (Vite) frontend for Helix — see [`plan.md`](../../plan.md) at the repository root for the full architecture and design rationale.

## Stack

- React 19 + Vite
- Tailwind CSS v4 (CSS-based config, see `src/index.css`)
- Framer Motion for page transitions and micro-interactions
- React Flow for the relationship graph (Module 3)
- Recharts (available for analytics views)
- Axios for API communication, React Router for navigation

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL if the server isn't on localhost:5000
npm run dev             # http://localhost:5173
```

## Structure

```
src/
  pages/         Login, Register, Dashboard (Module 1/2), Graph (Module 3),
                 Timeline (Module 4), Ask (Module 5)
  components/    Sidebar, MainLayout, UploadDropzone, DocumentCard,
                 GraphView (React Flow wrapper), PageTransition, ProtectedRoute
  context/       AuthContext (JWT stored in localStorage)
  lib/api.js     Axios instance with bearer-token interceptor
```

The app requires the Helix API server (`../server`) to be running for any page beyond the login screen to function.
