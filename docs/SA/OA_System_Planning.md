# 企業 OA 系統架構與整合規劃報告

基於您提供的全端 Monorepo 框架（包含 `web`、`mobile`、`api` 子專案，使用 Turborepo 管理），我們結合了現代化企業數位辦公室（OA / EIP）的實務經驗，為您設計以下這套具備高彈性、高安全性的單一入口整合平台。

---

## 一、 核心架構概覽 (Architecture Overview)

充分利用目前的 Monorepo 優勢，將系統劃分為三大端面與共用模組：

1. **Web (單一入口門戶 - EIP Portal)**：作為所有網頁端串接系統的 Hub。
2. **Mobile (企業行動 App)**：提供員工外出辦公、打卡、簽核、行事曆查看與推播接收。
3. **API (BFF / API Gateway)**：作為企業內網與外部應用的橋樑，處理權限校驗、推播派發及身分認證。
4. **Packages (共用程式)**：封裝 SSO 邏輯、型別定義 (Types)、權限驗證規則，讓 Web 與 Mobile 共享。

---

## 二、 需求實作規劃

### 1. 整合企業系統成為單一入口

建立一個類似 Launchpad (應用程式啟動台) 的操作介面，使用者只需登入一次，即可依據權限看見自己可訪問的子系統圖示。

#### 1.1 SSO (單一登入) 實作
* **核心技術**：強烈建議導入標準協定（如 **OAuth 2.0 + OIDC** 或 **SAML 2.0**）。可以使用開源的 Identity Provider (IdeP) 如 **Keycloak**，或是雲端服務 Auth0、Azure AD。
* **流程**：Web / Mobile 均導向 SSO 登入頁面，登入成功後派發 JWT (JSON Web Token) 至客戶端。API 層則依賴此 JWT 進行所有的身分認證。

#### 1.2 各系統的權限設定與跳轉 (Web Redirection)
* **權限管理 (RBAC + ABAC)**：
  * 在資料庫設計 `Users` (使用者)、`Roles` (角色)、`Permissions` (權限節點) 與 `Systems` (子系統註冊表)。
  * 單一入口獲取選單時，動態過濾無權限的系統入口。
* **無縫跳轉機制**：
  * **現代系統**：點擊跳轉時，將 SSO 發的 JWT 或短期授權碼 (Auth Code) 帶入 URL Parameter 或 Header（例如 `https://subsystem.com/auth?token=xxx`），子系統校驗後自動建立 Session。
  * **老舊系統 (僅支援帳號密碼)**：API 層可設計一個「代填登入 Proxy」機制，或在後台儲存子系統的映射帳號，使用 Backend-to-Backend 換取 Session Cookie 後幫前端跳轉。

#### 1.3 帳號/組織匯入修改，支援「無帳號密碼」身分組
* **匯入與修改**：API 提供批量匯入 (CSV / Excel) 介面，並支援與企業內部的 HR 系統、AD / LDAP 進行定時同步 (Cronjob)。
* **「無帳號密碼」身分組 (Guest / Contractor / Kiosk)**：
  * **實作場景**：用於外部訪客填表、廠區現場機台 (Kiosk)、或是短期約聘人員。
  * **技術方案**：
    1. **Magic Link / OTP 通行**：透過 Email 或簡訊發送一次性連結登入。
    2. **Device / UUID 綁定**：Mobile App 首次安裝即產生一組裝置 UUID 註冊為「匿名訪客」身分，系統僅發布對應的「最低權限 JWT」，無法訪問機敏系統。
    3. **Token 掃碼**：進廠時掃描 QR Code 直接獲取具時效性的訪客 Token 進行特定操作。

#### 1.4 App 端行為限制權限設定
* **介面級別 (UI)**：從 API 取得該使用者的 `Feature Toggles` (功能開關)，App 動態隱藏不具權限的 Tab 或按鈕（例如隱藏「核決」按鈕）。
* **硬體級別 (Device Capability)**：基於權限控制是否能調用相機、定位(GPS)。
* **資安級別**：對於機敏資料，App 端實作浮水印功能，若判定該帳號等級無法存出資料，甚至可利用 React Native 相關套件阻擋截圖操作，或加上剪貼簿禁用功能。

---

### 2. 推播通知 (整合 Firebase 服務)

* **架構整合**：
  * 使用 **FCM (Firebase Cloud Messaging)** 作為唯一推播管道。
  * **Web 端** 實作 Web Push，**Mobile 端** 實作 APNs (iOS) 與 FCM (Android)。
* **API 層推播服務**：
  1. 使用者登入時，Web/Mobile 將產生的 `FCM Device Token` 上傳至 API 並與使用者 `User ID` 綁定 (留意一位使用者可能有多個設備 Token)。
  2. 當簽核系統、公告系統有事件觸發時，呼叫 API 層的 Notification Service。
  3. API 依據 `User ID` 取出所有有效的 Tokens，批次發送 (Multicast) 推播至 Firebase 伺服器，同時將訊息寫入本地 DB，作為 App 的「歷史訊息中心」。

---

### 3. 串聯 Apple / Google / Windows 行事曆

可分為兩種維度的整合，依客戶需求可擇一或並行：

* **方案 A：寫入至使用者的本地裝置行事曆 (最推薦用於 App)**
  * **Mobile App**：利用 `expo-calendar` 或 `react-native-calendars`，申請使用者的裝置行事曆權限。當 OA 系統有新會議/排班時，由 App 直接利用 Native API 寫入系統內建的 Google Calendar 或 Apple Calendar。
* **方案 B：伺服器對伺服器同步 (Server to Server)**
  * 利用 **Google Calendar API** 或 **Microsoft Graph API (Windows/Outlook)**。
  * 使用者在 OA 系統授權 OAuth (例如 "Login with Google") 後，API 層保存 Refresh Token。OA 系統會議發生變動時，由後端非同步直接打 API 修改。
* **方案 C：iCal (ICS) 訂閱連結 (通用性最高)**
  * API 針對每位員工生成專屬的 `/api/calendar/{user_uuid}.ics` 網址。員工只需將此網址貼入 Apple / Google / Windows 行事曆中添加「訂閱行事曆」，即可單向且即時地掌握 OA 開會行程。

---

## 三、 企業 OA 系統基本功能模組規劃

除了您的核心客製化整合需求，一套完整的企業 OA 系統應具備以下基礎功能模組，我們也一併為您納入系統發展藍圖中作整體考量：

### 1. 電子簽核流程整合 (BPM Integration)
* **專業 BPM 系統串接**：本系統不自建複雜的表單引擎與簽核路由，而是透過 API 介接企業內部專業的 BPM 系統，將各類簽核單據（如請假、報銷）統一整合。
* **待辦匯總與跳轉**：擷取專業 BPM 的待辦清單，匯總至本系統的單一入口 Widget（啟動台），讓使用者一目了然並提供快速跳轉。
* **行動端推播與催辦功能**：結合 Firebase 推播架構，保留 App 端的「待辦推播通知」與「催辦提醒」機制，實際的表單簽核與流轉運算則交回給專業 BPM 處理。

### 2. 差勤管理整合 (Attendance Integration)
* **多元打卡機制 (保留前端採集)**：保留打卡採集功能，由前端 Web 負責 IP 限制打卡；Mobile App 整合 GPS 定位與公司 Wi-Fi 網卡 SSID 限制範圍打卡。
* **專業 HR 系統拋轉**：本系統收到打卡紀錄 (工號、時間、地點坐標) 後，保留紀錄並透過 API 即時/定時拋轉至企業專門的 HR / 考勤系統。
* **考勤運算分離**：本系統不介入複雜的排班規則、請假額度扣減與月底考勤結算，所有薪資與異常報表運算皆交由專門的 HR 系統負責。

### 3. 企業公告與公佈欄 (Bulletin Board)
* **分級公告派發**：支援「全公司公告」或「特定部門/角色限定公告」。
* **強制閱讀與追蹤**：設定重要公告為「必讀」，後台即時掌握人員閱讀狀況，並透過單一入口（Launchpad Widget）或 App 推播提醒補讀。

### 4. 會議室與公務資源預約 (Resource Booking)
* **視覺化預約介面**：提供行事曆時間軸形式的會議室、公務車或共用儀器預約面板，避免資源衝突。
* **整合外部行事曆**：預約成功後立刻與上述「行事曆整合方案」連動，直接將預約結果同步至所有參與者的 Google、Apple 或 Outlook 行事曆。

### 5. 企業通訊錄與個人中心 (Employee Directory)
* **組織樹狀查詢**：直覺化的聯絡人查詢，方便新進同仁尋找跨部門同事的分機或 Email。
* **職務代理與個人化設定**：員工請假期間，系統根據設定自動將簽核與待辦事項轉交給指定代理人處理，避免業務停擺。

### 6. 文件與企業知識管理 (Document Management)
* **企業級雲端規章庫**：統一存放公司規章、SOP、教育訓練教材。支援資料夾層級，結合 RBAC 權限，控制不同角色的「唯讀」、「可下載」、「可編輯」權限。

---

## 四、 框架限制與架構建議

### 目前 Monorepo 框架的限制
1. **老舊內網系統相容性負擔**：若貴公司的舊 OA 系統前端是古老的 ASP/JSP 且不支援跨域 (CORS) 或 OAuth，目前的現代化前端架構在透過 iframe 嵌入時，會遭遇 SameSite Cookie 等現代瀏覽器安全限制。
   * *解法建議*：需要在您的架構中額外配置一套 Reverse Proxy (如 Nginx 或 Traefik) 作為統一 Domain，解決跨域與 Cookie 掉失問題。
2. **多端開發的維護成本**：Web 與 Mobile 雖在同一 Repo，但若大量依賴硬體功能與推播，React Native 的升級與原生模組 (iOS/Android) 衝突處理需要專門技術儲備。

### 進階架構建議
1. **微前端 (Micro-frontend) 架構**：
   如果您的子系統未來會越來越多 (例如差勤、ERP、簽核 皆有獨立的開發團隊)，建議現有的 `apps/web` 僅作為 **Host (入口殼層)**。子系統透過 Webpack Module Federation 的形式動態載入，這樣各專案可以獨立部署而不需要重新 build 整個單一入口。
2. **統一身分認證中心 (IdP)**：
   不要在您的 `apps/api` 裡面自己手刻帳號密碼表及加密驗證，強烈建議架構外掛一套如 **Keycloak** 這樣的開源 IdP。它原生就支援您提到的 SSO、AD 匯入、OTP 無密碼登入等功能，您的 `api` 只需要專注於業務邏輯和 OA 資料的權限驗證即可。
3. **推播的地區性限制**：
   若企業含有位於中國大陸的員工，Firebase (FCM) 服務會被完全阻擋。在這種情況下，API 必須設計多通道策略 (例如：台灣/全球用 FCM，大陸地區需自動 fallback 至極光推播或阿里雲推播)。
