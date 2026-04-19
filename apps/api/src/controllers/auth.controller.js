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
exports.me = exports.logout = exports.login = void 0;
const database_1 = require("@repo/database");
const password_util_1 = require("../utils/password.util");
const jwt_util_1 = require("../utils/jwt.util");
const redis_1 = require("../services/redis");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * ========================================================
 * 身分驗證控制器 (Auth Controller)
 * ========================================================
 * 集中處理登入、登出、狀態檢查。遵守安全防禦守則。
 */
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId, password } = req.body;
        // Boundary check
        if (!employeeId || !password) {
            res.status(400).json({ status: 'ERROR', message: 'Missing credentials' });
            return;
        }
        // 查詢員工狀態
        const user = yield database_1.prisma.employeeProfile.findUnique({
            where: { employeeId },
        });
        // 安全點：不管是不存在、被停權還是密碼錯誤，一律回傳 401 模糊訊息，防禦枚舉攻擊
        if (!user || !user.passwordHash || !user.isActive) {
            res.status(401).json({ status: 'ERROR', message: 'Invalid credentials' });
            return;
        }
        const isMatch = yield (0, password_util_1.comparePassword)(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ status: 'ERROR', message: 'Invalid credentials' });
            return;
        }
        // 🎉 驗證成功，簽發 Token
        const { token, jti } = (0, jwt_util_1.signAccessToken)({ userId: user.id, employeeId: user.employeeId });
        // 對 Web 端設定安全的 HttpOnly Cookie
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600 * 1000 // 1 hr 與 JWT 等長
        });
        // 同時在 JSON 返回，以利 Mobile App 自行寫入 SecureStore
        res.json({
            status: 'OK',
            data: {
                token,
                user: { employeeId: user.employeeId, fullName: user.fullName }
            }
        });
    }
    catch (err) {
        console.error('[AuthController] Login Error:', err.message);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
    }
});
exports.login = login;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const user = req.user;
        if (!user) {
            res.status(400).json({ status: 'ERROR', message: 'Not logged in' });
            return;
        }
        // 取出原始 Token 進行退役處理
        let token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken;
        if (!token && ((_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.startsWith('Bearer '))) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (token) {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && decoded.exp) {
                const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
                if (remainingTime > 0) {
                    // 將 jti 寫入 Redis 黑名單，TTL 對齊 JWT 到期日，到期後自動刪除節省記憶體
                    yield redis_1.redis.setex(`blacklist:${user.jti}`, remainingTime, 'revoked');
                }
            }
        }
        // 清除 Cookie：需帶與設定時相同的 path/domain 選項才能確保瀏覽器確實清除
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
        res.json({ status: 'OK', message: 'Logged out successfully' });
    }
    catch (err) {
        console.error('[AuthController] Logout Error:', err.message);
        res.status(500).json({ status: 'ERROR', message: 'Failed to logout' });
    }
});
exports.logout = logout;
const me = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const profile = yield database_1.prisma.employeeProfile.findUnique({
            where: { id: req.user.userId },
            // 安全點：絕對禁止選出 passwordHash 或 mfaSecret，僅提供基礎可見資料
            select: {
                id: true,
                employeeId: true,
                fullName: true,
                email: true,
                isMfaEnabled: true,
            }
        });
        if (!profile) {
            res.status(404).json({ status: 'ERROR', message: 'User not found' });
            return;
        }
        res.json({ status: 'OK', data: profile });
    }
    catch (err) {
        console.error('[AuthController] Me Error:', err.message);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
    }
});
exports.me = me;
