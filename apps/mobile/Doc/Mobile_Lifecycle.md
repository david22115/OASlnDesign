# React Native (Mobile) 生命周期流程圖

針對 React Native 行動應用程式 (`apps/mobile`)，其生命週期包含 **React 元件生命週期** 與 **App 應用程式狀態 (AppState)** 兩個層面。

## 流程圖

```mermaid
graph TD
    subgraph App_State [應用程式狀態 (Native)]
        Launch((開啟 App)) --> Active[Active (前台執行)]
        Active -- 按下 Home 鍵 --> Background[Background (後台執行)]
        Background -- 再次開啟 --> Active
        Background -- 系統殺除/關閉 --> Inactive[Inactive / Terminated]
    end

    subgraph Component_Lifecycle [React Native 元件生命週期]
        Active --> Mount((元件掛載))
        
        Mount --> Render[Render (繪製 UI)]
        Render --> Layout[Layout (Native 排版)]
        Layout --> Paint[Paint (顯示於螢幕)]
        Paint --> Effect[useEffect (副作用 & 資料與 API)]
        
        Effect --> Wait{等待事件}
        
        Wait -- 使用者操作/資料更新 --> ReRender[Re-Render (更新)]
        ReRender --> Diff[Diffing (比對差異)]
        Diff --> NativeUpdate[Native UI 更新]
        
        Wait -- 頁面切換 --> Unmount((元件卸載))
        Unmount --> Cleanup[Cleanup Function]
        Cleanup --> Bestroy[移除 Native View]
    end
    
    %% 關聯應用程式狀態與元件
    Active -.-> Mount
    Background -.-> Wait
```

## 生命週期階段概述

### 1. 應用程式層級 (App State)
這一層級管理整個 App 與作業系統的互動：
*   **Active**：App 在前台，使用者正在互動。
*   **Background**：使用者按下 Home 鍵或切換到其他 App，但 App 仍在記憶體中執行（程式碼仍可運作，但 UI 停止繪製）。
*   **Inactive**：過渡狀態，或 iOS 的通知中心拉下時。

### 2. 元件層級 (React Component)
React Native 的元件生命週期與 Web 版 React 90% 相似，主要差異在於**渲染目標是 Native Views 而不是 DOM**。

#### A. 掛載 (Mounting)
*   **Render**：React 執行元件邏輯，產生虛擬樹 (Virtual Tree)。
*   **Communication**：透過 Bridge (或 JSI) 將指令傳送給 Native 端。
*   **Native Layout & Paint**：由 Yoga 引擎計算 Flexbox排版，並由 iOS/Android 系統繪製真實 View。
*   **useEffect**：畫面出現後執行，適合發送 API 請求或訂閱 Event Emitter。

#### B. 更新 (Updating)
*   當 `props`、`state` 改變時觸發。
*   React 計算出最小差異，只更新變動的 Native 屬性 (SetNativeProps)，效能通常很高。

#### C. 卸載 (Unmounting)
*   當堆疊導航 (Stack Navigator) Pop 回上一頁時，目前的頁面元件會被卸載。
*   **重要**：如果不手動清除 Timer 或 Event Listener，這時候會導致記憶體洩漏 (Memory Leak) 甚至崩潰。

### 3. 特殊差異 (Web vs Native)
*   **沒有 DOM**：不能使用 `document.getElementById`。
*   **導航保留**：使用 Stack Navigation 時，推入新頁面，**舊頁面不會卸載 (Unmount)**，只是保持在背景。這與 Web 路由切換時舊頁面通常會卸載不同。需留意 `useFocusEffect` 來處理頁面重獲焦點的邏輯。
