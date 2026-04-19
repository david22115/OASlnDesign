import { PrismaClient } from './generated/client';

export * from './generated/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * 全域唯一的 PrismaClient 實例 (Singleton)。
 * 
 * 在開發環境下 (尤其是配合 Next.js HMR 或 ts-node-dev 時)，
 * 避免因模組重複載入導致建立過多資料庫連線 (Too many connections)。
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 開發環境下自動紀錄 query 執行狀況，以利 Code Review 與效能優化
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
