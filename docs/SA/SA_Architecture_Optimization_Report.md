# OA 系統架構進階優化健檢報告

經過重新審視目前的架構藍圖（包含單一入口、各大業務模組、以及解耦合的權限策略引擎），該系統在概念上已經具備現代化企業級應用的雛形（模組化、低耦合、職責分離）。

為了讓系統在面對「高併發量（如早晨打卡）」及「龐大資料量（如海量公文與權限驗證）」時能更具備**韌性 (Resilience)** 與 **效能 (Performance)**，以下為現有架構的五項深度優化建議：

---

## 優化項目 1：權限引擎的效能瓶頸與快取策略 (Caching)

### 🚨 當前隱患 (N+1 Permission Problem)
由於 `AccessPolicy` 引擎被獨立出來，當頁面需要同時渲染 50 份文件列表時，API 必須反覆向權限引擎請求驗證，這會導致資料庫嚴重的 I/O 負擔。

### 💡 優化方案
1. **導入 Redis 快取層**：權限引擎在解析完某個使用者的 Policy 後，應將其「權限清單 (Resource IDs)」快取至 Redis (TTL: 5-15 分鐘)。列表請求時，使用交集過濾。
2. **粗粒度 Token 綁定**：登入時，IdP 即可將高層級的「所屬群組或權限特徵」打包入 JWT 內。前端介面直接透過 Token 解碼隱藏無權限之元件，降低不必要的後端 Policy Engine 詢問次數。

---

## 優化項目 2：異步整合與事件驅動架構 (EDA)

### 🚨 當前隱患
在「差勤打卡拋轉 HR 分系統」以及「催辦推播通知打回 BPM 系統」的設計中，目前採取直接的同步 API 呼叫 (REST/RPC)。若 HR 或 BPM 系統短暫停機維護，員工的打卡或動作就會失敗並卡死。

### 💡 優化方案
1. **導入 Message Queue (訊息佇列)**：例如使用 Kafka、RabbitMQ 或是 Node.js 生態系的 `BullMQ`。
2. **機制調整 (最終一致性)**：
   * 員工只要通過本系統自身的防詐 (Wi-Fi/GPS) 驗證，系統即視為「打卡成功」。
   * 同時將 `ClockInEvent` 丟入 Queue 中。
   * 後端 Worker 負責從 Queue 拉取資料，並以自動 Retry 機制慢慢拋給舊的 HR 系統。這對於早晨 08:50 ~ 09:00 極端併發量有驚人的抗壓效果。

---

## 優化項目 3：全域稽核日誌中心 (Centralized Audit Trail)

### 🚨 當前隱患
目前我們僅在「公告」模組設計了已讀追蹤 (`AnnouncementReadLog`)，但對整體 OA 的機敏操作缺乏統一監控機制（誰下載了企劃案？誰偷改了權限群組？）。

### 💡 優化方案
*既然我們已經把權限審核收攏在「全域存取控制引擎 (AccessPolicy Engine)」*，這就構成了完美的**咽喉點 (Chokepoint)**。
* 任何查閱與下載動作，只要 Policy Engine 判斷並回傳 `TRUE`，即可同步觸發一筆 Log 寫入 Elasticsearch (或 Datadog 等 log 儲存區)。
* 管理員可以隨時透過中控台產出報表：「過往一個月，所有存取/下載過 機密文件Z 的人員清單與連線 IP」。

---

## 優化項目 4：Mobile App 離線支援與防弊策略

### 🚨 當前隱患
App 端高度依賴網路去發送 GPS 與 SSID 請求。在廠房深處或行動網路死角，打卡容易失敗。此外，單純的前端 GPS 定位極易遭受「虛擬定位 (Fake GPS) App」篡改。

### 💡 優化方案
1. **防護升級**：在 React Native / Expo 端引入系統級的 Jailbreak (iOS) 與 Rooted (Android) 偵測套件，並偵測開發者選項的 `Mock Location` 狀態。
2. **離線安全打卡**：如果偵測無網路但仍在公司 Wi-Fi 訊號範圍，手機可就地產出帶有精確時間戳記的 payload，運用預埋在此 App 裝置內的 RSA Private Key 加密生成簽章 (Signature) 存入本地 SQLite。待網路恢復後立即背景上傳，利用公鑰解密後驗證時間無誤即承認打卡。

---

## 優化項目 5：單一入口 UI 整合之微前端 (Micro-frontend)

### 🚨 當前隱患
目前 EIP Portal 將外部系統視為「跳轉連結 (Redirection)」，不管是開新視窗、帶 Token 跳轉，或是 Iframe 嵌入，使用者在體驗上依舊受限於「框架載入白屏、畫風不連續」的割裂感。

### 💡 優化方案
如果在您的 Turborepo 中，未來打算自行翻轉重寫部分子系統（例如自己用 React 寫套新的「預約會議」），強烈建議導入 **Webpack Module Federation (微前端架構)**。
* 入口框架 (EIP Shell) 可以像載入自身 Component 一樣，直接從另一個 Repo/Domain「非同步加載」會議子系統的 React 元件。
* 使用者在使用體驗上，完全不會覺得跳出了單一入口，享受真正無縫的 SPA (Single Page Application) 高流暢度體驗。

---

## 優化項目 6：資料庫與 ORM 核心技術選型 (PostgreSQL + Prisma)

### 🚨 當前考量
在微服務架構或單一 Monorepo 中，處理多變且互相交織的企業級領域資料模型（如員工、部門、任務、資源預約等），需要一套具備極高「型別安全性」與「資料庫遷移管理」機制的長效方案。

### 💡 選型方案：確認採用 PostgreSQL 搭配 Prisma 作為基礎設施
這套組合是目前 Node.js / TypeScript 開發生態圈中經得起企業規模驗證的「黃金組合」，將能在系統設計面上帶來以下關鍵助益：

1. **對接 Postgres 特有進階型別 (Zero Type-gap)**：OA 系統高頻依賴的非結構化配置(JSONB)、標籤與多選區塊(Arrays)、狀態控制(Enums) 及全文本檢索，Prisma 皆能原生映射至嚴格的 TypeScript Type，完全消除資料層與應用層之間的型別斷層。
2. **具備安全防護網的自動遷移系統 (Prisma Migrate)**：對於具備嚴謹 Foreign Keys 的 PostgreSQL 資料表，`prisma migrate` 可將 Schema 變動自動轉譯為精確且可被 Git 版控的 `.sql` 檔。它能追蹤及預防在 Staging/Production 多環境部署間可能發生的資料表覆蓋錯誤。
3. **大幅解放開發動能 (Developer Velocity)**：直覺的物件導向查詢 API 加上編譯期的強型別檢查，減少了人工撰寫與維護繁瑣 SQL (或 JOIN 語法) 的時間。修改欄位時如果有遺漏，IDE 馬上會報錯反饋，降低上線後才發生的 Runtime Exception 發生率。
4. **預防並發架構瓶頸的擴展性應對**：若未來部分微服務採用 Serverless 架構，PostgreSQL 容易發生連線數耗盡死鎖的問題，我們可藉由掛載 PgBouncer 中介代理層 或 Prisma Accelerate 輕易擴容連接池 (Connection Pooling)，確保如「早晨集體打卡」等高併發情境下的穩定度。

---

## 優化項目 7：企業級零信任安全防護結構 (Zero-Trust Security Architecture)

### 🚨 當前考量
企業內部 OA 系統涵蓋了高度機敏及營業秘密（如人事薪酬、高管行程、內部財報文件、未公開企劃），若在微服務邊界或前端防護上出現漏洞，極易受到內部越權存取（Insider Threat）或外部駭客攻擊。傳統「只要連上企業 VPN 內網即安全」的觀念已完全無法應對現代混合辦公場景。

### 💡 結構設計：全端次世代安全防護矩陣
在架構實作上，必須貫穿從前端至資料庫的「零信任 (Zero-Trust)」核心原則，不論內外網連線，皆視為不可信，並確保以下四層次防禦網：

1. **網路邊界防護 (Perimeter & Network Security)**
   * **API Gateway 節流與防禦 (Rate Limiting)**：針對特定的資源消耗型 API（如大檔案下載、批量撈取資料），在 BFF 層面強制實作動態速率限制，阻斷惡意腳本或 DDoS 爆破。
   * **端點阻擋 (WAF)**：部署 Web Application Firewall，防堵常見 OWASP Top 10 攻擊。

2. **身份與存取控制 (Identity & Access Management)**
   * **整合企業級 IdP (Identity Provider)**：廢除系統自行維護本地帳密機制，登入流程全面整合微軟 Azure AD、Okta 或內部 LDAP (基於 OAuth 2.0 / OIDC)，落實外部連線強制多重驗證 (MFA)。
   * **後端微服務通訊加密 (mTLS / M2M)**：不只是前端打後端需要 Token；BFF 內部呼叫底層各微服務時，也必須帶有服務專屬身分 Token 或是透過雙向 TLS (mTLS) 加密，杜絕內網旁路監聽與越權呼叫。

3. **資料傳輸與隱私落地 (Data Cryptography & Privacy)**
   * **機敏資料 (PII) 應用層加密**：針對隱私資料（如員工身份證字號、薪資級距），在利用 Prisma 寫入 Postgres 之前，必須透過外部 KMS (Key Management Service) 進行應用層加密。即便 DBA 手滑匯出備份，無密鑰仍是一團亂碼。
   * **安全傳輸層**：不論是對外暴露網域還是內網容器間的通訊，強制降級拒絕，全面採用 TLS 1.3 協定。

4. **客戶端 (Client-side) 應用層防護**
   * **嚴密的 CSP (Content Security Policy) 標頭**：在 Web 伺服器注入 CSP Headers，封閉非預期、非白名單內的外部圖檔與 Script 執行，徹底阻殺 XSS (跨站腳本攻擊)。
   * **Cookie 的極端防護機制**：依賴 Session/Token 的 Cookie 必須強制標示 `HttpOnly` (阻擋 JS 讀取)、`Secure` (限 HTTPS 傳輸) 以及 `SameSite=Strict`，將 CSRF 偽造連線的可能性降至絕對最低。
