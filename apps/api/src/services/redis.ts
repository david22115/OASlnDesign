import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * 全域公用的 Redis 連線實例。
 * 
 * 透過 ioredis 提供高可用性的快取連線。
 * 注意：BullMQ 要求 `maxRetriesPerRequest: null` 以避免連線在等待事件時因重試而中斷。
 */
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, 
});

redis.on('error', (err: any) => {
  console.error('[Redis Core] Connection error:', err);
});

redis.on('ready', () => {
  console.log('[Redis Core] Successfully connected and ready');
});
