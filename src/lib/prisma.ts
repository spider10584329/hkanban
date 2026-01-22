import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Only create a new client if one doesn't exist in the global scope
// This prevents connection pool exhaustion during hot reloads
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Add datasource configuration for connection management
  });
}

export const prisma = globalForPrisma.prisma;

// Only register shutdown handlers in production to avoid issues with hot reload
if (process.env.NODE_ENV === 'production' && typeof process !== 'undefined') {
  const shutdownPrisma = async (signal: string) => {
    try {
      console.log(`Prisma: disconnecting due to ${signal}`);
      await prisma.$disconnect();
    } catch (err) {
      console.error('Prisma disconnect error:', err);
    }
  };

  process.once('SIGINT', () => {
    void shutdownPrisma('SIGINT').then(() => process.exit(0));
  });

  process.once('SIGTERM', () => {
    void shutdownPrisma('SIGTERM').then(() => process.exit(0));
  });
}
