import { Queue } from 'bullmq';
import { redis } from './redis';

/**
 * ========================================================
 * 核心任務佇列定義 (BullMQ Queues) - 僅作為生產者 (Producer)
 * ========================================================
 * 設計規範：使用相同的 Redis 連線以減少資源消耗。
 * 注意：此微服務不自行啟動 Worker 節點，實現發布端與消費端的解耦。
 */
export const BpmTaskQueue = new Queue('BpmTaskSync', { connection: redis });
export const NotificationQueue = new Queue('NotificationQueue', { connection: redis });
export const AuditEventsQueue = new Queue('AuditEvents', { connection: redis });

/**
 * 安全且優雅地關閉 Queue 連線
 * 供主程式截取 SIGTERM/SIGINT 時呼叫，釋放 Redis 連線池。
 */
export async function gracefulShutdownQueues() {
  console.log('[BullMQ] Commencing graceful shutdown of queue producers...');
  await BpmTaskQueue.close();
  await NotificationQueue.close();
  await AuditEventsQueue.close();
  console.log('[BullMQ] Shutdown complete');
}
