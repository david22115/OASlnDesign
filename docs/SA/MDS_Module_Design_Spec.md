# 模組設計明細 (Module Design Specification)
**文件版本**：v1.2 | **日期**：2026-04-08 | **狀態**：✅ SA 架構師確認 / ✅ 資深 SE 可行性審核通過

---

## 一、整體模組架構概覽

本系統採 **Turborepo Monorepo** 架構，分為三層端面及四個共用套件：

```
my-fullstack-project/
├── apps/
│   ├── portal/       → 前台 EIP 入口端 (Next.js / React)
│   ├── admin/        → 後台管理中樞端 (Next.js / React)
│   ├── mobile/       → 企業行動 App (React Native / Expo)
│   └── api/          → BFF / API Gateway (Express / Node.js)
└── packages/
    ├── database/     → PostgreSQL + Prisma Schema (共用)
    ├── shared-types/ → TypeScript 型別定義 (共用)
    ├── ui-configs/   → 設計系統、UI Token (共用)
    └── utils/        → 工具函式 (共用)
```

---

## 二、模組一：單一入口與認證模組 (EIP Portal / Auth)

### 2.1 模組邊界與職責

| 子模組 | 所屬端 | 職責 |
|--------|-------|------|
| `AuthService` | API | JWT 簽發、驗證、黑名單管理 (Redis) |
| `IdPAdapter` | API | 對接 Keycloak / Azure AD / LDAP，標準化 OAuth 2.0 / OIDC 流 |
| `LaunchpadService` | API | 查詢使用者授權的子系統清單，整合 AccessPolicy Engine |
| `RedirectGateway` | API | 處理子系統跳轉邏輯（OIDC 授權碼、Token 換發、Legacy 代填） |
| `LaunchpadUI` | Web | 動態渲染有權限的應用圖示 (Grid/List)，支援拖曳排序 |
| `AuthScreen` | Mobile | 登入頁 (帳密/OTP/QR Code)，Token 存入 Secure Storage |

### 2.2 核心技術決策

- **JWT 存放**：Web 使用 `HttpOnly + Secure + SameSite=Strict` Cookie；Mobile 使用 `expo-secure-store`。
- **Token 黑名單**：Redis `SET blacklist:{jti}` with TTL = Token 剩餘效期。
- **微前端整合**：子系統如為 React/Vue，透過 **Webpack Module Federation** 動態載入 Remote Component，避免白屏割裂感。
- **Rate Limiting**：登入端點最敏感，設定每 IP 每分鐘最多 10 次嘗試 (429 Too Many Requests)。

### 2.3 關鍵資料表

```prisma
model User {
  id            String   @id @default(uuid())
  employeeId    String   @unique
  email         String   @unique
  authProvider  String   // 'LOCAL' | 'LDAP' | 'OIDC'
  deviceUuid    String?  // KIOSK/訪客裝置綁定
  mfaEnabled    Boolean  @default(false)
  createdAt     DateTime @default(now())
  deletedAt     DateTime?
}

model RefreshToken {
  id         String   @id @default(uuid())
  userId     String
  tokenHash  String   // 儲存 hash，不儲存原文
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}
```

---

## 三、模組二：全域存取控制引擎 (AccessPolicy Engine)

### 3.1 模組職責

此模組是全系統最重要的**橫切關注點 (Cross-cutting Concern)**，與所有業務模組完全解耦。
- **核心原則**：任何業務模組不自行維護「誰可以看什麼」的判斷邏輯。
- **驗證介面**：提供兩種標準查詢 API (`Pre-filter 清單模式` / `Post-check 單筆模式`)。
- **效能保障**：Redis 快取使用者權限清單 (TTL: 10 分鐘)，防止 N+1 問題。
- **稽核截流**：所有 `Allow` 判定自動非同步推送 Audit Event 至 Message Queue。

### 3.2 決策流程

```
請求進入 → 查 Redis 快取 (cache hit?) 
       → 命中: 直接回傳 Resource ID 清單
       → 未命中: 查 PostgreSQL AccessPolicy 表 → 寫入 Redis → 回傳
       → 若判定 ALLOW → 非同步推送 AuditEvent 至 BullMQ → Elasticsearch
```

### 3.3 核心資料表

```prisma
enum ResourceType {
  ANNOUNCEMENT
  DOCUMENT
  BPM_FORM
  MEETING_ROOM
  WIDGET
}

model AccessPolicy {
  id             String       @id @default(uuid())
  resourceType   ResourceType
  resourceId     String       // '*' 表示全類別
  action         String       // 'READ' | 'WRITE' | 'DELETE' | 'DOWNLOAD'
  grantedUserId  String?
  grantedRoleId  String?
  grantedDeptId  String?
  effect         String       // 'ALLOW' | 'DENY' (Deny 優先)
  createdAt      DateTime     @default(now())
}

model SystemAuditLog {
  id           String   @id @default(uuid())
  employeeId   String
  action       String
  resourceType String
  resourceId   String
  clientIp     String?
  userAgent    String?
  createdAt    DateTime @default(now())
}
```

---

## 四、模組三：電子簽核整合模組 (BPM Integration)

### 4.1 模組職責與邊界
本系統**不自建**簽核流程引擎，僅作為「BPM 外圍整合層」：
- 快取 BPM 的待辦清單，並提供 Widget 顯示
- 負責 Firebase 推播的派發層
- 透過 Message Queue 處理催辦的非同步觸發

### 4.2 EDA 訊息流設計

| 事件名稱 | 觸發條件 | Queue 消費者 | 最終動作 |
|---------|---------|------------|---------|
| `BpmTaskUpdated` | BPM Webhook 通知狀態變更 | `TaskSyncWorker` | 更新本地 `BpmTaskCache`，推送 SSE 事件 |
| `PokeSentEvent` | 員工點擊「催辦」 | `NotifyWorker` | 查詢主管 FCM Token，呼叫 Firebase 推播 |

### 4.3 核心資料表

```prisma
model BpmTaskCache {
  id             String   @id @default(uuid())
  employeeId     String
  externalTaskId String
  title          String
  status         String   // 'PENDING' | 'APPROVED' | 'REJECTED'
  systemSource   String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
}

model PokeRecord {
  id             String   @id @default(uuid())
  fromEmployeeId String
  toEmployeeId   String
  externalTaskId String
  pokedAt        DateTime @default(now())
}
```

---

## 五、模組四：差勤打卡模組 (Attendance)

### 5.1 模組職責
本系統作為「打卡終端採集器 + 非同步拋轉橋接層」，不處理排班/考勤計算。

### 5.2 打卡驗證分層設計

| 驗證層 | 端別 | 驗證內容 |
|--------|-----|---------|
| 第一層：環境採集 | Mobile App | 讀取 GPS 座標、Wi-Fi SSID、設備狀態 |
| 第二層：防弊偵測 | Mobile App | Mock Location / Jailbreak / Root 偵測 |
| 第三層：後端驗證 | BFF API | IP 範圍、GPS Geofencing、SSID 白名單核驗 |
| 第四層：離線容錯 | Mobile App + API | RSA 私鑰對時間戳簽章，離線暫存 SQLite，上線後驗章上傳 |

### 5.3 非同步拋轉流

```
打卡通過驗證 → 寫入 ClockInRecord (sync: PENDING)
             → 發布 ClockInEvent 至 BullMQ Queue
             → 即時回傳員工「打卡成功」
                      ↓ (非同步)
             Worker 消費事件 → 呼叫 HR 系統 API
             → 成功: 更新 syncStatus = 'SYNCED'
             → 失敗: 自動 Retry (最多 5 次) → 失敗後標記 'FAILED' 並通知 ADMIN
```

### 5.4 核心資料表

```prisma
model ClockInRecord {
  id           String   @id @default(uuid())
  employeeId   String
  clockType    String   // 'WEB' | 'APP' | 'OFFLINE_SYNC'
  deviceIp     String?
  gpsLatitude  Float?
  gpsLongitude Float?
  wifiSsid     String?
  isVerified   Boolean
  syncStatus   String   // 'PENDING' | 'SYNCED' | 'FAILED'
  createdAt    DateTime @default(now())
  deletedAt    DateTime?
}
```

---

## 六、模組五：企業公告模組 (Bulletin Board)

### 6.1 模組職責
- 發布與管理公告（全公司/限定部門/角色）
- **權限管控完全委派**給 AccessPolicy Engine，不在自身 Schema 維護 `targetDepts` 等耦合欄位
- 追蹤必讀公告的閱讀狀態

### 6.2 核心資料表

```prisma
model Announcement {
  id          String                @id @default(uuid())
  title       String
  content     String                @db.Text
  authorId    String
  isMustRead  Boolean               @default(false)
  publishedAt DateTime              @default(now())
  expiredAt   DateTime?
  readLogs    AnnouncementReadLog[]
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  deletedAt   DateTime?
}

model AnnouncementReadLog {
  id             String       @id @default(uuid())
  announcementId String
  employeeId     String
  readAt         DateTime     @default(now())
  Announcement   Announcement @relation(fields: [announcementId], references: [id])
}
```

---

## 七、模組六：資源預約模組 (Resource Booking)

### 7.1 模組職責
視覺化呈現資源可用狀態，提供以 Transaction + 樂觀鎖保護的預約操作。

### 7.2 防 Double Booking 機制

```
送出預約請求
  → DB Transaction 開啟
  → 查詢 [startTime, endTime] 時段是否有 deletedAt IS NULL 且時間重疊的紀錄
  → 有重疊 → 回傳 409 Conflict
  → 無重疊 → INSERT booking record
  → Transaction Commit
  → 非同步推送行事曆邀請 (BullMQ)
```

**修改/取消預約 (樂觀鎖)**：
```prisma
// 更新時附帶 version，若被其他請求更新過，Prisma 回傳 0 筆更新 → API 回傳 409
updateMany({
  where: { id: bookingId, version: currentVersion },
  data:  { ..., version: { increment: 1 } }
})
```

---

## 八、模組七：文件管理模組 (Document Management)

### 8.1 模組職責
- 實作文件聯邦 (Document Federation)，透過 API 代理存取 Google Drive / SharePoint，發放大廠協作 URL。
- 【管控配套】動態權限派發 (JIT Provisioning)：存取前必須通過 OA AccessPolicy 審核，過關後以 Service Account 臨時將員工加入大廠白名單，離職/權限變更時同步撤銷，實現「 OA 主導之大廠權限管控」。
- 維護 OA 端樹狀資料夾中繼資料與大廠檔案 ID 的對映關係。

### 8.2 兩段式上傳流

```
前端 → POST /api/documents/upload/presigned-url (帶入檔名/大小)
BFF  → 呼叫 AWS SDK 產生帶簽名的直傳 URL (TTL: 5 分鐘)
前端 → 直接 PUT 到 S3 URL (不過 BFF)
前端 → POST /api/documents/upload/callback (通知BFF完成)
BFF  → 寫入 DocumentItem + DocumentVersion 至 DB
```

### 8.3 核心資料表

```prisma
model DocumentItem {
  id        String            @id @default(uuid())
  name      String
  type      String            // 'FOLDER' | 'FILE'
  parentId  String?
  ownerId   String
  versions  DocumentVersion[]
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
  deletedAt DateTime?
}

model DocumentVersion {
  id             String       @id @default(uuid())
  documentItemId String
  versionNumber  Int
  s3ObjectKey    String
  sizeBytes      BigInt
  uploadById     String
  isCurrent      Boolean      @default(true)
  createdAt      DateTime     @default(now())
  DocumentItem   DocumentItem @relation(fields: [documentItemId], references: [id])
}
```

---

## 九、模組八：動態後端中樞 (Dynamic Admin Central)

### 9.1 模組職責
- 作為「0 正規化」的表單引擎，讓業務單位能像操作 Excel/Airtable 一樣自訂表單欄位與流程。
- 提供動態的「表格清單」、「看板模式」等多維度視圖。
- 儲存高彈性且結構不固定的業務資料（如：非固定格式之請購單、問卷調查），以補足硬編碼 Schema 的僵化缺陷。

### 9.2 核心技術決策：JSONB 引擎
利用 PostgreSQL 強大的 `JSONB` 欄位型態，配合 GIN Index 索引，確保非結構化資料也能具備高效層級的過濾與全文搜索能力。動態欄位的「結構定義」與「實際資料」將被嚴謹地分開儲存。

### 9.3 核心資料表 (JSONB 驅動)

```prisma
model DynamicTableDef {
  id          String   @id @default(uuid())
  tableName   String   // 表單/表格名稱 (例如: "疫苗施打紀錄")
  description String?
  schema      Json     // 儲存欄位定義 (Name, Type, Constraints)
  createdBy   String   // 建立者
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  records     DynamicRecord[]
}

model DynamicRecord {
  id          String   @id @default(uuid())
  tableId     String
  data        Json     // 實際的無正規化紀錄資料 (Key-Value)
  createdBy   String   // 填寫者
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  DynamicTableDef DynamicTableDef @relation(fields: [tableId], references: [id])
  
  @@index([data(ops: JsonbPathOps)], type: Gin) // 支援 JSONB 內部內容高速搜尋
}
```

---

## 十、模組九：企業整合中樞 (Integration Hub)

### 10.1 模組職責
- 負責管理與各大廠 (Google Workspace, MS M365, Slack, Zoom) 之 API OAuth 2.0 授權與 Token 生命週期。
- 提供 Webhook Gateway，接收外部互動卡片 (Adaptive Cards) 回傳之簽核指令，並進行 HMAC 簽章驗證。
- **【管控配套】權限生命週期連動**：監聽員工停權、離職或角色降級事件，自動呼叫外部 API 回收大廠資源使用權，預防影子 IT 漏洞。

### 10.2 架構流
\`\`\`text
          [大廠服務] --(Webhook / API Callback)--> Integration Hub
                                                     | (驗證 HMAC 簽章)
Client -> BFF Server --(檢查 OA AccessPolicy)--> 取得大廠 Access Token 
                     --(呼叫大廠 API 執行操作)--> [大廠服務]
\`\`\`

### 10.3 核心資料表

```prisma
model IntegrationCredential {
  id             String   @id @default(uuid())
  employeeId     String   // 對應 OA 員工
  provider       String   // 'MS_GRAPH', 'GOOGLE_WORKSPACE', 'SLACK'
  externalUserId String   // 在大廠內的唯一識別碼
  accessToken    String   // 加密儲存
  refreshToken   String   // 加密儲存
  expiresAt      DateTime
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([employeeId, provider])
}

model ThirdPartyResourceMap {
  id               String   @id @default(uuid())
  resourceType     String   // 例如 'DOCUMENT', 'MEETING'
  internalId       String   // 對應 OA 內的資源 ID (如 DocumentItem ID)
  externalId       String   // 大廠的資源 ID (如 Google Drive File ID)
  provider         String
  createdAt        DateTime @default(now())
}
```

---

## 十一、模組十：系統後臺管理中樞 (Admin Control Center)

### 11.1 模組職責
- 提供管理者大屏儀表板 (Dashboard)。
- 作為全域 AccessPolicy Engine 的配置中心，管控各部門/角色的 CRUD 權限。
- 集中管理系統層級的資源 (會議室設定、人員匯入、稽核日誌調閱)。

### 11.2 技術實作
- **路由隔離**：所有的 `/api/admin/*` 路由必須在 BFF 層加上嚴格的 Role 檢查，非 `ADMIN` 角色禁止存取。
- **報表匯出**：結合 PostgreSQL 的彙整能力提供匯出機制，高消耗的報表查詢會交由 Worker 背景執行後寄送至 Admin 郵箱。

---

## 十二、跨模組共用服務 (Shared Services)

| 服務名稱 | 技術棧 | 職責 |
|---------|--------|------|
| `NotificationService` | Firebase Admin SDK + BullMQ | 統一FCM推播派送服務，支援批量 Multicast |
| `RedisService` | Redis / ioredis | 權限快取、JWT黑名單、Session Store、Pub/Sub |
| `AuditService` | BullMQ + Elasticsearch | 非同步接收稽核事件並寫入 Log 儲存層 |
| `StorageService` | AWS S3 / MinIO SDK | Pre-signed URL 產生、物件刪除 |
| `CalendarService` | Google/MS Graph API | 非同步推送行事曆邀請，自動建立視訊會議連結 |
| `QueueWorker` | BullMQ (BullBoard 監控) | 消費 Queue 事件，含 Retry 策略與死信隊列 (DLQ) |

---

## 十三、SE 可行性確認備註

> ✅ **資深 SE 評估意見**：
> - 所有核心模組邊界清晰，介面定義明確，可支援多個前端工程師並行開發。
> - AccessPolicy Engine 的 Redis 快取設計能有效解決 N+1 效能問題，樂觀鎖設計可確保資源預約的資料一致性。
> - BullMQ 選型在 Node.js 生態中成熟穩定，對 Redis 的依賴可與快取層共用同一 Redis Cluster，降低 Ops 複雜度。
> - **【新增】Dynamic Admin Central 架構可行性**：PostgreSQL 對 JSONB 支援極強，採用 GIN index 後，在資料量數百萬內，其過濾查詢效能與 NoSQL 資料庫無異。這能完美兼顧「強關聯核心」與「高彈性業務表單」的雙軌需求，是極度前衛且實用的企業級架構。
> - 唯一需要注意的風險點：**Elasticsearch** 的維運成本較高，初期可以用 PostgreSQL + 時序索引代替，待日誌量上升後再遷移。
> - ⚠️ **外部 API 限流與斷路器防護 (Rate Limiting & Circuit Breaker)**：大廠 API 發生中斷或 429 Too Many Requests 時，BFF 必須具備斷路機制，防止連線池耗盡。
> - ⚠️ **非同步備援機制 (Fallback & Graceful Degradation)**：當大廠服務完全失效 (Outage) 時，OA 需將緊急通知降級發送備援 Email/本地推送；並配置本機緩衝儲存池保留暫存，待網路恢復後由 Worker 補齊分散式事務 (Distributed Transaction Compensation)。
