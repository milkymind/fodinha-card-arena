# Deployment Guide

This guide explains how to deploy your Fodinha Card Game for production use.

## Architecture Overview

The project consists of two parts:
- **Frontend**: React app (deployed via Lovable)
- **Backend**: Node.js server with Socket.io (needs separate deployment)

## Frontend Deployment (Lovable)

✅ **Already Done**: Your frontend is deployed via Lovable at your published URL.

## Backend Deployment Options

You need to deploy your Node.js backend separately. Here are the recommended options:

### Option 1: Render (Recommended - Great Free Tier)

1. **Sign up** at [render.com](https://render.com)
2. **Connect GitHub** account in Render dashboard
3. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Repository: Select your `fodinha-card-arena` repo
   - Name: `fodinha-card-game-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm run start`
   - Plan: `Free` (or `Starter $7/month` for better performance)

4. **Set Environment Variables** (in Render dashboard):
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render default)

5. **Advanced Settings** (optional):
   - Health Check Path: `/api/health`
   - Auto-Deploy: `Yes` (deploys on every Git push)

6. **Deploy**: Click "Create Web Service"
7. **Get your URL**: `https://your-service-name.onrender.com`

### Option 2: Railway

1. **Sign up** at [railway.app](https://railway.app)
2. **Connect your GitHub** repository
3. **Deploy the backend**:
   ```bash
   # In your project root, create a railway.json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm run start",
       "healthcheckPath": "/api/health"
     }
   }
   ```
4. **Set environment variables** in Railway dashboard
5. **Get your Railway URL** (e.g., `https://your-app.railway.app`)

### Option 3: Vercel

1. **Install Vercel CLI**: `npm i -g vercel`
2. **Deploy**:
   ```bash
   vercel --prod
   ```
3. **Configure vercel.json** for API routes
4. **Get your Vercel URL** (e.g., `https://your-app.vercel.app`)

### Option 4: Heroku

1. **Create Heroku app**: `heroku create your-app-name`
2. **Push to Heroku**: `git push heroku main`
3. **Set environment variables**: `heroku config:set NODE_ENV=production`
4. **Get your Heroku URL** (e.g., `https://your-app.herokuapp.com`)

## Step-by-Step Render Deployment

### Step 1: Prepare Your Repository

Make sure these files are in your repository root:
- ✅ `render.yaml` (already created)
- ✅ `pages/api/health.ts` (already created)
- ✅ `package.json` with start script

### Step 2: Deploy to Render

1. **Go to [render.com](https://render.com)** and sign up/login
2. **Connect GitHub**: Authorize Render to access your repositories
3. **Create Web Service**:
   - Dashboard → "New +" → "Web Service"
   - Select your `fodinha-card-arena` repository
   - Click "Connect"

4. **Configure Service**:
   ```
   Name: fodinha-card-game-backend
   Environment: Node
   Region: Choose closest to your users
   Branch: main
   Build Command: npm install
   Start Command: npm run start
   ```

5. **Environment Variables**:
   ```
   NODE_ENV = production
   PORT = 10000
   ```

6. **Advanced Settings**:
   ```
   Health Check Path: /api/health
   Auto-Deploy: Yes
   ```

7. **Click "Create Web Service"**

### Step 3: Verify Deployment

1. **Wait for build** (usually 2-5 minutes)
2. **Check deployment logs** in Render dashboard
3. **Test health endpoint**: Visit `https://your-service.onrender.com/api/health`
4. **Copy your service URL**

### Step 4: Connect Frontend to Backend

Once deployed, update your frontend to use the Render backend:

1. **Get your Render URL** from the dashboard
2. **Update environment variable approach** (recommended):

Create a `.env.production` file:
```env
VITE_BACKEND_URL=https://your-service-name.onrender.com
```

3. **Update your App.tsx** to use environment variables:

```typescript
// At the top of App.tsx
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// In your fetch calls
const response = await fetch(`${BACKEND_URL}/api/health`, {
  // ... existing config
});

// In your socket connection
const socketConnection = io(BACKEND_URL, {
  // ... existing config
});
```

### Step 5: Update CORS Settings

Update your backend CORS to allow your Lovable frontend:

In your `pages/api/socket.ts` or main server file:
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://your-frontend-url.lovable.app', // Your Lovable URL
    'http://localhost:3000' // For development
  ],
  credentials: true
}));
```

## Connecting Frontend to Backend

Once your backend is deployed, update your frontend to point to it:

### Update Vite Config

Edit `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://YOUR-RENDER-URL.onrender.com', // Replace with your Render URL
        changeOrigin: true,
        secure: true,
      },
      '/socket.io': {
        target: 'https://YOUR-RENDER-URL.onrender.com', // Replace with your Render URL
        changeOrigin: true,
        ws: true,
        secure: true,
      }
    }
  }
})
```

### Alternative: Environment Variables

Create a `.env` file:

```env
VITE_BACKEND_URL=https://your-render-url.onrender.com
```

Then update your App.tsx to use the environment variable:

```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

// Use backendUrl in your fetch calls and socket connection
const response = await fetch(`${backendUrl}/api/health`);
```

## Backend Requirements

Ensure your backend includes:

### Health Check Endpoint

✅ **Already Added**: `/api/health` endpoint created

### CORS Configuration

Update your backend CORS settings:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://your-frontend-url.lovable.app', // Your Lovable frontend URL
    'http://localhost:3000' // For local development
  ],
  credentials: true
}));
```

### Socket.io CORS

Update Socket.io configuration:

```javascript
const io = new Server(server, {
  cors: {
    origin: [
      'https://your-frontend-url.lovable.app',
      'http://localhost:3000'
    ],
    credentials: true
  }
});
```

## Testing Your Deployment

1. **Deploy backend** to Render
2. **Update frontend** configuration with Render URL
3. **Redeploy frontend** via Lovable (push changes to GitHub)
4. **Test the game** - should connect to real backend instead of demo mode

## Environment Variables

Set these on your backend deployment platform:

```env
NODE_ENV=production
PORT=10000 (Render default)
DATABASE_URL=your-database-url (if using external DB)
```

## Troubleshooting

### Frontend shows "Backend Not Available"
- Check Render deployment logs
- Verify backend URL in frontend config
- Test backend health endpoint directly: `https://your-service.onrender.com/api/health`

### WebSocket connection fails
- Check CORS configuration in your backend
- Verify Socket.io setup on backend
- Ensure backend supports WebSocket connections
- Check Render logs for connection errors

### Games don't persist
- Check database connection
- Verify file permissions for JSON database
- Consider using external database for production

### Render-Specific Issues
- **Cold starts**: Free tier services sleep after 15 minutes of inactivity
- **Build timeouts**: Increase build timeout in Render settings if needed
- **Environment variables**: Double-check they're set correctly in Render dashboard

## Cost Considerations

- **Render**: Free tier (with cold starts), $7/month for Starter plan
- **Railway**: Free tier available, then $5/month
- **Vercel**: Free tier for hobby projects
- **Heroku**: $7/month (no free tier)
- **Database**: Consider upgrading to PostgreSQL/MongoDB for production

## Next Steps

1. ✅ Choose Render as deployment platform
2. 🔄 Deploy your backend to Render
3. 🔄 Update frontend configuration with Render URL
4. 🔄 Test the full multiplayer experience
5. 🔄 Monitor performance and scale as needed 