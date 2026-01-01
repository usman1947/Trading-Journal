/**
 * Migration script to add User model and userId to existing data
 *
 * This script:
 * 1. Creates the User table if it doesn't exist
 * 2. Adds userId column (nullable) to all tables
 * 3. Creates a default user
 * 4. Updates all existing records to belong to that user
 * 5. Makes userId required (via Prisma db push after)
 *
 * Usage:
 *   npx tsx scripts/migrate-add-user.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
// import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Use SQLite for local development (file:./dev.db)
  // if (connectionString.startsWith('file:')) {
  //   const adapter = new PrismaLibSql({ url: connectionString });
  //   return new PrismaClient({ adapter });
  // }

  // Use PostgreSQL for production (handles both postgres:// and postgresql://)
  if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  throw new Error(`Unsupported database URL format: ${connectionString.substring(0, 20)}...`);
}

const prisma = createPrismaClient();

// Configure your default user here
const DEFAULT_USER = {
  email: '',
  password: '',
  name: '',
};

function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `c${timestamp}${randomPart}`;
}

async function main() {
  console.log('Starting migration...\n');

  const dbUrl = process.env.DATABASE_URL || '';
  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
  const isSqlite = dbUrl.startsWith('file:');

  console.log(`Database type: ${isPostgres ? 'PostgreSQL' : isSqlite ? 'SQLite' : 'Unknown'}\n`);

  // Step 1: Create User table if not exists
  console.log('Step 1: Ensuring User table exists...');
  try {
    if (isSqlite) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "passwordHash" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "avatarUrl" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "passwordHash" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "avatarUrl" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    console.log('  User table ready.\n');
  } catch (e) {
    console.log('  User table already exists or created.\n');
  }

  // Step 2: Add userId columns if they don't exist
  console.log('Step 2: Adding userId columns...');
  const tables = ['Account', 'Trade', 'Strategy', 'Tag', 'DailyJournal', 'Settings'];

  for (const table of tables) {
    try {
      if (isPostgres) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "userId" TEXT
        `);
      } else {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${table}" ADD COLUMN "userId" TEXT
        `);
      }
      console.log(`  Added userId to ${table}`);
    } catch (e) {
      console.log(`  ${table} already has userId column`);
    }
  }
  console.log();

  // Step 3: Create default user
  console.log('Step 3: Creating default user...');
  const userId = generateCuid();
  const passwordHash = await bcrypt.hash(DEFAULT_USER.password, 12);

  try {
    if (isSqlite) {
      await prisma.$executeRawUnsafe(`
        INSERT OR IGNORE INTO "User" ("id", "email", "passwordHash", "name", "createdAt", "updatedAt")
        VALUES ('${userId}', '${DEFAULT_USER.email}', '${passwordHash}', '${DEFAULT_USER.name}', datetime('now'), datetime('now'))
      `);
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "User" ("id", "email", "passwordHash", "name", "createdAt", "updatedAt")
        VALUES ('${userId}', '${DEFAULT_USER.email}', '${passwordHash}', '${DEFAULT_USER.name}', NOW(), NOW())
        ON CONFLICT ("email") DO NOTHING
      `);
    }
    console.log(`  Created user: ${DEFAULT_USER.email}`);
    console.log(`  Password: ${DEFAULT_USER.password}`);
    console.log('  (Change this after first login!)\n');
  } catch (e) {
    console.log(`  User ${DEFAULT_USER.email} already exists.\n`);
  }

  // Get the actual user ID (in case user already existed)
  let actualUserId = userId;
  try {
    const users = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT "id" FROM "User" WHERE "email" = '${DEFAULT_USER.email}' LIMIT 1`
    );
    if (users.length > 0) {
      actualUserId = users[0].id;
    }
  } catch (e) {
    console.log('  Could not fetch user ID, using generated one.');
  }

  // Step 4: Update all existing records
  console.log('Step 4: Updating existing records...');

  for (const table of tables) {
    try {
      const result = await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET "userId" = '${actualUserId}' WHERE "userId" IS NULL`
      );
      console.log(`  ${table}: ${result} rows updated`);
    } catch (e) {
      console.log(`  ${table}: error updating - ${e}`);
    }
  }

  console.log('\n========================================');
  console.log('Migration complete!');
  console.log('========================================\n');
  console.log(`All data now belongs to: ${DEFAULT_USER.email}`);
  console.log('\nNext steps:');
  console.log('1. Run: npx prisma db push');
  console.log('   (This will make userId required and add foreign keys)');
  console.log('2. Login with the credentials above');
  console.log('3. Change your password in Settings!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
