import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { prisma } from '@repo/database';
import { redis } from './services/redis';
import { gracefulShutdownQueues } from './services/queue';

// Routes
import authRoutes from './routes/auth.routes';
import dynamicAdminRoutes from './routes/dynamic_admin.routes';

const app = express();
const port = process.env.PORT || 3001;

// ========================================================
// 基礎中介軟體配置 (Middleware)
// ========================================================
app.use(cors({
  credentials: true, // 必須開啟以允許跨域帶下 Cookie
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());
app.use(cookieParser());

// ========================================================
// 路由控制器 (Controllers)
// ========================================================
app.use('/api/auth', authRoutes);
app.use('/api/admin/dynamic', dynamicAdminRoutes);

/**
 * 系統核心健康檢查端點 (Health Check)
 * 提供 DevOps 系統 (如 K8s Liveness Probe) 判定容器是否存活，
 * 同時檢驗 Database 與 Redis 連線狀態以防止系統假性存活。
 */
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: 'OK', services: { db: 'up', redis: 'up' } });
  } catch (err: any) {
    console.error('[HealthCheck] Failed:', err);
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

// ========================================================
// 伺服器啟動與生命週期管理 (Lifecycle Hooks)
// ========================================================
const server = app.listen(port, () => {
    console.log(`[API Gateway] Server listening at http://localhost:${port}`);
});

/**
 * 優雅關機機制 (Graceful Shutdown)
 * 攔截系統中斷事件，在釋放資源、排空 Queue 後再中斷 Node Process，
 * 符合 12-Factor App 設計準則。
 */
const shutdownHandler = async () => {
  console.log('\n[System] SIGINT/SIGTERM received. Triggering graceful shutdown...');
  server.close(async () => {
    try {
      await gracefulShutdownQueues();
      await prisma.$disconnect();
      await redis.quit();
      console.log('[System] All resources released. Exiting gracefully.');
      process.exit(0);
    } catch (err) {
      console.error('[System] Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', shutdownHandler);
process.on('SIGTERM', shutdownHandler);
