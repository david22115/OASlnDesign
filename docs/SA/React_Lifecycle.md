# React / Next.js 生命週期流程圖

針對 Web App (Next.js App Router) 的 React 生命週期，這裡為您整理了詳細的流程圖與概述。

由於使用了 **Next.js (App Router)**，React 的生命週期現在分為 **「伺服器端 (Server)」** 與 **「客戶端 (Client)」** 兩個階段，這比傳統純前端的 React 生命週期更為複雜且強大。

## 流程圖

```mermaid
graph TD
    subgraph Server_Side [伺服器端(Next.js)]
        A[接收 HTTP請求] --> B{Server Component}
        B -- 是 --> C[伺服器端渲染(RSC)]
        C --> D[產生HTML&RSCPayload]
        B -- 否(Client Component) --> E[標記為 Client Component 參照]
        D --> F[串流傳輸(Streaming)至Client]
        E --> F
    end

    subgraph Client_Side [客戶端 (瀏覽器)]
        F --> G[接收HTML(使用者先看到內容)]
        G --> H[載入JSBundle]
        H --> I{Hydration(注水)}
        I --> J[React 接手並綁定事件]
        
        subgraph React_Lifecycle [React 元件生命週期]
            K((Mounting 階段)) --> L[元件函式執行]
            L --> M[DOM 更新]
            M --> N[useEffect (初始化)]
            
            N --> O{等待更新}
            
            O -- "Props/State 改變" --> P((Updating 階段))
            P --> Q[元件函式重新執行]
            Q --> R[DOM Diff & 更新]
            R --> S[useEffect Cleanup (前次)]
            S --> T[useEffect (本次)]
            
            O -- "元件移除" --> U((Unmounting 階段))
            U --> V[useEffect Cleanup (最終清理)]
            V --> W[移除 DOM]
        end
    end
```

## 生命週期階段概述

在 Next.js 的架構下，我將生命週期分為三個主要維度來說明：

### 1. 伺服器渲染與傳輸 (Server Phase & Hydration)
這是使用者「看到」網頁的第一步，也是 Next.js 最強大的地方。
*   **Server Component (預設)**：在伺服器上直接執行，邏輯（如資料庫與 API 呼叫）跑完後，只回傳純 HTML 給瀏覽器。**它們沒有傳統的 React 生命週期 (無 useState/useEffect)**。
*   **HTML 傳輸**：瀏覽器先收到 HTML，使用者立刻看到畫面（但此時還不能互動）。
*   **Hydration (注水)**：瀏覽器下載 JavaScript，React 開始執行並「附著」到現有的 HTML 上，讓按鈕、表單等可互動化。

### 2. 客戶端：掛載階段 (Mounting)
當頁面進入 Client Component (標記為 `use client`) 後，傳統 React 生命週期開始運作：
*   **Render**：React 執行元件函式 (Function Component)。
*   **Commit**：React 將元素畫到 DOM 上。
*   **Effect**：執行 `useEffect(() => { ... }, [])`。這是發送 API 請求或訂閱事件的時機。

### 3. 客戶端：更新階段 (Updating)
當使用者的操作導致資料改變時：
*   **Trigger**：`useState` 的 `setState` 被呼叫，或父元件傳入新的 `props`。
*   **Render**：React 再次執行元件函式，產生新的 Virtual DOM。
*   **Reconciliation & Commit**：比較新舊差異 (Diffing)，只更新變動的真實 DOM。
*   **Effect Cleanup & Effect**：
    1.  先執行**上一次** `useEffect` 回傳的清理函式 (Cleanup function)。
    2.  再執行**這一次**的 `useEffect` (若依賴陣列 `dependencies` 有變動)。

### 4. 客戶端：卸載階段 (Unmounting)
當元件從畫面消失（例如切換頁面）：
*   **Cleanup**：執行 `useEffect` 回傳的 **Cleanup function** (例如：`return () => clearInterval(timer)` )。
*   **Remove**：元件從 DOM 中完全移除。

## 路由系統與檔案共存 (Routing & Colocation)

Next.js App Router 採用 **檔案系統路由 (File-system based Routing)**，資料夾結構即為網址路徑。

### 核心規則
*   **路由定義**：資料夾名稱決定 URL 路徑 (e.g., `app/about/` -> `/about`)。
*   **公開入口**：只有名為 `page.tsx` 的檔案會被視為該路由的頁面內容。
*   **檔案共存 (Colocation)**：
    *   在路由資料夾下的**其他 `.tsx` 檔案**（如 `Button.tsx`, `Header.tsx`）**不會**被視為路由。
    *   這允許開發者將特定頁面專屬的元件直接放在該頁面的資料夾中，方便管理。
    *   即使是第一層目錄 (`app/`)，只要檔案名稱不是 `page.tsx`，就不會變成公開頁面。
