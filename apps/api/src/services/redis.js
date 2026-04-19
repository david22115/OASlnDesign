"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = require("ioredis");
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
/**
 * 全域公用的 Redis 連線實例。
 *
 * 透過 ioredis 提供高可用性的快取連線。
 * 注意：BullMQ 要求 `maxRetriesPerRequest: null` 以避免連線在等待事件時因重試而中斷。
 */
exports.redis = new ioredis_1.Redis(redisUrl, {
    maxRetriesPerRequest: null,
});
exports.redis.on('error', (err) => {
    console.error('[Redis Core] Connection error:', err);
});
exports.redis.on('ready', () => {
    console.log('[Redis Core] Successfully connected and ready');
});
