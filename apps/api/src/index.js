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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const database_1 = require("@repo/database");
const redis_1 = require("./services/redis");
const queue_1 = require("./services/queue");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const dynamic_admin_routes_1 = __importDefault(require("./routes/dynamic_admin.routes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// ========================================================
// 基礎中介軟體配置 (Middleware)
// ========================================================
app.use((0, cors_1.default)({
    credentials: true, // 必須開啟以允許跨域帶下 Cookie
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// ========================================================
// 路由控制器 (Controllers)
// ========================================================
app.use('/api/auth', auth_routes_1.default);
app.use('/api/admin/dynamic', dynamic_admin_routes_1.default);
/**
 * 系統核心健康檢查端點 (Health Check)
 * 提供 DevOps 系統 (如 K8s Liveness Probe) 判定容器是否存活，
 * 同時檢驗 Database 與 Redis 連線狀態以防止系統假性存活。
 */
app.get('/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield database_1.prisma.$queryRaw `SELECT 1`;
        yield redis_1.redis.ping();
        res.json({ status: 'OK', services: { db: 'up', redis: 'up' } });
    }
    catch (err) {
        console.error('[HealthCheck] Failed:', err);
        res.status(500).json({ status: 'ERROR', message: err.message });
    }
}));
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
const shutdownHandler = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('\n[System] SIGINT/SIGTERM received. Triggering graceful shutdown...');
    server.close(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield (0, queue_1.gracefulShutdownQueues)();
            yield database_1.prisma.$disconnect();
            yield redis_1.redis.quit();
            console.log('[System] All resources released. Exiting gracefully.');
            process.exit(0);
        }
        catch (err) {
            console.error('[System] Error during shutdown:', err);
            process.exit(1);
        }
    }));
});
process.on('SIGINT', shutdownHandler);
process.on('SIGTERM', shutdownHandler);
