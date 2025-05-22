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

## Smart Backend Detection & Demo Mode

The project intelligently detects the environment and switches between real backend and demo mode:

- **Smart Detection**: Only enables demo mode for Lovable preview URLs (not published sites)
- **Backend Health Check**: Attempts to connect to the real backend before falling back to demo
- **Automatic Fallback**: Gracefully switches to demo mode if backend is unavailable
- **Production Ready**: Published games automatically connect to real backend when available
- **Manual Override**: Add `?demo=true` to any URL to force demo mode for testing

### Demo Features (when backend unavailable)
- Create mock games with random game IDs
- Simulate multiplayer with AI opponents  
- Interactive betting and card playing
- Visual feedback and game state transitions
- Error-free preview experience

### Backend Detection Logic
1. **Preview Mode**: Activates for Lovable preview URLs containing 'preview'
2. **Backend Health Check**: Tries `/api/health` endpoint with 5-second timeout
3. **Graceful Fallback**: Shows demo mode if backend connection fails
4. **User Feedback**: Loading states and clear mode indicators

## Current Status

### ✅ Frontend Deployment
- Frontend is successfully deployed via Lovable
- Smart backend detection is working
- Graceful fallback to demo mode implemented

### ⚠️ Backend Deployment Needed
The backend (Node.js server) needs to be deployed separately for full functionality:

1. **Current State**: Frontend detects no backend and shows demo mode
2. **Next Step**: Deploy backend to Railway/Vercel/Heroku
3. **Final Step**: Update frontend to point to deployed backend

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Notes

- The original Next.js structure remains intact
- The `src/` directory contains Vite-compatible versions of the components
- Both implementations share the same backend API structure
- Socket.io configuration is maintained in both setups
- Demo mode only activates when backend is unavailable
- Added health check endpoint (`/api/health`) for backend detection 