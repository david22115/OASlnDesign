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
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
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
function hashPassword(plainText) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcryptjs_1.default.hash(plainText, SALT_ROUNDS);
    });
}
/**
 * 驗證密碼是否與資料庫儲存的雜湊吻合
 * @param plainText 嘗試登入的密碼
 * @param hash 資料庫中儲存的雜湊值
 * @returns 是否吻合
 */
function comparePassword(plainText, hash) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcryptjs_1.default.compare(plainText, hash);
    });
}
