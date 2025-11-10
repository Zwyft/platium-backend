/**
 * Seed database with sample games
 * Run: node scripts/seed.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

const sampleGames = [
  // NES Games
  {
    title: 'Super Mario Bros.',
    slug: 'super-mario-bros',
    system: 'nes',
    year: 1985,
    genre: 'Platformer',
    playerCount: 2,
    romPath: '/games/nes/super-mario-bros.nes',
    emulator: 'retroarch',
    emulatorCore: 'fceumm',
    description: 'The classic platformer that saved Nintendo. Jump across worlds to rescue Princess Peach!',
    coverArtUrl: '/artwork/super-mario-bros.jpg'
  },
  {
    title: 'The Legend of Zelda',
    slug: 'the-legend-of-zelda',
    system: 'nes',
    year: 1986,
    genre: 'Adventure',
    playerCount: 1,
    romPath: '/games/nes/zelda.nes',
    emulator: 'retroarch',
    emulatorCore: 'fceumm',
    description: 'Explore dungeons, defeat enemies, and find the Triforce in this iconic adventure.',
    coverArtUrl: '/artwork/zelda.jpg'
  },
  {
    title: 'Metroid',
    slug: 'metroid',
    system: 'nes',
    year: 1986,
    genre: 'Action',
    playerCount: 1,
    romPath: '/games/nes/metroid.nes',
    emulator: 'retroarch',
    emulatorCore: 'fceumm',
    description: 'Side-scrolling action-adventure in the spirit of Alien and Indiana Jones.',
    coverArtUrl: '/artwork/metroid.jpg'
  },
  {
    title: 'Mega Man 2',
    slug: 'mega-man-2',
    system: 'nes',
    year: 1988,
    genre: 'Platformer',
    playerCount: 1,
    romPath: '/games/nes/mega-man-2.nes',
    emulator: 'retroarch',
    emulatorCore: 'fceumm',
    description: 'The best Mega Man game. Battle Robot Masters and save the world!',
    coverArtUrl: '/artwork/mega-man-2.jpg'
  },
  {
    title: 'Contra',
    slug: 'contra',
    system: 'nes',
    year: 1987,
    genre: 'Action',
    playerCount: 2,
    romPath: '/games/nes/contra.nes',
    emulator: 'retroarch',
    emulatorCore: 'fceumm',
    description: 'Run and gun action. Use the Konami code for 30 lives!',
    coverArtUrl: '/artwork/contra.jpg'
  },

  // SNES Games
  {
    title: 'Super Mario World',
    slug: 'super-mario-world',
    system: 'snes',
    year: 1990,
    genre: 'Platformer',
    playerCount: 2,
    romPath: '/games/snes/super-mario-world.smc',
    emulator: 'retroarch',
    emulatorCore: 'snes9x',
    description: 'Mario\'s SNES debut with Yoshi. Explore Dinosaur Land!',
    coverArtUrl: '/artwork/smw.jpg'
  },
  {
    title: 'The Legend of Zelda: A Link to the Past',
    slug: 'zelda-alttp',
    system: 'snes',
    year: 1991,
    genre: 'Adventure',
    playerCount: 1,
    romPath: '/games/snes/zelda-alttp.smc',
    emulator: 'retroarch',
    emulatorCore: 'snes9x',
    description: 'One of the greatest games ever made. Save Hyrule from Ganon!',
    coverArtUrl: '/artwork/alttp.jpg'
  },
  {
    title: 'Super Metroid',
    slug: 'super-metroid',
    system: 'snes',
    year: 1994,
    genre: 'Action',
    playerCount: 1,
    romPath: '/games/snes/super-metroid.smc',
    emulator: 'retroarch',
    emulatorCore: 'snes9x',
    description: 'Perfect game design. Explore planet Zebes in this masterpiece.',
    coverArtUrl: '/artwork/super-metroid.jpg'
  },
  {
    title: 'Street Fighter II',
    slug: 'street-fighter-ii',
    system: 'snes',
    year: 1992,
    genre: 'Fighting',
    playerCount: 2,
    romPath: '/games/snes/sf2.zip',
    emulator: 'retroarch',
    emulatorCore: 'snes9x',
    description: 'The fighting game that started it all. Hadoken!',
    coverArtUrl: '/artwork/sf2.jpg'
  },
  {
    title: 'Super Mario Kart',
    slug: 'super-mario-kart',
    system: 'snes',
    year: 1992,
    genre: 'Racing',
    playerCount: 2,
    romPath: '/games/snes/mario-kart.smc',
    emulator: 'retroarch',
    emulatorCore: 'snes9x',
    description: 'Race with Mario and friends! Battle Mode is the best.',
    coverArtUrl: '/artwork/mario-kart.jpg'
  },

  // Genesis Games
  {
    title: 'Sonic the Hedgehog',
    slug: 'sonic-the-hedgehog',
    system: 'genesis',
    year: 1991,
    genre: 'Platformer',
    playerCount: 1,
    romPath: '/games/genesis/sonic.bin',
    emulator: 'retroarch',
    emulatorCore: 'genesis_plus_gx',
    description: 'Speed through Green Hill Zone at breakneck pace!',
    coverArtUrl: '/artwork/sonic.jpg'
  },
  {
    title: 'Street Fighter II: Championship Edition',
    slug: 'sf2-championship-edition',
    system: 'genesis',
    year: 1992,
    genre: 'Fighting',
    playerCount: 2,
    romPath: '/games/genesis/sf2ce.bin',
    emulator: 'retroarch',
    emulatorCore: 'genesis_plus_gx',
    description: 'Fight against all 8 World Warriors!',
    coverArtUrl: '/artwork/sf2ce.jpg'
  },
  {
    title: 'Mortal Kombat',
    slug: 'mortal-kombat',
    system: 'genesis',
    year: 1992,
    genre: 'Fighting',
    playerCount: 2,
    romPath: '/games/genesis/mk.bin',
    emulator: 'retroarch',
    emulatorCore: 'genesis_plus_gx',
    description: 'Finish Him! The controversial fighting game phenomenon.',
    coverArtUrl: '/artwork/mk.jpg'
  },

  // Nintendo 64 Games
  {
    title: 'Super Mario 64',
    slug: 'super-mario-64',
    system: 'n64',
    year: 1996,
    genre: 'Platformer',
    playerCount: 1,
    romPath: '/games/n64/sm64.z64',
    emulator: 'retroarch',
    emulatorCore: 'mupen64plus',
    description: 'Mario\'s first 3D adventure. Collect 120 stars!',
    coverArtUrl: '/artwork/sm64.jpg'
  },
  {
    title: 'The Legend of Zelda: Ocarina of Time',
    slug: 'oot',
    system: 'n64',
    year: 1998,
    genre: 'Adventure',
    playerCount: 1,
    romPath: '/games/n64/oot.z64',
    emulator: 'retroarch',
    emulatorCore: 'mupen64plus',
    description: 'Epic Zelda adventure through time. Epona\'s Song!',
    coverArtUrl: '/artwork/oot.jpg'
  },
  {
    title: 'GoldenEye 007',
    slug: 'goldeneye-007',
    system: 'n64',
    year: 1997,
    genre: 'Shooter',
    playerCount: 4,
    romPath: '/games/n64/goldeneye.z64',
    emulator: 'retroarch',
    emulatorCore: 'mupen64plus',
    description: 'Perfect Dark, eh? Classic multiplayer shooter.',
    coverArtUrl: '/artwork/goldeneye.jpg'
  },
  {
    title: 'Super Smash Bros.',
    slug: 'smash-64',
    system: 'n64',
    year: 1999,
    genre: 'Fighting',
    playerCount: 4,
    romPath: '/games/n64/smash.z64',
    emulator: 'retroarch',
    emulatorCore: 'mupen64plus',
    description: 'All Nintendo heroes in one place. Nintendo fighting!',
    coverArtUrl: '/artwork/smash64.jpg'
  },

  // GameCube Games
  {
    title: 'Super Smash Bros. Melee',
    slug: 'ssbm',
    system: 'gamecube',
    year: 2001,
    genre: 'Fighting',
    playerCount: 4,
    romPath: '/home/jak/projects/roms/gamecube/Mario Party 7 (USA) (Rev 1).rvz',
    emulator: 'dolphin-emu',
    description: 'The ultimate Nintendo fighter. Fox Only, Final Destination!',
    coverArtUrl: '/artwork/ssbm.jpg'
  },
  {
    title: 'The Legend of Zelda: The Wind Waker',
    slug: 'wind-waker',
    system: 'gamecube',
    year: 2002,
    genre: 'Adventure',
    playerCount: 1,
    romPath: '/games/gamecube/wind-waker.iso',
    emulator: 'dolphin-emu',
    description: 'Sail the Great Sea in this cel-shaded Zelda adventure.',
    coverArtUrl: '/artwork/wind-waker.jpg'
  },
  {
    title: 'Mario Kart: Double Dash!!',
    slug: 'mario-kart-dd',
    system: 'gamecube',
    year: 2003,
    genre: 'Racing',
    playerCount: 4,
    romPath: '/games/gamecube/mkdd.iso',
    emulator: 'dolphin-emu',
    description: 'Two characters per kart. Unique items and characters!',
    coverArtUrl: '/artwork/mkdd.jpg'
  },

  // PlayStation Games
  {
    title: 'Final Fantasy VII',
    slug: 'ff7',
    system: 'psx',
    year: 1997,
    genre: 'RPG',
    playerCount: 1,
    romPath: '/games/psx/ff7.bin',
    emulator: 'retroarch',
    emulatorCore: 'pcsx_rearmed',
    description: 'Cloud and Sephiroth\'s epic journey. Materia system!',
    coverArtUrl: '/artwork/ff7.jpg'
  },
  {
    title: 'Metal Gear Solid',
    slug: 'mgs',
    system: 'psx',
    year: 1998,
    genre: 'Stealth',
    playerCount: 1,
    romPath: '/games/psx/mgs.bin',
    emulator: 'retroarch',
    emulatorCore: 'pcsx_rearmed',
    description: 'Snake infiltrates Shadow Moses Island. Tatics!',
    coverArtUrl: '/artwork/mgs.jpg'
  },
  {
    title: 'Tekken 3',
    slug: 'tekken-3',
    system: 'psx',
    year: 1997,
    genre: 'Fighting',
    playerCount: 2,
    romPath: '/games/psx/tekken3.bin',
    emulator: 'retroarch',
    emulatorCore: 'pcsx_rearmed',
    description: '3D fighting at its best. King of Iron Fist Tournament!',
    coverArtUrl: '/artwork/tekken3.jpg'
  }
];

async function main() {
  console.log('🌱 Seeding database with sample games...');

  try {
    // Check if games already exist
    const existingCount = await prisma.game.count();
    if (existingCount > 0) {
      console.log(`ℹ️  Database already has ${existingCount} games. Skipping seed.`);
      return;
    }

    // Create games
    for (const game of sampleGames) {
      await prisma.game.create({
        data: game
      });
      console.log(`✅ Added: ${game.title} (${game.system.toUpperCase()})`);
    }

    console.log(`\n🎉 Successfully seeded ${sampleGames.length} games!`);
    console.log('\nNext steps:');
    console.log('1. Copy ROMs to /home/jak/projects/games/');
    console.log('2. Update romPath in database if needed');
    console.log('3. Start the server: npm start');
    console.log('4. Visit https://platium.vip/games');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
