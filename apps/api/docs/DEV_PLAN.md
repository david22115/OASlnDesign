# API 與 BFF (Backend For Frontend) 開發計畫

**所屬專案**：`apps/api`
**技術棧**：Node.js, Express / NestJS, Prisma, BullMQ, Redis

## 一、專案職責概述
API 專案是整個企業 OA 系統的「核心流程大腦」，負責攔截所有前端請求，進行身分驗證、AccessPolicy 權限查驗，以及擔任「企業整合中樞 (Integration Hub)」，代理所有對大廠生態系的 API 呼叫。

> ⚠️ **生態系排他原則**：本後端在與外部大廠服務串接時，**限制不可混用，必須使用一整套**。當一間企業或使用者綁定了微軟 (M365) 體系，即全面採用 MS Graph API (Teams/SharePoint)；若綁定了 Google體系，即全面採用 Google Workspace API，不可出現跨體系的串接流。

---

## 二、SE 級工程實踐規範 (Engineering Practices)
為確保後端穩定性與降低未來接手門檻，開發時需嚴格遵守以下基礎建設：
* **資安與例外防護**：全應用強制啟用 `helmet` 與嚴格的 CORS 原則。實作全域錯誤中介層 (Global Exception Filter)，統一向前端吐回符合標準之 `RFC 7807 Problem Details for HTTP APIs` 錯誤格式，嚴禁洩漏 DB Schema。
* **自動化測試策略**：採用 `Jest` + `Supertest` 進行 API 端點的整合測試，對於 AccessPolicy Engine 的判斷邏輯必須具備 80% 以上測試覆蓋率。
* **程式碼品質與 Git 協作 (Code Quality)**：強制導入 `Husky` 做 Pre-commit Hook，確保推上 Github `OASlnDesign` 的程式碼絕對通過 ESLint 與 Prettier。
* **CI/CD 自動化與部署**：配合 GitHub Actions，於發起 PR 時自動執行 `Jest`，並於 main 分支產生 `Dockerfile` Build 供虛擬機部署。
* **可觀測性 (Observability)**：需整合 APM 工具（如 Datadog 或 Sentry 預留位），日後監控 Node.js 記憶體與 Slow Query。
* **DevOps 環境分離**：必須維護 `.env.example` 並明確描述不同開發與正式環境 (Dev/Staging/Prod) 的環境變數隔離策略與第三方金鑰的預留位置。

---

## 三、開發階段任務 (Phases)

### Phase 1：基建與系統核心搭建
*   **PR 1-1: 測試與開發環境搭建**：
    *   設定 `pnpm` workspace 的依賴關係，匯入 `@repo/database` 與 `@repo/shared-types`。
    *   設定 `Jest`、`Docker` 與 Swagger 環境。
*   **PR 1-2: Auth 與 Session 服務**：
    *   建立 JWT 簽發邏輯。
    *   實作 Redis 進行 Token 黑名單與白名單管控。
    *   **【需金鑰申請】** 設定 MS Graph 與 Google Workspace OAuth 授權路由預留。

### Phase 2：AccessPolicy 權限引擎
*   **PR 2-1: 權限大腦引擎中介層 (Middleware)**：
    *   實作攔截器，於所有業務 Router 加上 `AccessPolicyEngine.check(...)` 邏輯。
*   **PR 2-2: JIT (Just-In-Time) 授權代理**：
    *   實作當使用者通過 OA 權限時，動態賦予外部 SaaS 系統 (M365/Google) 的臨時存取白名單。

### Phase 3：容錯與非同步系統
*   **PR 3-1: 斷路器 (Circuit Breaker)**：
    *   導入 `resilience4j/opossum` 等防範外部大廠 `429 Too Many Requests` 限流癱瘓系統。
*   **PR 3-2: BullMQ Queue Worker**：
    *   建立 Background Worker，當外部斷路時，將操作紀錄轉存本地 Queue，待連線復原後非同步重試。

### Phase 4：動態表單與業務模組 API
*   **PR 4-1: 動態後端中樞 (Dynamic Admin Central)**：
    *   利用 PostgreSQL GIN Index 實作 JSONB 各欄位的高速搜索 API。
*   **PR 4-2: 資源預約與排程模組**：
    *   建立樂觀鎖 (Optimistic Locking) 防禦會議室雙重預約 (Double Booking)。
