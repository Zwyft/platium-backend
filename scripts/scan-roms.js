#!/usr/bin/env node

/**
 * ROM Scanner - Automatically scan /home/jak/projects/roms and add games to database
 * This script scans for ROM files and adds them to the game database
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ROM file extensions mapping
const ROM_EXTENSIONS = {
  '.nes': 'nes',
  '.smc': 'snes',
  '.sfc': 'snes',
  '.md': 'genesis',
  '.gen': 'genesis',
  '.z64': 'n64',
  '.n64': 'n64',
  '.v64': 'n64',
  '.bin': 'psx',
  '.iso': 'gamecube',
  '.gcm': 'gamecube',
  '.ciso': 'gamecube',
  '.rvz': 'gamecube',
  '.wad': 'wii',
  '.dol': 'wii',
  '.elf': 'ps2',
  '.iso': 'ps2',
  '.bin': 'ps2',
  '.cdi': 'dreamcast',
  '.gdi': 'dreamcast',
  '.chd': 'dreamcast'
};

// System names mapping
const SYSTEM_NAMES = {
  'nes': 'Nintendo Entertainment System',
  'snes': 'Super Nintendo',
  'genesis': 'Sega Genesis',
  'n64': 'Nintendo 64',
  'psx': 'PlayStation',
  'gamecube': 'Nintendo GameCube',
  'wii': 'Nintendo Wii',
  'ps2': 'PlayStation 2',
  'dreamcast': 'Sega Dreamcast'
};

// Genre detection from filename
function detectGenre(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('mario') || lower.includes('sonic') || lower.includes('metroid')) return 'Platformer';
  if (lower.includes('street fighter') || lower.includes('mortal kombat') || lower.includes('tekken')) return 'Fighting';
  if (lower.includes('final fantasy') || lower.includes('rpg')) return 'RPG';
  if (lower.includes('zelda') || lower.includes('adventure')) return 'Adventure';
  if (lower.includes('kart') || lower.includes('racing')) return 'Racing';
  if (lower.includes('goldeneye') || lower.includes('shooter')) return 'Shooter';
  return 'Action';
}

// Clean filename to get game title
function getGameTitle(filename) {
  // Remove extension
  let title = path.parse(filename).name;

  // Common cleanup patterns
  title = title.replace(/\(.*?\)/g, ''); // Remove (USA), (Europe), etc.
  title = title.replace(/\[.*?\]/g, ''); // Remove [b1], etc.
  title = title.replace(/_/g, ' '); // Replace underscores with spaces
  title = title.replace(/\./g, ' '); // Replace dots with spaces

  // Title case
  title = title.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return title.trim();
}

// Detect emulator based on system
function getEmulator(system) {
  const emulatorMap = {
    'nes': 'retroarch',
    'snes': 'retroarch',
    'genesis': 'retroarch',
    'n64': 'retroarch',
    'psx': 'retroarch',
    'gamecube': 'dolphin',
    'wii': 'dolphin',
    'ps2': 'pcsx2',
    'dreamcast': 'retroarch'
  };
  return emulatorMap[system] || 'retroarch';
}

// Scan directory recursively
async function scanDirectory(dirPath) {
  const roms = [];

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subRoms = await scanDirectory(fullPath);
        roms.push(...subRoms);
      } else {
        // Check if file is a ROM
        const ext = path.extname(entry.name).toLowerCase();
        if (ROM_EXTENSIONS[ext]) {
          const stats = await fs.promises.stat(fullPath);
          const system = ROM_EXTENSIONS[ext];
          const romPath = fullPath;

          roms.push({
            filename: entry.name,
            path: romPath,
            system,
            size: stats.size,
            title: getGameTitle(entry.name),
            genre: detectGenre(entry.name)
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error.message);
  }

  return roms;
}

// Add ROM to database
async function addRomToDatabase(rom) {
  try {
    // Check if game already exists
    const existing = await prisma.game.findFirst({
      where: {
        OR: [
          { romPath: rom.path },
          { slug: rom.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
        ]
      }
    });

    if (existing) {
      console.log(`⚠️  Skipping (already exists): ${rom.title}`);
      return null;
    }

    // Generate slug
    const slug = rom.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Create game
    const game = await prisma.game.create({
      data: {
        title: rom.title,
        slug: slug,
        system: rom.system,
        year: null, // Could be detected from filename in future
        genre: rom.genre,
        playerCount: 1, // Default, could be detected
        romPath: rom.path,
        emulator: getEmulator(rom.system),
        emulatorCore: null,
        coverArtUrl: null,
        description: `Auto-scanned ROM: ${rom.filename}`,
        isActive: true
      }
    });

    console.log(`✅ Added: ${rom.title} (${rom.system.toUpperCase()})`);
    return game;
  } catch (error) {
    console.error(`❌ Error adding ${rom.title}:`, error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║    ROM Scanner - Auto-Load Games           ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const romsDir = '/home/jak/projects/roms';

  if (!fs.existsSync(romsDir)) {
    console.error(`❌ ROM directory not found: ${romsDir}`);
    process.exit(1);
  }

  console.log(`📁 Scanning directory: ${romsDir}\n`);

  // Scan for ROMs
  const roms = await scanDirectory(romsDir);

  if (roms.length === 0) {
    console.log('⚠️  No ROM files found in the directory.');
    process.exit(0);
  }

  console.log(`🎮 Found ${roms.length} ROM file(s)\n`);
  console.log('📊 System breakdown:');
  const systemCounts = {};
  roms.forEach(rom => {
    systemCounts[rom.system] = (systemCounts[rom.system] || 0) + 1;
  });
  Object.entries(systemCounts).forEach(([system, count]) => {
    console.log(`   ${system.toUpperCase()}: ${count} game(s)`);
  });
  console.log('');

  // Add to database
  console.log('💾 Adding games to database...\n');
  let added = 0;
  let skipped = 0;

  for (const rom of roms) {
    const result = await addRomToDatabase(rom);
    if (result) {
      added++;
    } else {
      skipped++;
    }
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║              Scan Complete!                ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log(`✅ Added: ${added} game(s)`);
  console.log(`⚠️  Skipped: ${skipped} game(s)`);
  console.log(`📊 Total processed: ${roms.length} game(s)\n`);

  await prisma.$disconnect();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
