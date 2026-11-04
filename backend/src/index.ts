import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { SocketHandler } from './handlers/SocketHandler.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// CORS configuration supporting local Vite dev, localhost ports, and Vercel deployments
const allowedOrigins = [
  clientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    // Allow all in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Basic health check route for Render / Railway / Uptime monitors
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    service: 'Skribbl Clone WebSocket API'
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.send('Skribbl Clone Backend Server is running.');
});

// Create HTTP and Socket.IO Server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for WebSocket connections or clientUrl
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// Register Socket Handler
const socketHandler = new SocketHandler(io);
socketHandler.register();

// Start Server
server.listen(port, () => {
  console.log(`🚀 Skribbl Clone Backend Server is listening on port ${port}`);
  console.log(`🔌 Socket.IO ready for real-time multiplayer connections`);
});

// Handle graceful termination
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
