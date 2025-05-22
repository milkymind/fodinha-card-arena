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

### Option 1: Railway (Recommended)

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

### Option 2: Vercel

1. **Install Vercel CLI**: `npm i -g vercel`
2. **Deploy**:
   ```bash
   vercel --prod
   ```
3. **Configure vercel.json** for API routes
4. **Get your Vercel URL** (e.g., `https://your-app.vercel.app`)

### Option 3: Heroku

1. **Create Heroku app**: `heroku create your-app-name`
2. **Push to Heroku**: `git push heroku main`
3. **Set environment variables**: `heroku config:set NODE_ENV=production`
4. **Get your Heroku URL** (e.g., `https://your-app.herokuapp.com`)

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
        target: 'https://YOUR-BACKEND-URL.com', // Replace with your deployed backend URL
        changeOrigin: true,
        secure: true,
      },
      '/socket.io': {
        target: 'https://YOUR-BACKEND-URL.com', // Replace with your deployed backend URL
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
VITE_BACKEND_URL=https://your-backend-url.com
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

Add to your backend (if not already present):

```javascript
// In your main server file
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});
```

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

1. **Deploy backend** to your chosen platform
2. **Update frontend** configuration with backend URL
3. **Redeploy frontend** via Lovable (push changes to GitHub)
4. **Test the game** - should connect to real backend instead of demo mode

## Environment Variables

Set these on your backend deployment platform:

```env
NODE_ENV=production
PORT=8000
DATABASE_URL=your-database-url (if using external DB)
```

## Troubleshooting

### Frontend shows "Backend Not Available"
- Check backend deployment logs
- Verify backend URL in frontend config
- Test backend health endpoint directly

### WebSocket connection fails
- Check CORS configuration
- Verify Socket.io setup on backend
- Ensure backend supports WebSocket connections

### Games don't persist
- Check database connection
- Verify file permissions for JSON database
- Consider using external database for production

## Cost Considerations

- **Railway**: Free tier available, then $5/month
- **Vercel**: Free tier for hobby projects
- **Heroku**: $7/month (no free tier)
- **Database**: Consider upgrading to PostgreSQL/MongoDB for production

## Next Steps

1. Choose a backend deployment platform
2. Deploy your backend
3. Update frontend configuration
4. Test the full multiplayer experience
5. Monitor performance and scale as needed 