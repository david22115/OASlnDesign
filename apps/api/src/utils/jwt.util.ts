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
const JWT_EXPIRES_IN = '1h'; // Access token 有效期預設 1 小時

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
