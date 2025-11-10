# Platium Backend - Simple Version

Simple game streaming backend without database dependencies.

## Features

- In-memory game storage (no database required)
- Express.js REST API
- Socket.io WebSocket support
- CORS enabled
- Mario Party 7 pre-loaded

## Quick Deploy to Render

[![Deploy to Render](https://render.com/deploy?repo=https://github.com/your-username/platium-backend-simple)](https://render.com/deploy?repo=https://github.com/your-username/platium-backend-simple)

## Local Development

```bash
npm install
npm start
```

The server will start on port 3001 by default.

## API Endpoints

- `GET /health` - Health check
- `GET /api/stats` - System statistics
- `GET /api/games` - Get all games (supports pagination, system filter, search)
- `GET /api/games/:id` - Get single game

## Environment Variables

- `PORT` - Server port (default: 3000)

## Why This Version?

This is a simplified version without Prisma/PostgreSQL to avoid compatibility issues with platforms that use Alpine Linux (musl libc) like Render.com. The original Prisma-based backend requires glibc which isn't available on Alpine.
