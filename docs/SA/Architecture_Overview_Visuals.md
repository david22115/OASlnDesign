# 企業 OA 系統架構總覽 (Visual Architecture Overview)

**文件版本**：v1.0 | **編撰日期**：2026-04-13 | **核心精神**：整合大廠生態 (Hub & Spoke)、零信任控制、彈性微服務

本文件旨在透過高階圖解，向利害關係人（高階主管、架構師、開發團隊）清晰展示本系統的核心運作邊界與實體架構。

---

## 1. 服務架構 (Service Architecture)

> **設計核心**：本系統不盲目自建底層服務，而是將自身定位為 **「 Workflow Hub (流程中樞) 與權限大腦」**。我們將資料儲存、繁重即時通訊的苦差事外包給微軟 (M365) 與 Google，但牢牢握住**資料的最終控制閥 (Access Policy)**。

```mermaid
graph TD
    %% 節點定義
    subgraph ClientLayer ["使用者存取層"]
        User["👤 企業員工 / 主管"]
        Device["📱 網頁 / 行動裝置\n(具備 JIT 授權)"]
    end

    subgraph OAHUB ["👑 OA Workflow Hub (本系統)"]
        Portal["🌐 EIP 前台入口\n(資訊聚合/單一登入)"]
        PolicyEngine["🛡️ AccessPolicy 權限大腦\n(動態白名單審核)"]
        Automation["⚙️ 流程自動化引擎\n(BPM 轉發 / 事件通知)"]
    end

    subgraph SaaS ["🌍 外部大廠雲端生態"]
        GWS["📝 Google Workspace\n(共編文件 / Meet)"]
        M365["📊 Microsoft 365\n(SharePoint / Teams)"]
        Slack["💬 企業溝通\n(Slack / Line)"]
    end

    subgraph Legacy ["🏢 企業內部遺留系統"]
        ERP["💰 鼎新/SAP ERP"]
        HR["⏰ 考勤與人資系統"]
    end

    %% 連線定義
    User -->|"登入互動"| Device
    Device -->|"安全連線"| Portal
    Portal --> PolicyEngine
    PolicyEngine -->|"審核通過 → 觸發動作"| Automation

    Automation -- "Webhook / 互動卡片" --> Slack
    Automation -- "API 代理與動態加入白名單" --> GWS
    Automation -- "API 代理與動態加入白名單" --> M365
    Automation -- "REST API 同步" --> ERP
    Automation -- "打卡拋轉" --> HR

    Slack -- "卡片按鈕 Callback 回傳" --> Automation
```

*   **價值體現**：當員工要開啟一份檔案，OA 大腦 (`PolicyEngine`) 攔截請求，確認其職級符號後，呼叫 Google API 將該員暫時加入檔案白名單，實現**以 OA 紀律管控外部工具**。

---

## 2. 基礎系統架構 (Infrastructure Architecture)

> **設計核心**：高度防禦性與容錯機制。為防止外部 SaaS 大廠 API 發生 Outage (服務中斷) 拖垮我們的系統，基礎架構內建了**斷路器 (Circuit Breaker)** 與**非同步備援隊列 (Fallback Retry)**。

```mermaid
graph TD
    %% 邊界與負載平衡
    CDN["🌍 CDN 節點 (CloudFront / Cloudflare)\n攔截靜態資源與前端 Bundle"]
    WAF["🛡️ 網路應用防火牆 (WAF)"]

    subgraph K8S ["應用服務叢集 (Docker / K8s)"]
        NextJS["🌐 SSR 伺服器\n(Portal / Admin)"]
        BFF["⚙️ BFF API Server\n(包含 Circuit Breaker 斷路防護)"]
        Workers["🔄 BullMQ 背景工作者\n(重試機制與退避策略)"]
    end

    subgraph DataTier ["內部持久化與快取層"]
        PGPrimary[("🐘 PostgreSQL (Primary)\n關聯式引擎 + JSONB 表單")]
        PGBouncer["🔌 PgBouncer\n連線池收斂"]
        RedisCluster[("⚡ Redis Cluster\n(Token黑名單 / 權限快取)")]
        LocalFallback[("📦 本機容錯暫存池\n(大廠斷線時的備援儲存)")]
    end

    subgraph ExternalAPI ["外部 SaaS 介接"]
        GraphAPI["🔗 MS Graph / Google APIs"]
        Firebase["🔔 Firebase FCM"]
    end

    %% 架構流向
    CDN --> WAF
    WAF --> NextJS
    WAF -->|API Request| BFF

    NextJS --> BFF
    BFF <--> RedisCluster
    BFF --> PGBouncer
    PGBouncer --> PGPrimary

    %% 防禦與備援機制
    BFF -. "發布非同步事件" .-> Workers
    Workers -->|"寫入日誌與狀態"| PGBouncer
    BFF == "1. API 呼叫" ==> GraphAPI
    GraphAPI -. "2. 發生 429 或 Timeout" .- BFF
    BFF == "3. 觸發斷路器，降級存入" ==> LocalFallback
    Workers == "4. 網路恢復後非同步補傳" ==> GraphAPI
```

*   **價值體現**：系統即便遭遇微軟全域大當機，員工依舊能順利打卡登入（因為身分驗證在 BFF 與緩存內），需上傳的文件會優雅降級存入 `LocalFallback` 暫存，不影響業務中斷。

---

## 3. 模組架構 (Module / Monorepo Architecture)

> **設計核心**：採用 `Turborepo` 單體化多儲存庫（Monorepo），實體拆分關注點。**所有企業獨有邏輯皆封裝於 BFF 模組中**。共有 10+ 大邏輯模組相互支撐。

```mermaid
flowchart TB
    subgraph Repo["📦 my-fullstack-project (Turborepo)"]
        
        subgraph Apps ["Apps (終端應用層)"]
            AppPortal["💻 apps/portal\n(員工前台 Next.js)"]
            AppAdmin["💻 apps/admin\n(管理後台 Next.js)"]
            AppMobile["📱 apps/mobile\n(行動打卡 React Native)"]
        end

        subgraph CoreAPI ["API (服務聚合與業務邏輯層)"]
            BFFGateway["⚙️ apps/api (BFF)"]
            
            subgraph Modules ["🔟 核心邏輯模組"]
                Auth["一、單一入口與認證"]
                Policy["二、全域存取控制引擎\n(核心樞紐)"]
                BPM["三、電子簽核整合"]
                Attendance["四、差勤打卡"]
                Bulletin["五、企業公告"]
                Resource["六、資源預約"]
                DocFed["七、文件聯邦"]
                DynamicAdmin["八、動態後端中樞\n(JSONB 驅動)"]
                IntegrationHub["九、企業整合中樞\n(Token 與 Webhook)"]
                Shared["十二、共用派發服務"]
            end
        end

        subgraph Packages ["Packages (共用基建層)"]
            DB["🗃️ @repo/database\n(Prisma Schema)"]
            Types["📘 @repo/shared-types"]
            UI["🎨 @repo/ui-configs"]
        end
    end

    %% 關聯依賴
    AppPortal ==> BFFGateway
    AppAdmin ==> BFFGateway
    AppMobile ==> BFFGateway

    BFFGateway -. "存取" .-> Auth & Policy & BPM & Attendance & Bulletin & Resource & DocFed & DynamicAdmin & IntegrationHub & Shared
    
    %% 強制經過 Policy
    DocFed -->|檢查再放行| Policy
    Bulletin -->|綁定| Policy
    
    %% 套件依賴
    BFFGateway ===> DB & Types
    AppPortal ===> UI & Types
    AppAdmin ===> UI & Types
```

*   **價值體現**：前端 (`portal` / `admin`) 是純粹的「視覺展示層」，沒有任何商業機密。所有「誰能看到什麼」、與「表單動態串接」的複雜邏輯均在 `apps/api` 的九大模組內處理，底層共用 `@repo/database` 以確保前後端的 TypeScript 型別擁有 100% 絕對的一致性（Type-Safe）。
