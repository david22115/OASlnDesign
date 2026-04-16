# EIP 前台入口開發計畫

**所屬專案**：`apps/portal`
**技術棧**：Next.js, React

## 一、專案職責概述
Portal 專案是整個企業 OA 系統的門面，主要承載員工的日常操作 (打卡檢視、請假簽核、資源預約)。

> ⚠️ **生態系排他原則**：本入口在啟用外部協同合作工具時，**不可發生混用狀態**。例如建立會議室綁定，系統 UI 必須依照後端設定，鎖定顯示單一生態系（純 Microsoft 介面 或 純 Google 介面），要求使用者採用一致性的流程。

> 💡 **UI/UX 狀態紀錄**：目前 Portal 前台的視覺設計 (UI/UX) 尚未定案，待專案後續設計資源投入後再行補充設計指引與實作細節。

---

## 二、SE 級工程實踐規範 (Engineering Practices)
* **資料獲取與狀態管理**：
    * 導入 **`TanStack React Query`** (或 SWR) 作為 API 遠端請求的狀態管理工具，提供非同步載入畫面、請求去重與本地快取能力。
    * 輕量級客戶端全域狀態 (如淺/深色模式、已開啟彈窗紀錄) 交由 **`Zustand`** 統一打理。
* **並行開發 Mock 服務**：
    * 啟用 **`msw (Mock Service Worker)`**。在後端 API 尚未開發完成前，藉由攔截前端請求，使前端團隊得以完全依據合約開發。
* **高穩定性防護**：
    * 引進 **`Playwright`** 進行自動化 E2E 測試，重點覆寫「OAuth 跳轉流」與「Launchpad 九宮格根據權限正確渲染」的兩大關鍵邏輯。
* **程式碼品質與 Git 協作 (Code Quality)**：
    * 強制導入 `Husky` 做 Pre-commit Hook。
* **CI/CD 自動化與部署**：
    * 配合 GitHub Actions，設定 PR 必須通過 Playwright 與 ESLint 檢查，協助前端部署至測試虛擬機環境。

---

## 三、開發階段任務 (Phases)

### Phase 1：登入與 Launchpad 工作站
*   **PR 1-1: IdP 登入介接與 MSW 整合**：
    *   打通對接 Keycloak / Azure AD 的跳轉登入流 (OAuth 2.0 PKCE)；建立基礎 React Query 組態。
*   **PR 1-2: Launchpad (應用啟動台)**：
    *   依據 BFF 傳回的動態 AccessPolicy 權限清單，渲染符合該使用者權限的 App 捷徑矩陣。

### Phase 2：日常 OA 模組與協作
*   **PR 2-1: 公告佈告欄與簽核 Widget**：
    *   實作必讀公告的閱讀追蹤，並在首頁嵌入從 BPM 拉取的待辦簽核清單。
*   **PR 2-2: 資源預約與視訊會議整合**：
    *   針對排他原則開發，當預約成立後，動態於 UI 上展示與員工該帳號綁定之 Zoom/Meet/Teams 會議專屬連結。

### Phase 3：文件聯邦 (外部預覽整合)
*   **PR 3-1: 文件資料夾樹狀導航**：
    *   實作 S3 與大廠聯邦 (Google Drive / SharePoint) 混合的樹狀文件管理 UI。
*   **PR 3-2: 前端代理開啟與彈窗協作**：
    *   實作文件 IFrame 預覽技術區塊，讓辦公文件不落本機，於微軟/Google原廠網頁中流暢共編。
