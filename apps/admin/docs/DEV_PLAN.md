# Admin 後台中樞開發計畫

**所屬專案**：`apps/admin`
**技術棧**：Next.js, React, Tailwind CSS / UI Components

## 一、專案職責概述
Admin 專案是企業資訊主管 (IT) 與 HR 的核心管控後台。它也是全域 `AccessPolicy` 與動態表單 (Dynamic Admin Central) 的視覺化操作中樞。沒有在此系統放行，前台將無任何資料產生。

---

## 二、SE 級工程實踐規範 (Engineering Practices)
* **資料獲取與狀態管理**：
    * 使用 **`TanStack React Query`** (或 SWR) 作為 API 遠端請求的標準工具，全權處理資料的 Cache、Retry (遇 API 斷線重試)、StaleTime 以及樂觀更新 (Optimistic UI)。
    * 使用 **`Zustand`** 作為純前端的全域狀態管理 (如側邊欄收合、使用者個人設定)，棄用 Redux 以減輕樣板代碼。
* **並行開發 Mock 服務**：
    * Phase 1 應即刻配置 **`msw (Mock Service Worker)`**。前端工程師應直接抓取 `apps/api` 產出之 Swagger/OpenAPI 規格文件，攔截網路請求以進行 UI 互動開發，不再互相等待。
* **E2E 與整合測試**：
    * 針對極度敏感的「路由守衛 (Route Guard 放行能力)」與「AccessPolicy 設定面版」，必須導入 **`Playwright`** 進行自動化使用者流程端對端測試。
* **程式碼品質與 Git 協作 (Code Quality)**：
    * 強制導入 `Husky` 與 `lint-staged` 做 Pre-commit Hook，拒絕不符規範的 Commit 流入 `OASlnDesign` 倉庫。
* **UI/UX 設計策略**：
    * 本後台中樞不進行深度的客製化視覺設計，將簡單套用開源 UI 元件庫 (例如 Shadcn UI 或 Ant Design) 以達最高開發效率。
* **CI/CD 自動化與部署**：
    * 配合 GitHub Actions，設定 PR 必須通過 Playwright 與 ESLint 檢查，方可部署至前端虛擬機。

---

## 三、開發階段任務 (Phases)

### Phase 1：基建與 Dashboard 建立
*   **PR 1-1: 專案基礎與 MSW 構建**：
    *   整合 `@repo/ui-configs` 共用設計系統；配置 React Query 與 Mock 環境。
*   **PR 1-2: 權限防禦路由 (Route Guard)**：
    *   實作 Next.js Middleware，拒絕所有不具備 `ADMIN` Role 的 Token 存取。

### Phase 2：AccessPolicy 權限視覺化
*   **PR 2-1: 權限配置介面**：
    *   開發 `AccessPolicy` 管理介面，支援設定「誰 (Dept/Role/User)」可以對「什麼資源 (Meeting Room/Doc)」進行「什麼操作 (READ/WRITE)」。
*   **PR 2-2: 整合中樞憑證管理**：
    *   實作外部 SaaS 授權管理介面，追蹤全公司員工 MS Graph 與 Workspace Token 的健康綁定狀態。

### Phase 3：動態後端中樞 (Zero-Code 表單引擎)
*   **PR 3-1: 結構定義器 (Schema Builder)**：
    *   提供拖曳式 (Drag and Drop) 介面，讓 HR 自訂 `DynamicTableDef` (產出 JSON Schema)。
*   **PR 3-2: 資料瀏覽器 (Data Explorer)**：
    *   根據定義出的 Schema，自動渲染出動態表格與過濾器，操作無正規化的 JSONB 資料。

### Phase 4：營運監控與稽核
*   **PR 4-1: 稽核日誌 (Audit Log) 調閱室**：
    *   實作針對全系統的 Log (Elasticsearch/PostgreSQL) 大數據查詢與報表匯出介面。
