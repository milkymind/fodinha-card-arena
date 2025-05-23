import { useEffect, useState } from 'react';
import './App.css'
import io, { Socket } from 'socket.io-client';
import { createContext } from 'react';
import Home from './pages/Home';

// Create a WebSocket context to be used throughout the app
export const SocketContext = createContext<Socket | null>(null);

// Get backend URL from environment or default to current domain
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Check if we're in a preview/demo environment
const isPreviewMode = () => {
  // Only enable demo mode for specific preview URLs or when explicitly requested
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // Check for Lovable preview URLs (these typically have 'preview' in the URL)
  const isLovablePreview = hostname.includes('lovable.app') && 
    (hostname.includes('preview') || pathname.includes('preview'));
  
  // Check for localhost development
  const isLocalhost = hostname.includes('localhost') || hostname === '127.0.0.1';
  
  // Check for explicit demo mode via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const forceDemoMode = urlParams.get('demo') === 'true';
  
  return isLovablePreview || isLocalhost || forceDemoMode;
};

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(false);

  useEffect(() => {
    // Check if we're in preview mode
    if (isPreviewMode()) {
      console.log('Running in demo mode - backend connections disabled');
      setDemoMode(true);
      return;
    }

    // Try to connect to backend, fallback to demo mode if unavailable
    const checkBackendAvailability = async () => {
      setIsCheckingBackend(true);
      try {
        // Try to ping the backend with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        // Try multiple endpoints to check backend availability
        const endpoints = ['/api/health', '/api/socket'];
        let backendAvailable = false;
        
        for (const endpoint of endpoints) {
          try {
            const url = BACKEND_URL ? `${BACKEND_URL}${endpoint}` : endpoint;
            const response = await fetch(url, { 
              method: 'GET',
              signal: controller.signal,
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            
            if (response.ok || response.status === 404) {
              // 404 is acceptable for health check - means server is responding
              backendAvailable = true;
              break;
            }
          } catch (endpointError) {
            // Continue to next endpoint
            continue;
          }
        }
        
        clearTimeout(timeoutId);
        
        if (!backendAvailable) {
          throw new Error('No backend endpoints available');
        }
        
        console.log('Backend available, initializing socket connection');
        initializeSocket();
      } catch (error) {
        console.log('Backend not available, falling back to demo mode:', error);
        setDemoMode(true);
      } finally {
        setIsCheckingBackend(false);
      }
    };

    // Initialize socket connection (only when backend is available)
    const initializeSocket = async () => {
      try {
        // Make sure the socket server is running
        const socketUrl = BACKEND_URL ? `${BACKEND_URL}/api/socket` : '/api/socket';
        await fetch(socketUrl);
        
        // Connect to the socket server with improved reconnection settings
        const socketConnection = io(BACKEND_URL || '', {
          path: '/api/socket-io',
          addTrailingSlash: false,
          reconnection: true,
          reconnectionAttempts: Infinity, // Never stop trying to reconnect
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
          timeout: 60000, // Longer timeout
          transports: ['websocket', 'polling'], // Try websocket first, fall back to polling
          forceNew: true, // Create a new connection each time
          autoConnect: true, // Auto connect on instantiation
          upgrade: true, // Allow transport upgrade
        });
        
        // Set up event listeners
        socketConnection.on('connect', () => {
          console.log('Socket connected:', socketConnection.id);
          setSocketConnected(true);
        });
        
        socketConnection.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          setSocketConnected(false);
          
          // Handle specific disconnect reasons
          if (reason === 'io server disconnect') {
            // Server has forcefully disconnected, try reconnecting manually
            setTimeout(() => {
              socketConnection.connect();
            }, 1000);
          }
          // For other reasons, socket.io will try to reconnect automatically
        });
        
        socketConnection.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setSocketConnected(false);
          
          // If connection fails, fall back to demo mode
          setTimeout(() => {
            if (!socketConnected) {
              console.log('Socket connection failed, falling back to demo mode');
              setDemoMode(true);
              socketConnection.disconnect();
            }
          }, 2000);
        });
        
        socketConnection.on('reconnect', (attemptNumber) => {
          console.log(`Socket reconnected after ${attemptNumber} attempts`);
        });
        
        socketConnection.on('reconnect_attempt', (attemptNumber) => {
          console.log(`Socket reconnect attempt #${attemptNumber}`);
        });
        
        socketConnection.on('reconnect_error', (error) => {
          console.error('Socket reconnection error:', error);
        });
        
        socketConnection.on('reconnect_failed', () => {
          console.error('Socket reconnection failed, will reset connection');
          // Reset the socket state to trigger a fresh connection
          setSocket(null);
        });
        
        socketConnection.on('error', (error) => {
          console.error('Socket error:', error);
        });
        
        setSocket(socketConnection);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        // Try again after a delay with exponential backoff
        setTimeout(initializeSocket, 3000);
      }
    };

    // Check backend availability and initialize accordingly
    checkBackendAvailability();

    // Clean up on unmount
    return () => {
      if (socket) {
        console.log('Cleaning up socket connection');
        socket.disconnect();
        setSocket(null);
      }
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      <Home demoMode={demoMode} isCheckingBackend={isCheckingBackend} />
    </SocketContext.Provider>
  );
}

export default App; 