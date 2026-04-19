"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEventsQueue = exports.NotificationQueue = exports.BpmTaskQueue = void 0;
exports.gracefulShutdownQueues = gracefulShutdownQueues;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
/**
 * ========================================================
 * 核心任務佇列定義 (BullMQ Queues) - 僅作為生產者 (Producer)
 * ========================================================
 * 設計規範：使用相同的 Redis 連線以減少資源消耗。
 * 注意：此微服務不自行啟動 Worker 節點，實現發布端與消費端的解耦。
 */
exports.BpmTaskQueue = new bullmq_1.Queue('BpmTaskSync', { connection: redis_1.redis });
exports.NotificationQueue = new bullmq_1.Queue('NotificationQueue', { connection: redis_1.redis });
exports.AuditEventsQueue = new bullmq_1.Queue('AuditEvents', { connection: redis_1.redis });
/**
 * 安全且優雅地關閉 Queue 連線
 * 供主程式截取 SIGTERM/SIGINT 時呼叫，釋放 Redis 連線池。
 */
function gracefulShutdownQueues() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('[BullMQ] Commencing graceful shutdown of queue producers...');
        yield exports.BpmTaskQueue.close();
        yield exports.NotificationQueue.close();
        yield exports.AuditEventsQueue.close();
        console.log('[BullMQ] Shutdown complete');
    });
}
