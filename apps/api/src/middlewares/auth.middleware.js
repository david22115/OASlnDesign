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
exports.requireAuth = void 0;
const jwt_util_1 = require("../utils/jwt.util");
const redis_1 = require("../services/redis");
/**
 * ========================================================
 * 全域身分驗證中繼軟體 (Auth Middleware)
 * ========================================================
 * 攔截 HTTP 請求，驗證 JWT 簽章並檢查 Token 是否已被 Redis 標記為黑名單 (登出失效)。
 *
 * 實作邏輯：
 * 1. 優先從 Cookie 抓取 `accessToken` (給 Portal / Admin 使用)。
 * 2. 如果 Cookie 沒有，則檢查 `Authorization: Bearer <token>` Header (給 Mobile App 使用)。
 * 3. 驗證通過且未在黑名單，將解碼的資訊掛載至 `req.user`。
 */
const requireAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // 支援從 Header 或 Cookie 取得 Token
        let token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken;
        if (!token && ((_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.startsWith('Bearer '))) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            res.status(401).json({ status: 'ERROR', message: 'Authentication required' });
            return;
        }
        const decoded = (0, jwt_util_1.verifyToken)(token);
        // 藉由 Redis 過濾掉已被主動登出 (Revoked) 的 Token
        const isBlacklisted = yield redis_1.redis.get(`blacklist:${decoded.jti}`);
        if (isBlacklisted) {
            res.status(401).json({ status: 'ERROR', message: 'Token has been revoked' });
            return;
        }
        // 將身分資料放回 Request，供後續 Controller 使用
        req.user = decoded;
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({ status: 'ERROR', message: 'Token has expired' });
        }
        else {
            console.warn('[AuthMiddleware] Token invalid:', err.message);
            res.status(401).json({ status: 'ERROR', message: 'Invalid token' });
        }
    }
});
exports.requireAuth = requireAuth;
