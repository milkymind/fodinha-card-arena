import { createContext } from 'react';
import { Socket } from 'socket.io-client';

// Create a WebSocket context to be used throughout the app
export const SocketContext = createContext<Socket | null>(null); 