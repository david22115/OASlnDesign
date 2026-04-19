import { Request, Response } from 'express';
import { prisma } from '@repo/database';
import { comparePassword } from '../utils/password.util';
import { signAccessToken } from '../utils/jwt.util';
import { redis } from '../services/redis';
import jwt from 'jsonwebtoken';

/**
 * ========================================================
 * 身分驗證控制器 (Auth Controller)
 * ========================================================
 * 集中處理登入、登出、狀態檢查。遵守安全防禦守則。
 */

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, password } = req.body;

    // Boundary check
    if (!employeeId || !password) {
      res.status(400).json({ status: 'ERROR', message: 'Missing credentials' });
      return;
    }

    // 查詢員工狀態
    const user = await prisma.employeeProfile.findUnique({
      where: { employeeId },
    });

    // 安全點：不管是不存在、被停權還是密碼錯誤，一律回傳 401 模糊訊息，防禦枚舉攻擊
    if (!user || !user.passwordHash || !user.isActive) {
      res.status(401).json({ status: 'ERROR', message: 'Invalid credentials' });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ status: 'ERROR', message: 'Invalid credentials' });
      return;
    }

    // 🎉 驗證成功，簽發 Token
    const { token, jti } = signAccessToken({ userId: user.id, employeeId: user.employeeId });

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

  } catch (err: any) {
    console.error('[AuthController] Login Error:', err.message);
    res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(400).json({ status: 'ERROR', message: 'Not logged in' });
      return;
    }

    // 取出原始 Token 進行退役處理
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
        if (remainingTime > 0) {
          // 將 jti 寫入 Redis 黑名單，TTL 對齊 JWT 到期日，到期後自動刪除節省記憶體
          await redis.setex(`blacklist:${user.jti}`, remainingTime, 'revoked');
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
  } catch (err: any) {
    console.error('[AuthController] Logout Error:', err.message);
    res.status(500).json({ status: 'ERROR', message: 'Failed to logout' });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await prisma.employeeProfile.findUnique({
      where: { id: req.user!.userId },
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
  } catch (err: any) {
    console.error('[AuthController] Me Error:', err.message);
    res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
  }
};
