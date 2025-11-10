/**
 * Simple Platium.vip Game Streaming Backend
 * No database - uses in-memory storage
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Create Express app
const app = express();
app.set('trust proxy', 1);

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('[CORS] Request origin:', origin, 'URL:', req.method, req.url);

  // Set CORS headers
  res.header('Access-Control-Allow-Origin', 'https://platium.vip');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,skip_zrok_interstitial');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(compression());
app.use(helmet({
  crossOriginEmbedderPolicy: false
}));

// In-memory game storage
const games = [
  {
    id: '57216f4d-158c-446e-96d3-c28b7ea34354',
    title: 'Mario Party 7',
    slug: 'mario-party-7',
    system: 'gamecube',
    year: 2001,
    genre: 'Party',
    playerCount: 4,
    romPath: '/home/jak/projects/roms/gamecube/Mario Party 7 (USA) (Rev 1).rvz',
    emulator: 'dolphin-emu',
    emulatorCore: null,
    coverArtUrl: '/artwork/ssbm.jpg',
    screenshotUrls: [],
    description: 'Party with Mario and friends! 8 players, 90+ minigames, and classic Mario fun. Your legally obtained ROM.',
    rating: null,
    playCount: 0,
    isActive: true,
    createdAt: '2025-11-10T02:11:35.984Z',
    updatedAt: '2025-11-10T02:11:35.984Z',
    sessions: []
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({
    totalGames: games.length,
    activeSessions: 0,
    onlineUsers: 0,
    uptime: process.uptime()
  });
});

// Get all games
app.get('/api/games', (req, res) => {
  const { page = 1, limit = 20, system, search } = req.query;
  let filteredGames = [...games];

  if (system) {
    filteredGames = filteredGames.filter(g => g.system === system);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredGames = filteredGames.filter(g =>
      g.title.toLowerCase().includes(searchLower) ||
      g.genre?.toLowerCase().includes(searchLower)
    );
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedGames = filteredGames.slice(startIndex, endIndex);

  res.json({
    games: paginatedGames,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredGames.length,
      totalPages: Math.ceil(filteredGames.length / limit)
    }
  });
});

// Get single game
app.get('/api/games/:id', (req, res) => {
  const { id } = req.params;
  const game = games.find(g => g.id === id);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json(game);
});

// Start server
const PORT = process.env.PORT || 3000;
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: 'https://platium.vip',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('WebSocket client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('WebSocket client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log('🚀 Simple Platium Game Streaming Server running on port', PORT);
  console.log('📡 WebSocket server ready');
  console.log('🎮 Ready to stream retro games!');
});
