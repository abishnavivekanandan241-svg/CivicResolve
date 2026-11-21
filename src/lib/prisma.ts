import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// Ensure Prisma engine never throws if DATABASE_URL is not set in production
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TURSO_DATABASE_URL || 'file:./dev.db';
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  // Use Turso libSQL adapter if credentials are provided (Production / Cloud Run)
  if (tursoUrl && (tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('https://'))) {
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  // Fallback to local SQLite via standard engine (Local Development)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
