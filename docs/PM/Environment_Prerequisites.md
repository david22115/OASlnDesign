# 專案前置環境與基礎設施清單 (Environment Prerequisites)

**專案名稱**：`OASlnDesign` (Enterprise Workflow Hub)
**文件日期**：2026-04-16

本文件羅列了 `OASlnDesign` 專案啟動開發前，IT 網路 / 專案管理單位需要預先籌備的基建資源、版控環境與第三方帳號。

---

## 1. 專案協作與原始碼保護
*   **Git 遠端代碼庫**：使用 GitHub (Private Repo)
    *   **Repository URL**: `https://github.com/david22115/OASlnDesign.git`
    *   **開發守則**：所有團隊成員均需遵守 Pull Request (PR) 原則，禁止直接 Push 主分支。
*   **專案/任務追蹤版**：暫時使用 `NotebookLM` 進行知識與任務管理。
    *   **負責帳號**: `david22115@gmail.com`

---

## 2. 伺服器與虛擬機器 (基礎設施階段)
> 目標為架設獨立的虛擬機 (Virtual Machines) 作為運算節點，**實作硬體規格與架構細節待與維運團隊後續討論定案**。

*   **Dev/Staging 測試虛擬主機池**
    *   預留 VM 供部署 Next.js 前端 (Portal/Admin)。
    *   預留 VM 供部署 BFF Node.js 服務與 Docker Runner。
*   **資料庫與快取虛擬主機 (或受管服務)**
    *   PostgreSQL 實體（儲存業務資料與表單）。
    *   Redis 叢集實體（支援權限快取、JWT 黑名單、BullMQ 非同步任務）。

---

## 3. 待填補清單：外部服務金鑰與 App 上架資訊
> ⚠️ **【狀態列管】**：以下資源申請曠日費時且牽涉公司帳務/信用卡綁定，請盡早確認。開發前期將以 `Mock` 或開發者個人帳號暫代，商轉前必須全數補齊填入本文件內部。

### 3-1. 行動端 (Mobile Android / iOS) 資源
| 資源名稱 | 用途說明 | 目前狀態 | 預計綁定帳號/金鑰值 |
|---------|---------|---------|------------------|
| **Apple Developer Enterprise** | 公司自用 iOS App 簽署與私有分發 (每年需付費) | 🔴 **待申請** | (待填) |
| **Google Play Console** | Android App 簽署與企業頻道分發 | 🔴 **待申請** | (待填) |
| **Firebase Cloud Messaging** | Mobile 緊急公告與簽核互動推送 (需掛載 `google-services.json`) | 🔴 **金鑰待申請** | (待填) |

### 3-2. 大廠服務串接資源 (依生態系排他原則擇一或全上)
| 資源名稱 | 用途說明 | 目前狀態 | 預計綁定帳號/金鑰值 |
|---------|---------|---------|------------------|
| **MS Entra ID (Azure AD)** | `OASlnDesign` Application 註冊，取得 OAuth Client ID/Secret | 🔴 **金鑰待申請** | (待填) |
| **Google Cloud Console** | Google Workspace API (OAuth 憑證、Google Drive API) | 🔴 **金鑰待申請** | (待填) |

### 3-3. 監控與資安
| 資源名稱 | 用途說明 | 目前狀態 | 預計綁定帳號/金鑰值 |
|---------|---------|---------|------------------|
| **Sentry (Crash Report)** | Server 端與 Mobile App 崩潰、無回應 (ANR) 回報與 StackTrace 擷取 | 🔴 **金鑰待申請** | (待填) |
| **SSL 憑證 (HTTPS)** | 測試網域與正式網域之網頁加密通訊 | 🔴 **憑證待申請** | (待填) |
