# 微服務與非同步介面規格書協議 (Microservices & WebSocket API Contract)

本文件重新對齊了以 **Web Gateway (BFF)** 為中心的微服務呼叫結構。前端與 Backend For Frontend 通訊將採用 **Zero-Token (HttpOnly Cookie)** 防護策略，並透過 **WebSocket** 推動非同步儀表板。

---

## 1. 共通性設定與 BFF Zero-Token 策略

*   **無實體 Token 回傳**：登入完成後，API 不會在 Request Body 交出 `accessToken`。所有憑證由 Node.js BFF (Gateway) 以 `Set-Cookie: jwt_auth=xxxxx; HttpOnly; Secure; SameSite=Strict` 加密存放於客戶端。
*   **前端開發**：所有的 Axios / Fetch 呼叫，必須設定 `withCredentials: true`。

---

## 2. Auth Service (身分與認證微服務)

### 2.1 標準登入 (MFA 挑戰支援)
- **Endpoint**: `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "email": "employee@example.com",
    "password": "hashed_or_raw_password",
    "totpCode": "123456" // 如果 Profile 有開啟 MFA，則必填
  }
  ```
- **Response `200 OK`**:
  *(BFF 會在 Header 做 `Set-Cookie`，不回傳 Token)*
  ```json
  {
    "data": {
      "message": "Login successful. Session established.",
      "challengeMfa": false, // 若設為 true 代表需要走第二階段輸入 OTP
      "userProfile": { "id": "uuid", "fullName": "王大明" }
    }
  }
  ```

---

## 3. Org & IAM Service (組織與權限微服務)

### 3.1 取得當下完整人令與兼職資訊
- **Endpoint**: `GET /api/v1/org/me/positions`
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
         "title": "董事長",
         "isPrimary": true,
         "department": { "code": "BOARD", "name": "董事會" }
      },
      {
         "title": "代理執行長",
         "isPrimary": false,
         "department": { "code": "EXEC", "name": "總經理室" }
      }
    ]
  }
  ```

---

## 4. Portal Service (單一入口與桌面微服務)

### 4.1 取得客製化 Launcher (結合 UserPreference)
- **Endpoint**: `GET /api/v1/portal/launchpad`
- **Description**: 聚合了 `AccessPolicy` 所允許看到的系統，並依據使用者的 `UserPreference` 吐出排序好的釘選 (Pinned) 選項。
  ```json
  {
    "data": {
      "pinnedApps": [
        { "appId": "...", "name": "BPM", "iconCdnUrl": "https://cdn.oa.com/bpm.png" }
      ],
      "allApps": [...]
    }
  }
  ```

---

## 5. WebSocket 訊息轉換中心 (Message Bus)

**為了取代會阻斷伺服器的 HTTP Polling 與單向 SSE，我們為 Dashboard / Widgets 搭建 Socket 長連結。**

- **連線端點 (Endpoint)**: `wss://ws-gateway.company.com/portal`
- **授權 (Auth)**: WebSocket 建立連線 (Handshake) 階段自動讀取 `HttpOnly Cookie` 校驗身分。

### 5.1 雙向事件流 (Event Dictionary)

| 資料流向 | 事件名稱 (Event) | 負載內容 (Payload) | 說明 |
| :--- | :--- | :--- | :--- |
| **Client -> Server** | `widget:subscribe` | `{ "widgetIds": ["TODO", "NEWS"] }` | 前端畫面 Load 完後，主動跟伺服器註冊要訂閱哪些卡片的非同步數值更新。 |
| **Server -> Client** | `widget:sync` | `{ "widgetId": "TODO", "data": {"count": 15} }` | BFF 背景撈完資料後，推送給前端直接渲染於畫面 (State)。 |
| **Server -> Client** | `system:broadcast`| `{ "level": "URGENT", "message": "ERP 維護中" }` | 系統緊急告警推播，不限頁面跳出 Toast。 |
| **Client -> Server** | `desktop:pin_update`| `{ "appId": "app-01", "action": "pin" }` | 使用者拖曳桌面 Icon 改變客製化設定，打 Socket 背景儲存。 |

透過此 **WebSocket 架構**，前端 React/Vue 元件只需綁定 Socket Listener (`socket.on('widget:sync')`) 並聯動 Zustand 狀態庫，Launchpad 將變為真正「Live (存活)」的無延遲反應系統，且省下 80% Server HTTP 頻寬！
