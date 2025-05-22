# Lovable Setup Documentation

This project has been configured to work with Lovable's preview environment. The following changes were made:

## Files Added for Lovable Compatibility

### 1. `index.html`
- Main HTML entry point required by Vite and Lovable
- Points to the React application root

### 2. `vite.config.ts`
- Vite configuration file
- Includes proxy settings for API routes to backend server
- Configures build output and development server

### 3. `src/` Directory Structure
- `src/main.tsx` - Entry point for React application
- `src/App.tsx` - Main App component (replaces Next.js _app.tsx)
- `src/pages/Home.tsx` - Home page component (adapted from pages/index.tsx)
- `src/components/Game.tsx` - Game component (copied from components/)
- `src/styles/` - CSS modules and styles
- `src/index.css` - Global styles
- `src/App.css` - App component styles

## Package.json Changes

### New Scripts Added
- `build:dev` - Required by Lovable for development builds
- `dev:vite` - Development server using Vite
- `build:vite` - Production build using Vite
- `preview` - Preview built application

### New Dependencies Added
- `vite` - Build tool and development server
- `@vitejs/plugin-react` - React plugin for Vite

## How It Works

The project now supports both Next.js (original) and Vite (for Lovable):

- **Next.js Development**: `npm run dev` (original implementation)
- **Vite Development**: `npm run dev:vite` (Lovable compatible)
- **Lovable Build**: `npm run build:dev` (required by Lovable)

## Notes

- The original Next.js structure remains intact
- The `src/` directory contains Vite-compatible versions of the components
- Both implementations share the same backend API structure
- Socket.io configuration is maintained in both setups 