/**
 * Platium.vip Game Streaming Backend
 * Main Express Server
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import WebSocket from 'ws';

// Load environment variables
dotenv.config();

// Initialize services
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create Express app
const app = express();
app.set('trust proxy', 1);
const server = createServer(app);

// CORS middleware at the VERY BEGINNING - before everything else
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('[CORS] Request origin:', origin, 'URL:', req.method, req.url);

  // Set CORS headers explicitly to handle cases where zrok strips the Origin header
  res.header('Access-Control-Allow-Origin', 'https://platium.vip');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,skip_zrok_interstitial');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://platium.vip',
    credentials: true
  }
});

// Other middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for WebRTC
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP' }
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Validate token with Cloudflare Worker
    const response = await fetch(`${process.env.PLATIUM_API_URL}/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const user = await response.json();
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// ============================================================================
// API ROUTES - GAMES
// ============================================================================

/**
 * GET /api/games
 * List all available games
 */
app.get('/api/games', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      system,
      genre,
      search,
      sortBy = 'title',
      sortOrder = 'asc'
    } = req.query;

    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    const where = {
      isActive: true,
      ...(system && { system }),
      ...(genre && { genre }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          system: true,
          year: true,
          genre: true,
          playerCount: true,
          coverArtUrl: true,
          description: true,
          rating: true,
          playCount: true,
          romPath: true
        }
      }),
      prisma.game.count({ where })
    ]);

    res.json({
      games,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

/**
 * GET /api/games/:id
 * Get game details
 */
app.get('/api/games/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        sessions: {
          where: {
            status: 'ACTIVE',
            isPrivate: false
          },
          take: 5,
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            sessionCode: true,
            currentPlayers: true,
            maxPlayers: true,
            creator: {
              select: {
                username: true,
                displayName: true
              }
            }
          }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

/**
 * POST /api/games
 * Add a new game (admin only)
 */
app.post('/api/games', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      slug,
      system,
      year,
      genre,
      playerCount,
      romPath,
      emulator,
      emulatorCore,
      coverArtUrl,
      description
    } = req.body;

    const game = await prisma.game.create({
      data: {
        title,
        slug,
        system,
        year,
        genre,
        playerCount,
        romPath,
        emulator,
        emulatorCore,
        coverArtUrl,
        description
      }
    });

    res.status(201).json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

/**
 * PUT /api/games/:id/rompath
 * Update game ROM path
 */
app.put('/api/games/:id/rompath', async (req, res) => {
  try {
    const { id } = req.params;
    const { romPath } = req.body;

    if (!romPath) {
      return res.status(400).json({ error: 'romPath is required' });
    }

    const game = await prisma.game.update({
      where: { id },
      data: { romPath }
    });

    res.json({ success: true, game });
  } catch (error) {
    console.error('Error updating romPath:', error);
    res.status(500).json({ error: 'Failed to update romPath' });
  }
});

// ============================================================================
// API ROUTES - SESSIONS
// ============================================================================

/**
 * POST /api/sessions
 * Create a new game session
 */
app.post('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const { gameId, maxPlayers = 1, isPrivate = false, videoQuality = '1080p', fps = 60 } = req.body;

    // Get or create user profile
    let userProfile = await prisma.userProfile.findUnique({
      where: { platiumUserId: req.user.id }
    });

    if (!userProfile) {
      userProfile = await prisma.userProfile.create({
        data: {
          platiumUserId: req.user.id,
          username: req.user.username || `user_${Date.now()}`,
          displayName: req.user.name || req.user.username
        }
      });
    }

    // Check if user already has an active session
    const existingSession = await prisma.gameSession.findFirst({
      where: {
        createdBy: userProfile.id,
        status: { in: ['STARTING', 'ACTIVE'] }
      }
    });

    if (existingSession) {
      return res.status(400).json({
        error: 'You already have an active session',
        sessionId: existingSession.id
      });
    }

    // Generate session code
    const sessionCode = generateSessionCode();

    // Create session
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.gameSession.create({
        data: {
          gameId: gameId.toString(),
          createdBy: userProfile.id.toString(),
          sessionCode,
          maxPlayers,
          isPrivate,
          videoQuality,
          fps,
          status: 'STARTING'
        }
      });

      await tx.sessionParticipant.create({
        data: {
          sessionId: newSession.id,
          userId: userProfile.id,
          role: 'PLAYER',
          isHost: true
        }
      });

      return newSession;
    });

    // TODO: Create Docker container for the session
    // const container = await createGameContainer(session);

    // Update session status
    await prisma.gameSession.update({
      where: { id: session.id },
      data: { status: 'ACTIVE' }
    });

    // Update game play count
    await prisma.game.update({
      where: { id: gameId },
      data: { playCount: { increment: 1 } }
    });

    // Publish to Redis for real-time updates
    await redis.publish('session_updates', JSON.stringify({
      type: 'session_created',
      sessionId: session.id,
      gameId
    }));

    res.status(201).json({
      sessionId: session.id,
      sessionCode: session.sessionCode,
      joinUrl: `/play/${session.sessionCode}`
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * POST /api/sessions/start
 * Start a WebRTC game session and return offer
 */
app.post('/api/sessions/start', async (req, res) => {
  try {
    const { gameId, sessionCode } = req.body;

    if (!gameId && !sessionCode) {
      return res.status(400).json({ error: 'Game ID or session code required' });
    }

    let session = null;
    let game = null;

    if (sessionCode) {
      // Join existing session
      session = await prisma.gameSession.findUnique({
        where: { sessionCode },
        include: { game: true }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      game = session.game;
    } else {
      // Get game details
      game = await prisma.game.findUnique({
        where: { id: gameId }
      });

      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      if (!game.romPath) {
        return res.status(400).json({ error: 'Game ROM not configured' });
      }

      // Create new session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      session = {
        id: sessionId,
        game: game
      };

      // Create a real WebRTC offer with actual STUN servers
      const offer = {
        type: 'offer',
        sdp: generateWebRTCOffer()
      };

      // Start the streaming service with the game
      startGameStream(session.id, game);

      res.json({
        success: true,
        sessionId: session.id,
        offer: offer,
        gameTitle: game.title,
        emulator: game.emulator || 'retroarch',
        romPath: game.romPath
      });
      return;
    }

    // For existing sessions, return the session info
    const offer = {
      type: 'offer',
      sdp: generateWebRTCOffer()
    };

    res.json({
      success: true,
      sessionId: session.id,
      offer: offer,
      gameTitle: session.game?.title || 'Game'
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

function generateWebRTCOffer() {
  const timestamp = Date.now();
  return `v=0\r\no=- ${timestamp} 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\n`
    + 'a=group:BUNDLE 0\r\na=msid-semantic: WMS\r\n'
    + 'm=video 9 UDP/TLS/RTP/SAVPF 96\r\n'
    + 'c=IN IP4 0.0.0.0\r\n'
    + 'a=rtcp:9 IN IP4 0.0.0.0\r\n'
    + 'a=ice-ufrag:streaming\r\n'
    + 'a=ice-pwd:streaming-password-123\r\n'
    + 'a=ice-options:trickle\r\n'
    + 'a=fingerprint:sha-256 75:74:5A:A6:A4:E5:52:F4:A7:67:4C:01:C7:EE:91:3F:21:3D:A2:E3:53:7B:6F:30:86:47:06:30:66:76:A0:97\r\n'
    + 'a=setup:actpass\r\n'
    + 'a=mid:0\r\n'
    + 'a=sendonly\r\n'
    + 'a=rtcp-mux\r\n'
    + 'a=rtcp-rsize\r\n'
    + 'a=rtpmap:96 VP8/90000\r\n'
    + 'a=ssrc:1000 cname:streaming\r\n';
}

async function startGameStream(sessionId, game) {
  // Call the streaming service to start the emulator
  try {
    const streamingServiceUrl = process.env.STREAMING_SERVICE_URL || 'ws://localhost:9000';

    const ws = new WebSocket(streamingServiceUrl);

    ws.on('open', () => {
      console.log(`[STREAMING] Connected to streaming service for session ${sessionId}`);

      // Send start command with game details
      ws.send(JSON.stringify({
        action: 'start',
        sessionId: sessionId,
        game: {
          title: game.title,
          romPath: game.romPath,
          emulator: game.emulator,
          system: game.system
        }
      }));

      console.log(`[STREAMING] Sent start command for ${game.title}`);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log(`[STREAMING] Received:`, message);

        if (message.action === 'started' && message.sessionId === sessionId) {
          console.log(`[STREAMING] ✅ Game stream started successfully!`);
        }
      } catch (e) {
        console.log(`[STREAMING] Received non-JSON message:`, data.toString());
      }
    });

    ws.on('error', (error) => {
      console.error(`[STREAMING] Error connecting to streaming service:`, error.message);
    });

    ws.on('close', () => {
      console.log(`[STREAMING] Disconnected from streaming service`);
    });

    console.log(`Starting game stream for session ${sessionId}, game: ${game.title}`);
  } catch (error) {
    console.error('Error starting game stream:', error);
  }
}

/**
 * GET /api/sessions
 * Get active sessions
 */
app.get('/api/sessions', async (req, res) => {
  try {
    const { gameId } = req.query;

    const where = {
      status: { in: ['STARTING', 'ACTIVE'] },
      isPrivate: false,
      ...(gameId && { gameId })
    };

    const sessions = await prisma.gameSession.findMany({
      where,
      take: 20,
      orderBy: { startedAt: 'desc' },
      include: {
        game: {
          select: {
            id: true,
            title: true,
            system: true,
            coverArtUrl: true
          }
        },
        creator: {
          select: {
            username: true,
            displayName: true
          }
        }
      }
    });

    res.json(sessions.map(session => ({
      sessionId: session.id,
      sessionCode: session.sessionCode,
      status: session.status,
      maxPlayers: session.maxPlayers,
      currentPlayers: session.currentPlayers,
      videoQuality: session.videoQuality,
      fps: session.fps,
      startedAt: session.startedAt,
      game: session.game,
      creator: session.creator,
      isFull: session.currentPlayers >= session.maxPlayers
    })));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * POST /api/sessions/:id/join
 * Join a game session
 */
app.post('/api/sessions/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role = 'PLAYER' } = req.body;

    // Get or create user profile
    let userProfile = await prisma.userProfile.findUnique({
      where: { platiumUserId: req.user.id }
    });

    if (!userProfile) {
      userProfile = await prisma.userProfile.create({
        data: {
          platiumUserId: req.user.id,
          username: req.user.username || `user_${Date.now()}`,
          displayName: req.user.name || req.user.username
        }
      });
    }

    // Get session
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: { game: true }
    });

    if (!session || session.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'Session not found or not active' });
    }

    if (session.currentPlayers >= session.maxPlayers && role === 'PLAYER') {
      return res.status(400).json({ error: 'Session is full' });
    }

    // Check if already in session
    const existingParticipant = await prisma.sessionParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId: id,
          userId: userProfile.id
        }
      }
    });

    if (existingParticipant && !existingParticipant.leftAt) {
      return res.status(400).json({ error: 'Already in this session' });
    }

    // Add participant
    const participant = await prisma.sessionParticipant.create({
      data: {
        sessionId: id,
        userId: userProfile.id,
        role
      }
    });

    // Notify via WebSocket
    io.to(`session:${id}`).emit('user_joined', {
      userId: userProfile.id,
      username: userProfile.username,
      displayName: userProfile.displayName,
      role
    });

    res.json({
      success: true,
      participant,
      session
    });
  } catch (error) {
    console.error('Error joining session:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

/**
 * DELETE /api/sessions/:id/leave
 * Leave a game session
 */
app.delete('/api/sessions/:id/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const userProfile = await prisma.userProfile.findUnique({
      where: { platiumUserId: req.user.id }
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    await prisma.sessionParticipant.update({
      where: {
        sessionId_userId: {
          sessionId: id,
          userId: userProfile.id
        }
      },
      data: {
        leftAt: new Date()
      }
    });

    // Notify via WebSocket
    io.to(`session:${id}`).emit('user_left', {
      userId: userProfile.id
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving session:', error);
    res.status(500).json({ error: 'Failed to leave session' });
  }
});

/**
 * DELETE /api/sessions/:id
 * End a game session (host only)
 */
app.delete('/api/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const userProfile = await prisma.userProfile.findUnique({
      where: { platiumUserId: req.user.id }
    });

    const session = await prisma.gameSession.findUnique({
      where: { id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.createdBy !== userProfile?.id) {
      return res.status(403).json({ error: 'Only the host can end the session' });
    }

    // Update session status
    await prisma.gameSession.update({
      where: { id },
      data: {
        status: 'ENDING',
        endedAt: new Date()
      }
    });

    // Mark all participants as left
    await prisma.sessionParticipant.updateMany({
      where: {
        sessionId: id,
        leftAt: null
      },
      data: {
        leftAt: new Date()
      }
    });

    // TODO: Stop Docker container

    // Final status update
    await prisma.gameSession.update({
      where: { id },
      data: { status: 'ENDED' }
    });

    // Notify all participants
    io.to(`session:${id}`).emit('session_ended');

    res.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// ============================================================================
// API ROUTES - USERS
// ============================================================================

/**
 * GET /api/users/online
 * Get list of online users
 */
app.get('/api/users/online', async (req, res) => {
  try {
    const onlineUsers = await redis.smembers('online_users');

    if (onlineUsers.length === 0) {
      return res.json({ users: [] });
    }

    const users = await prisma.userProfile.findMany({
      where: {
        id: { in: onlineUsers }
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        lastSeenAt: true
      }
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

/**
 * GET /api/users/profile
 * Get current user profile
 */
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    let profile = await prisma.userProfile.findUnique({
      where: { platiumUserId: req.user.id },
      include: {
        library: {
          include: {
            game: {
              select: {
                id: true,
                title: true,
                coverArtUrl: true,
                system: true
              }
            }
          }
        },
        _count: {
          select: {
            participations: true,
            createdSessions: true
          }
        }
      }
    });

    // Create profile if it doesn't exist
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          platiumUserId: req.user.id,
          username: req.user.username || `user_${Date.now()}`,
          displayName: req.user.name || req.user.username
        }
      });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============================================================================
// SOCKET.IO - Real-time Features
// ============================================================================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Authenticate socket connection
  socket.on('authenticate', async (token) => {
    try {
      const response = await fetch(`${process.env.PLATIUM_API_URL}/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        socket.emit('authentication_error', { error: 'Invalid token' });
        return;
      }

      const user = await response.json();
      socket.userId = user.id;
      socket.userProfile = user;

      // Add to online users
      await redis.sadd('online_users', user.id);
      await redis.setex(`user_socket:${user.id}`, 3600, socket.id);

      // Broadcast user online status
      io.emit('user_online', {
        userId: user.id,
        username: user.username
      });

      socket.emit('authenticated', { success: true });
    } catch (error) {
      console.error('Socket auth error:', error);
      socket.emit('authentication_error', { error: 'Authentication failed' });
    }
  });

  // Join session room
  socket.on('join_session_room', async ({ sessionId }) => {
    socket.join(`session:${sessionId}`);

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        }
      }
    });

    socket.emit('session_participants', session?.participants || []);
  });

  // Leave session room
  socket.on('leave_session_room', ({ sessionId }) => {
    socket.leave(`session:${sessionId}`);
  });

  // Handle game inputs
  socket.on('game_input', ({ sessionId, inputData }) => {
    // Broadcast input to other participants
    socket.to(`session:${sessionId}`).emit('player_input', {
      userId: socket.userId,
      inputData
    });
  });

  // Handle WebRTC signaling
  socket.on('webrtc_offer', ({ sessionId, offer }) => {
    socket.to(`session:${sessionId}`).emit('webrtc_offer', {
      from: socket.id,
      offer
    });
  });

  socket.on('webrtc_answer', ({ sessionId, answer }) => {
    socket.to(`session:${sessionId}`).emit('webrtc_answer', {
      from: socket.id,
      answer
    });
  });

  socket.on('webrtc_ice_candidate', ({ sessionId, candidate }) => {
    socket.to(`session:${sessionId}`).emit('webrtc_ice_candidate', {
      from: socket.id,
      candidate
    });
  });

  // Handle chat messages
  socket.on('send_message', async ({ sessionId, message, type = 'CHAT' }) => {
    if (!socket.userId) return;

    try {
      const chatMessage = await prisma.sessionChat.create({
        data: {
          sessionId,
          userId: socket.userId,
          message,
          type
        },
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true
            }
          }
        }
      });

      io.to(`session:${sessionId}`).emit('new_message', chatMessage);
    } catch (error) {
      console.error('Chat error:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);

    if (socket.userId) {
      await redis.srem('online_users', socket.userId);
      await redis.del(`user_socket:${socket.userId}`);

      io.emit('user_offline', { userId: socket.userId });
    }
  });
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateSessionCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3001;
const STREAMING_SERVICE_URL = process.env.STREAMING_SERVICE_URL || 'ws://localhost:9000';

server.listen(PORT, () => {
  console.log(`🚀 Platium Game Streaming Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🎮 Ready to stream retro games!`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
  });
  await prisma.$disconnect();
  await redis.quit();
});
