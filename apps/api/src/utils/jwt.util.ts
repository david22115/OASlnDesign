import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * ========================================================
 * JWT 工具 (JWT Utilities)
 * ========================================================
 * 負責 JWT 的簽發、驗證。
 * 所有發出的 Access Token 皆內含 `jti` (JWT ID)，以利後續結合 Redis
 * 實作強制登出 (Blacklist) 機制。
 */

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_super_secret_dev_key';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('[Security] JWT_SECRET must be set in production environment!');
}
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '1h') as any; // Access token 有效期

/**
 * 輔助工具：將簡單的效期字串 (如 1h, 1d) 轉換為毫秒。
 * 用於確保 Cookie maxAge 與 JWT expiresIn 絕對同步。
 */
export function getExpiresInMs(): number {
  const value = String(JWT_EXPIRES_IN);
  const unit = value.slice(-1);
  const amount = parseInt(value, 10);
  
  switch (unit) {
    case 'h': return amount * 60 * 60 * 1000;
    case 'd': return amount * 24 * 60 * 60 * 1000;
    case 'm': return amount * 60 * 1000;
    case 's': return amount * 1000;
    default: return 3600 * 1000; // Fallback to 1h
  }
}

export interface AuthPayload {
  userId: string;
  employeeId: string;
}

/**
 * 簽發帶有唯一 JTI 識別碼的 Access Token
 * @param payload 需內嵌的身分資料 (不應包含敏感資訊如密碼)
 * @returns 包含 token 字串與 jti 識別碼的物件
 */
export function signAccessToken(payload: AuthPayload): { token: string; jti: string } {
  const jti = uuidv4();
  const token = jwt.sign(
    { ...payload, jti },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  return { token, jti };
}

/**
 * 驗證 Token 是否合法且未被竄改
 * @param token 要驗證的 JWT
 * @returns 解析後的 Payload，包含原本嵌入的身分與 jti
 */
export function verifyToken(token: string): AuthPayload & { jti: string } {
  return jwt.verify(token, JWT_SECRET) as AuthPayload & { jti: string };
}
