import bcrypt from 'bcryptjs';

/**
 * ========================================================
 * 密碼安全工具 (Password Utilities)
 * ========================================================
 * 封裝雜湊演算法。針對企業級應用，我們使用 bcrypt 並設定 cost factor 至少為 10，
 * 確保安全性與驗證效能之間的平衡。
 */

const SALT_ROUNDS = 10;

/**
 * 產生帶有 Salt 的安全密碼雜湊
 * @param plainText 原始密碼
 * @returns 雜湊後的密碼字串
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * 驗證密碼是否與資料庫儲存的雜湊吻合
 * @param plainText 嘗試登入的密碼
 * @param hash 資料庫中儲存的雜湊值
 * @returns 是否吻合
 */
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
