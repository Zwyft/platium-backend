-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('starting', 'active', 'ending', 'ended', 'error');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('single', 'multiplayer', 'spectate');

-- CreateEnum
CREATE TYPE "VideoQuality" AS ENUM ('720p', '1080p', '1440p');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('player', 'spectator', 'moderator');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('chat', 'system', 'game_event');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('not_played', 'playing', 'completed', 'favorite');

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "platium_user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "preferred_emulator" TEXT DEFAULT 'retroarch',
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "year" INTEGER,
    "genre" TEXT,
    "player_count" INTEGER NOT NULL DEFAULT 1,
    "rom_path" TEXT NOT NULL,
    "emulator" TEXT NOT NULL,
    "emulator_core" TEXT,
    "cover_art_url" TEXT,
    "screenshot_urls" TEXT[],
    "description" TEXT,
    "rating" DECIMAL(3,2),
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "session_code" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'starting',
    "sessionType" "SessionType" NOT NULL DEFAULT 'single',
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "max_players" INTEGER NOT NULL DEFAULT 1,
    "current_players" INTEGER NOT NULL DEFAULT 0,
    "spectator_count" INTEGER NOT NULL DEFAULT 0,
    "container_id" TEXT,
    "container_ip" TEXT,
    "container_port" INTEGER,
    "videoQuality" "VideoQuality" NOT NULL DEFAULT '1080p',
    "fps" INTEGER NOT NULL DEFAULT 60,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_minutes" INTEGER,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_participants" (
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'player',
    "is_host" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "total_duration_minutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "session_participants_pkey" PRIMARY KEY ("session_id","user_id")
);

-- CreateTable
CREATE TABLE "session_chat" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'chat',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_game_library" (
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'not_played',
    "play_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "last_played_at" TIMESTAMP(3),
    "rating" INTEGER,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_game_library_pkey" PRIMARY KEY ("user_id","game_id")
);

-- CreateTable
CREATE TABLE "session_history" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_players" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "session_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_platium_user_id_key" ON "user_profiles"("platium_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_username_key" ON "user_profiles"("username");

-- CreateIndex
CREATE INDEX "user_profiles_username_idx" ON "user_profiles"("username");

-- CreateIndex
CREATE INDEX "user_profiles_is_online_idx" ON "user_profiles"("is_online");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE INDEX "games_title_idx" ON "games"("title");

-- CreateIndex
CREATE INDEX "games_system_idx" ON "games"("system");

-- CreateIndex
CREATE INDEX "games_is_active_idx" ON "games"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_session_code_key" ON "game_sessions"("session_code");

-- CreateIndex
CREATE INDEX "game_sessions_status_idx" ON "game_sessions"("status");

-- CreateIndex
CREATE INDEX "game_sessions_started_at_idx" ON "game_sessions"("started_at");

-- CreateIndex
CREATE INDEX "session_participants_user_id_idx" ON "session_participants"("user_id");

-- CreateIndex
CREATE INDEX "session_chat_session_id_created_at_idx" ON "session_chat"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "session_chat_user_id_idx" ON "session_chat"("user_id");

-- CreateIndex
CREATE INDEX "user_game_library_user_id_idx" ON "user_game_library"("user_id");

-- CreateIndex
CREATE INDEX "session_history_user_id_ended_at_idx" ON "session_history"("user_id", "ended_at");

-- CreateIndex
CREATE INDEX "session_history_game_id_ended_at_idx" ON "session_history"("game_id", "ended_at");

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_chat" ADD CONSTRAINT "session_chat_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_chat" ADD CONSTRAINT "session_chat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_game_library" ADD CONSTRAINT "user_game_library_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_game_library" ADD CONSTRAINT "user_game_library_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_history" ADD CONSTRAINT "session_history_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_history" ADD CONSTRAINT "session_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_history" ADD CONSTRAINT "session_history_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
