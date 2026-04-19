import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { redis } from '../services/redis';

/**
 * 擴展 Express Request 介面以攜帶強型別的 user payload
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        employeeId: string;
        jti: string;
      };
    }
  }
}

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
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 支援從 Header 或 Cookie 取得 Token
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
       res.status(401).json({ status: 'ERROR', message: 'Authentication required' });
       return;
    }

    const decoded = verifyToken(token);

    // 藉由 Redis 過濾掉已被主動登出 (Revoked) 的 Token
    const isBlacklisted = await redis.get(`blacklist:${decoded.jti}`);
    if (isBlacklisted) {
      res.status(401).json({ status: 'ERROR', message: 'Token has been revoked' });
      return;
    }

    // 將身分資料放回 Request，供後續 Controller 使用
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ status: 'ERROR', message: 'Token has expired' });
    } else {
      console.warn('[AuthMiddleware] Token invalid:', err.message);
      res.status(401).json({ status: 'ERROR', message: 'Invalid token' });
    }
  }
};
