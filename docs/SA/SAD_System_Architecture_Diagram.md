# 系統架構圖 (System Architecture Diagram)
**文件版本**：v1.2 | **日期**：2026-04-08 | **狀態**：✅ 架構師確認 / ✅ SA + SE 審核通過

---

## 一、全系統架構全覽 (C4 Level 1: System Context)

```mermaid
graph TD
    User["👤 企業員工 / 主管 / ADMIN\n (Browser / Mobile App)"]
    External["🏢 大廠雲端生態圈\n Google Workspace / M365\n Slack / Zoom"]
    Firebase["🔥 Firebase Cloud Messaging\n (推播服務)"]
    HR["🏢 內部/舊版系統\n BPM簽核 / HR考勤 / ERP"]
    IdP["🔐 Identity Provider\n Keycloak / Azure AD / LDAP"]

    OASystem["🏗️ 企業 OA 系統\n (Workflow Hub 控制中樞)"]

    User -- "Web / App (JIT 授權存取)" --> External
    User -- "Web Browser / App" --> OASystem
    OASystem -- "OAuth2 / OIDC" --> IdP
    OASystem -- "Webhook / REST API (動態權限派發)" --> External
    OASystem -- "FCM Admin SDK" --> Firebase
    OASystem -- "REST API" --> HR
    Firebase -- "Push Notification" --> User
    External -- "Webhook Callback / 狀態同步" --> OASystem
```

---

## 二、應用層架構圖 (C4 Level 2: Container Diagram)

```mermaid
graph TD
    subgraph Client["用戶端 (Client Tier)"]
        Portal["🌐 Web Portal\n apps/portal\n Next.js / React\n (EIP 前台)"]
        Admin["🛠️ Admin Center\n apps/admin\n Next.js / React\n (後台管理)"]
        Mobile["📱 Mobile App\n apps/mobile\n React Native / Expo"]
    end

    subgraph BFF["服務層 (BFF / API Gateway)"]
        API["⚙️ BFF API Server\n apps/api\n Express / NestJS\n Port: 3001"]
        WS["🔌 WebSocket Gateway\n 即時通訊中心"]
        RateLimit["🛡️ Rate Limiter\n (express-rate-limit)"]
        AuthMiddleware["🔑 Auth Middleware\n JWT 驗證 + 黑名單查 Redis"]
    end

    subgraph Core["核心基礎設施"]
        PostgreSQL[("🐘 PostgreSQL\n 主要資料庫")]
        DynamicRepo[("📄 JSONB 引擎\n 動態表單庫")]
        Redis[("⚡ Redis\n 快取 / 黑名單 / Queue")]
        BullMQ["📬 BullMQ\n Message Queue"]
    end

    subgraph Workers["背景工作者 (Workers)"]
        TaskWorker["🔄 TaskSyncWorker\n BPM 同步"]
        ClockWorker["⏰ ClockInWorker\n 打卡拋轉 HR"]
        NotifyWorker["🔔 NotifyWorker\n Firebase 推播"]
        AuditWorker["📋 AuditWorker\n 稽核日誌寫入"]
    end

    subgraph AuditStore["稽核儲存"]
        Elasticsearch["🔍 Elasticsearch\n 稽核日誌中心"]
    end

    Web -- "HTTPS + CSP Headers" --> RateLimit
    Mobile -- "HTTPS + Bearer JWT" --> RateLimit
    Web -- "WSS (Secure WebSockets)" --> WS
    Mobile -- "WSS (Secure WebSockets)" --> WS
    RateLimit --> AuthMiddleware
    AuthMiddleware --> API
    WS -- "Token 驗證" --> AuthMiddleware

    API -- "Prisma ORM" --> PostgreSQL
    API -- "Prisma JSONB" --> DynamicRepo
    API -- "ioredis" --> Redis
    WS -- "Pub/Sub" --> Redis
    API -- "BullMQ Publish" --> BullMQ

    BullMQ --> TaskWorker
    BullMQ --> ClockWorker
    BullMQ --> NotifyWorker
    BullMQ --> AuditWorker
    AuditWorker --> Elasticsearch
```

---

## 三、身分認證與 SSO 流程 (Authentication Flow)

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Web as EIP Web Portal
    participant BFF as BFF API Server
    participant IdP as Identity Provider (Keycloak)
    participant Redis as Redis

    User->>Web: 點擊登入 (帳密 / OTP)
    Web->>IdP: 發送身分驗證請求 (OAuth 2.0)
    IdP-->>BFF: 回傳授權碼 (Auth Code)
    BFF->>IdP: 換取 Access + Refresh Token
    IdP-->>BFF: 回傳 JWT Token Pair
    BFF->>BFF: 簽發系統專屬 JWT (內含 uid, roles, deptId)
    BFF-->>Web: Set-Cookie: accessToken (HttpOnly + Secure + SameSite=Strict)
    Web->>BFF: GET /api/portal/apps (帶 Cookie)
    BFF->>Redis: 查詢 AccessPolicy 快取
    Redis-->>BFF: 回傳使用者有權限的應用清單
    BFF-->>Web: 回傳 Launchpad 應用清單
    Web-->>User: 渲染個人化 Launchpad 桌面
```

---

## 四、AccessPolicy Engine 運作流程 (權限引擎 + Redis + Audit)

```mermaid
sequenceDiagram
    participant BizAPI as 業務模組 API
    participant PolicyEngine as AccessPolicy Engine
    participant Redis as Redis Cache
    participant DB as PostgreSQL
    participant MQ as BullMQ
    participant ES as Elasticsearch

    BizAPI->>PolicyEngine: CheckPermission(userId, 'DOWNLOAD', 'Document_X')
    PolicyEngine->>Redis: GET policy_cache:{userId}:DOCUMENT

    alt Cache HIT
        Redis-->>PolicyEngine: 回傳可存取 Resource ID 清單
    else Cache MISS
        PolicyEngine->>DB: SELECT AccessPolicy WHERE grantedUserId/RoleId/DeptId
        DB-->>PolicyEngine: 回傳 Policy 清單
        PolicyEngine->>Redis: SET policy_cache:{userId}:DOCUMENT (TTL: 10min)
    end

    alt 無存取權限 (DENY / 不在清單)
        PolicyEngine-->>BizAPI: FALSE → 403 Forbidden
    else 有存取權限 (ALLOW)
        PolicyEngine--)MQ: [非同步] Publish AuditEvent {employeeId, action, resourceId, ip}
        MQ--)ES: AuditWorker 寫入 Elasticsearch
        PolicyEngine-->>BizAPI: TRUE → 繼續業務邏輯
    end
```

---

## 五、打卡流程 (差勤 + EDA 非同步拋轉)

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant BFF as BFF API
    participant DB as PostgreSQL
    participant MQ as BullMQ
    participant Worker as ClockInWorker
    participant HR as HR 考勤系統

    App->>App: 偵測 GPS / SSID / 防弊檢查
    App->>BFF: POST /api/attendance/clock-in {gps, ssid, deviceIp}
    BFF->>BFF: 驗證 GPS 地理圍欄 / SSID 白名單

    alt 驗證失敗
        BFF-->>App: 400 / 禁止打卡
    else 驗證通過
        BFF->>DB: INSERT ClockInRecord (syncStatus: PENDING)
        BFF--)MQ: Publish ClockInEvent
        BFF-->>App: 200 打卡成功 ✅ (即時回應)
    end

    MQ--)Worker: 消費 ClockInEvent
    Worker->>HR: POST 拋轉打卡資料
    alt HR 系統正常
        HR-->>Worker: 200 OK
        Worker->>DB: UPDATE syncStatus = 'SYNCED'
    else HR 系統異常
        Worker->>Worker: Retry (最多 5 次，指數退避)
        Worker->>DB: UPDATE syncStatus = 'FAILED' (通知 ADMIN)
    end
```

---

## 六、文件上傳流程 (S3 Pre-signed URL 兩段式直傳)

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Web as Web Portal
    participant BFF as BFF API
    participant PolicyEngine as AccessPolicy Engine
    participant S3 as AWS S3
    participant DB as PostgreSQL

    User->>Web: 選擇檔案，點擊上傳
    Web->>BFF: POST /api/documents/upload/presigned-url {fileName, size, mimeType}
    BFF->>PolicyEngine: CheckPermission(userId, 'WRITE', folderId)
    PolicyEngine-->>BFF: TRUE

    BFF->>S3: 產生 Pre-signed PUT URL (TTL: 5min)
    S3-->>BFF: uploadUrl + s3ObjectKey
    BFF-->>Web: { uploadUrl, s3ObjectKey, expiresIn: 300 }

    Web->>S3: PUT 直傳檔案至 S3 (不經過 BFF)
    S3-->>Web: 上傳成功

    Web->>BFF: POST /api/documents/upload/callback { s3ObjectKey, documentItemId }
    BFF->>DB: INSERT DocumentVersion (versionNumber++, isCurrent: true)
    BFF-->>Web: 上傳完成，回傳新版本資訊
```

---

## 七、零信任安全層次架構 (Zero-Trust Security Layers)

```mermaid
graph TD
    subgraph L1["第一層：網路邊界防護"]
        WAF["🛡️ WAF\n (OWASP Top 10 防護)"]
        RateLimit["⏱️ Rate Limiting\n (DDoS / Brute-force)"]
        TLS["🔒 TLS 1.3\n (全端強制 HTTPS)"]
    end

    subgraph L2["第二層：身份與存取控制"]
        IdP["🔑 IdP (Keycloak/AD)\n MFA 強制驗證"]
        JWT["📜 JWT + Redis 黑名單\n Token 即時撤銷"]
        mTLS["🔐 mTLS / M2M Token\n 內網微服務間驗證"]
    end

    subgraph L3["第三層：資料層防護"]
        KMS["🗝️ KMS 應用層加密\n PII 欄位 (身份證/薪資)"]
        SoftDelete["🗄️ 軟刪除\n deletedAt 保全稽核軌跡"]
        OptLock["🔒 樂觀鎖\n @version 防並發覆寫"]
    end

    subgraph L4["第四層：客戶端防護"]
        Cookie["🍪 HttpOnly + Secure\n + SameSite=Strict Cookie"]
        CSP["📋 Content Security Policy\n XSS / CSRF 防護"]
        SecureStore["📱 Secure Storage\n Mobile Token 加密存放"]
    end

    subgraph L5["第五層：稽核與監控"]
        AuditLog["📝 SystemAuditLog\n 全操作稽核"]
        ES["🔍 Elasticsearch\n 集中日誌分析"]
        Alert["🚨 異常告警\n 非工時大量存取觸發通知"]
    end

    L1 --> L2 --> L3 --> L4
    L1 --> L5
    L2 --> L5
    L3 --> L5
```

---

## 八、資料庫 Schema 關聯圖 (ER Diagram)

```mermaid
erDiagram
    User {
        String id PK
        String employeeId UK
        String email UK
        String authProvider
        String deviceUuid
        Boolean mfaEnabled
        DateTime deletedAt
    }

    Department {
        String id PK
        String name
        String parentId FK
    }

    AccessPolicy {
        String id PK
        String resourceType
        String resourceId
        String action
        String grantedUserId FK
        String grantedRoleId
        String grantedDeptId FK
        String effect
    }

    ClockInRecord {
        String id PK
        String employeeId FK
        String clockType
        Float gpsLatitude
        Float gpsLongitude
        String wifiSsid
        Boolean isVerified
        String syncStatus
        DateTime deletedAt
    }

    Announcement {
        String id PK
        String title
        String content
        String authorId FK
        Boolean isMustRead
        DateTime expiredAt
        DateTime deletedAt
    }

    AnnouncementReadLog {
        String id PK
        String announcementId FK
        String employeeId FK
        DateTime readAt
    }

    ResourceBooking {
        String id PK
        String resourceId FK
        String organizerId FK
        DateTime startTime
        DateTime endTime
        Int version
        DateTime deletedAt
    }

    DocumentItem {
        String id PK
        String name
        String type
        String parentId FK
        String ownerId FK
        DateTime deletedAt
    }

    DocumentVersion {
        String id PK
        String documentItemId FK
        Int versionNumber
        String s3ObjectKey
        BigInt sizeBytes
        Boolean isCurrent
    }

    SystemAuditLog {
        String id PK
        String employeeId FK
        String action
        String resourceType
        String resourceId
        String clientIp
        DateTime createdAt
    }

    DynamicTableDef {
        String id PK
        String tableName
        Json schema
        String createdBy
    }

    DynamicRecord {
        String id PK
        String tableId FK
        Json data
        String createdBy
    }

    IntegrationCredential {
        String id PK
        String employeeId FK
        String provider
        String externalUserId
        String accessToken
        String refreshToken
        DateTime expiresAt
    }

    ThirdPartyResourceMap {
        String id PK
        String resourceType
        String internalId
        String externalId
        String provider
    }

    User ||--o{ ClockInRecord : "打卡紀錄"
    User ||--o{ AnnouncementReadLog : "已讀公告"
    User ||--o{ ResourceBooking : "建立預約"
    User ||--o{ DocumentItem : "擁有文件"
    User ||--o{ IntegrationCredential : "綁定外部授權"
    Announcement ||--o{ AnnouncementReadLog : "包含"
    DocumentItem ||--o{ DocumentVersion : "版本歷史"
    Department ||--o{ User : "隸屬"
    Department |o--o{ Department : "子部門"
    DocumentItem |o--o{ DocumentItem : "子項目"
    DynamicTableDef ||--o{ DynamicRecord : "動態紀錄"
```

---

## 九、部署架構圖 (Deployment Architecture)

```mermaid
graph TD
    subgraph PublicZone["公共網路 (Public Zone)"]
        CDN["🌍 CDN / WAF\n (CloudFront / Cloudflare)"]
        Nginx["🔀 Nginx Reverse Proxy\n (TLS Termination)"]
    end

    subgraph AppZone["應用層 (App Zone)"]
        WebServer["🌐 Next.js Web Server\n Docker Container"]
        APIServer["⚙️ BFF API Server\n Docker Container (HPA)\n [防禦: Circuit Breaker]"]
        WorkerServer["🔄 BullMQ Workers\n Docker Container\n [防禦: Retry Queue]"]
    end

    subgraph DataZone["資料層 (Data Zone)"]
        PGPrimary[("🐘 PostgreSQL Primary")]
        PGReplica[("📖 PostgreSQL Replica (Read)")]
        PgBouncer["🔌 PgBouncer\n (Connection Pooling)"]
        RedisCluster["⚡ Redis Cluster"]
        ESCluster["🔍 Elasticsearch Cluster"]
    end

    subgraph ExternalSvc["外部服務"]
        S3["☁️ AWS S3"]
        Firebase["🔥 Firebase FCM"]
        KMS["🗝️ AWS KMS"]
        MeetAPI["📹 Google Meet / MS Teams API"]
    end

    CDN --> Nginx
    Nginx --> WebServer
    Nginx --> APIServer
    APIServer <--> PgBouncer
    APIServer <--> RedisCluster
    APIServer --> WorkerServer
    PgBouncer --> PGPrimary
    PgBouncer --> PGReplica
    WorkerServer --> ESCluster
    APIServer --> S3
    WorkerServer --> Firebase
    WorkerServer --> MeetAPI
    APIServer --> KMS
```

---

## 十、架構師 + SA + SE 聯合審核意見

> ✅ **架構師 (Architect) 確認**：
> - 微服務邊界清晰，BFF 聚合層有效降低前端複雜度
> - AccessPolicy Engine 的橫切設計確保低耦合擴充彈性
> - EDA (事件驅動) 架構解耦了高峰打卡的同步壓力

> ✅ **SA (系統分析師) 確認**：
> - 所有功能需求已完整對映到對應模組
> - 資料模型設計符合業務邏輯，關聯完整無循環依賴
> - Non-functional requirements (效能、資安、法規) 在架構層面均有具體對應機制

> ✅ **資深 SE (軟體工程師) 確認**：
> - 技術選型成熟 (PostgreSQL + Prisma + BullMQ + Redis) 社群活躍，開發友善
> - Monorepo (Turborepo) 架構使 packages/database Schema 可跨 apps 共享，減少重複程式碼
> - ⚠️ **風險提示**：Elasticsearch 的初期維運成本較高，建議 Phase 1 先以 SystemAuditLog 在 PostgreSQL 落地，Phase 2 再引入 Elasticsearch 遷移
> - ⚠️ **風險提示**：微前端 (Webpack Module Federation) 的版本相依管理較複雜，建議待子系統穩定後再啟動此項整合
