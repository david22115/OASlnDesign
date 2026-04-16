# Express API 請求生命週期流程圖

針對 API 伺服器 (`apps/api`)，其核心不是元件，而是 **請求-回應循環 (Request-Response Cycle)**。每一個進來的 HTTP Request 都會經過一系列的 Middleware 處理，最終回傳 Response。

## 流程圖

```mermaid
graph LR
    Client[客戶端 (Client)]
    
    subgraph Express_Server [Express Server]
        In((Request 進站)) --> GlobalMW[全域 Middleware\n(CORS, Logger, JSON Parser)]
        GlobalMW --> Router[路由匹配 (Router)]
        
        Router --> RouteMW[路由層級 Middleware\n(Auth 驗證, Validation)]
        RouteMW --> Controller[控制器邏輯 (Controller)]
        
        Controller --> Service[商業邏輯 / Database]
        Service --> DB[(資料庫)]
        DB --> Service
        Service --> Controller
        
        Controller -- 成功 --> ResSuccess[res.json Success]
        Controller -- 失敗 --> ErrHandle[Error Handler Middleware]
        
        ResSuccess --> Out((Response 出站))
        ErrHandle --> Out
    end
    
    Client -- HTTP Request --> In
    Out -- HTTP Response --> Client
```

## 生命週期階段概述

### 1. 請求進入 (Incoming Request)
*   當客戶端 (Web/Mobile) 發送請求 (GET/POST...) 到 API 埠口 (例如 3001)。
*   Node.js 建立 `req` (Request) 與 `res` (Response) 物件。

### 2. 全域中介軟體 (Global Middleware)
所有請求都會先經過這裡，通常處理基礎建設：
*   **CORS**：允許跨網域請求。
*   **Body Parser**：將傳入的 JSON 字串解析為 JavaScript 物件 (`req.body`)。
*   **Logger**：記錄請求來源與時間。

### 3. 路由與驗證 (Routing & Validation)
*   Express 根據 URL 路徑 (例如 `/api/users`) 找到對應的處理器。
*   **Auth Middleware**：檢查 Header 中的 Token (JWT)，確認使用者身分。如果未通過，直接回傳 401，**中斷後續流程**。

### 4. 控制器與商業邏輯 (Controller & Service)
這是 API 的核心大腦：
*   **Controller**：接收參數，呼叫 Service，處理 HTTP 狀態碼。
*   **Service**：執行核心邏輯，操作資料庫 (Prisma/Drizzle/TypeORM)。
*   **Database**：實際存取資料。

### 5. 回應或錯誤處理 (Response or Error)
*   **Happy Path**：執行成功，呼叫 `res.json({ data: ... })` 回傳 200 OK。一旦呼叫 `res.send/json`，週期結束。
*   **Error Path**：如果在上述任一步驟發生錯誤 (`throw err` 或 `next(err)`)，流程會跳過所有後續的正常 Middleware，直接進入 **Error Handling Middleware** (通常定義在 `app.js` 最底部)。
