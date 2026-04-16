# 企業 OA 系統 API 與資料模型規格書 (優化版)

本文件基於先前的 SA 系統分析架構，納入了**資料樂觀鎖 (Optimistic Locking)**、**預簽署網址 (Pre-signed URL 直傳)**、**軟刪除 (Soft Delete)**、**歷史版本控制 (Versioning)** 與 **SSE (Server-Sent Events) 即時同步** 等進階微觀設計，提供具體可落地執行的 Prisma Model 與 API 設計規格。

---

## 1. 資料庫層核心選型：PostgreSQL + Prisma Schema (Models) 設計

系統底層全面採用 PostgreSQL 並結合 Prisma ORM，完美對接 Postgres 特有的進階型別 (如 `JSONB`, `Arrays` 等)，將資料庫型別無縫對齊 TypeScript。
所有實體皆追加 `deletedAt` 以實作軟刪除；同時針對高併發存取模型追加 `@version` 樂觀鎖防護。

```prisma
// -------------------------------------------------------------
// 【核心】企業帳號與共用層
// -------------------------------------------------------------
model EmployeeProfile {
  id             String    @id @default(uuid())
  employeeId     String    @unique
  fullName       String
  email          String    @unique
  departmentId   String
  managerId      String?
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime? // 支援軟刪除
}

// -------------------------------------------------------------
// 【模組 1】電子簽核與推播 (BPM Integration)
// -------------------------------------------------------------
model BpmTaskCache {
  id             String    @id @default(uuid())
  employeeId     String
  externalTaskId String
  title          String
  status         String    // PENDING / APPROVED / REJECTED
  systemSource   String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
}

// -------------------------------------------------------------
// 【模組 2】差勤管理 (Attendance Integration)
// -------------------------------------------------------------
model ClockInRecord {
  id             String    @id @default(uuid())
  employeeId     String
  clockType      String    // 'WEB' | 'APP' | 'OFFLINE_SYNC'
  deviceIp       String?
  gpsLatitude    Float?
  gpsLongitude   Float?
  wifiSsid       String?
  isVerified     Boolean
  syncStatus     String    // 'PENDING' | 'SYNCED' | 'FAILED'
  createdAt      DateTime  @default(now())
  deletedAt      DateTime?
}

// -------------------------------------------------------------
// 【模組 3】企業公告 (Bulletin Board)
// -------------------------------------------------------------
model Announcement {
  id             String                @id @default(uuid())
  title          String
  content        String                @db.Text
  authorId       String
  isMustRead     Boolean               @default(false)
  publishedAt    DateTime              @default(now())
  expiredAt      DateTime?
  readLogs       AnnouncementReadLog[]
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt
  deletedAt      DateTime?
}

model AnnouncementReadLog {
  id             String       @id @default(uuid())
  announcementId String
  employeeId     String
  readAt         DateTime     @default(now())
  Announcement   Announcement @relation(fields: [announcementId], references: [id])
}

// -------------------------------------------------------------
// 【模組 4】資源與會議室預約 (Resource Booking - 包含樂觀鎖)
// -------------------------------------------------------------
model Resource {
  id        String            @id @default(uuid())
  name      String
  type      String            // MEETING_ROOM / COMPANY_CAR
  capacity  Int?
  isActive  Boolean           @default(true)
  bookings  ResourceBooking[]
  createdAt DateTime          @default(now())
  deletedAt DateTime?
}

model ResourceBooking {
  id           String    @id @default(uuid())
  resourceId   String
  organizerId  String
  title        String
  startTime    DateTime
  endTime      DateTime
  participants String[]
  version      Int       @default(1) // 樂觀鎖：預防高併發時的 Double Booking
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
  Resource     Resource  @relation(fields: [resourceId], references: [id])
}

// -------------------------------------------------------------
// 【模組 5】文件與企業知識管理 (Document Management - 包含版本機制)
// -------------------------------------------------------------
model DocumentItem {
  id          String            @id @default(uuid())
  name        String
  type        String            // 'FOLDER' | 'FILE'
  parentId    String?           // 樹狀目錄父節點
  ownerId     String
  versions    DocumentVersion[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
}

model DocumentVersion {
  id             String       @id @default(uuid())
  documentItemId String       // 關聯至父文件
  versionNumber  Int          // v1, v2, v3...
  s3ObjectKey    String       // S3 實體路徑
  sizeBytes      BigInt
  uploadById     String       // 更新此版本的人員
  isCurrent      Boolean      @default(true) // 是否為最新生效版
  createdAt      DateTime     @default(now())
  DocumentItem   DocumentItem @relation(fields: [documentItemId], references: [id])
}

// -------------------------------------------------------------
// 【全域資安】稽核日誌中樞 (Centralized Audit Trail)
// (註：高併發環境下，這類日誌可交由 Logstash/Elasticsearch 處理。此為 Prisma RDBMS 落地方案)
// -------------------------------------------------------------
model SystemAuditLog {
  id             String    @id @default(uuid())
  employeeId     String
  action         String    // e.g. "DOWNLOAD", "DELETE", "READ"
  resourceType   String    // e.g. "DOCUMENT", "ANNOUNCEMENT"
  resourceId     String
  clientIp       String?
  userAgent      String?
  createdAt      DateTime  @default(now())
}
```

---

## 2. API 規格設計指引與零信任安全 (Zero-Trust Security)

### 2.0 基礎安全與快取防護 (Security & Caching)
*   **Rate Limiting (API 節流)**：在 BFF/API Gateway 層強制設定 Rate Limit，單一 IP 或 Token 異常頻繁請求時予以阻斷 (HTTP 429 Too Many Requests)，防範 DDoS 攻擊。
*   **Redis 權限快取**：對於高頻呼叫的「權限檢驗 API (Policy Check)」，必須經過 Redis 提取過濾清單，避免產生 `N+1 查询` 導致 PostgreSQL 負載過高。
*   **零信任 Cookie & CSP**：API 派發 Session/Token 若使用 Cookie，必須強制掛上 `HttpOnly`、`Secure` 與 `SameSite=Strict`，同時前端回應的 HTML Headers 須注入嚴密 Content Security Policy 防範 XSS 與 CSRF。
*   **M2M 憑證防護**：若 API 服務需與其他微服務通信，即使在內部網域也需使用 mTLS 加密驗證。

### 2.1 身分認證與黑名單機制 (Authentication)

*   **`POST /api/auth/logout`** (登出 / JWT 黑名單)
    *   **機制**：當調用登出或 HR 系統拋轉離職事件時，將當前 Access Token 的 `jti` (JWT ID) 加上其剩餘存活時間作為 TTL，寫入 Redis 黑名單。
    *   **回應**：`204 No Content`
    *   **Middleware 行為**：所有需要 Auth 的路由，都會先用 `< 1ms` 的時間確認 Token 是否存在於 Redis `blacklist:jti` 中，若有則回傳 `401 Unauthorized`。

### 2.2 檔案 S3 直傳機制 (Document Management)

為了避免上傳大檔案拖垮 API 的記憶體與頻寬，必須實作兩段式上傳。

*   **Part 1: `POST /api/documents/upload/presigned-url`**
    *   **說明**：前端告知後端即將上傳之檔案資訊，換取 S3 臨時直傳網址。
    *   **Request** (Body):
        ```json
        {
          "fileName": "Q3_financial_report.pdf",
          "mimeType": "application/pdf",
          "documentItemId": "uuid-of-doc-if-updating-version", // 新增版本時帶入
          "sizeBytes": 15000000
        }
        ```
    *   **Response** (`200 OK`):
        ```json
        {
          "uploadUrl": "https://company-s3-bucket.s3.aws...&signature=xxx", // 前端接下來 PUT 到這裡
          "s3ObjectKey": "docs/2026/04/uuid.pdf",
          "expiresIn": 300
        }
        ```
*   **Part 2: `POST /api/documents/upload/callback`**
    *   **說明**：前端將實體檔案推上 S3 後，回報 API 完成，由 API 將 `DocumentItem` 與 `DocumentVersion` 紀錄寫入 DB。

### 2.3 會議室資源樂觀鎖保護 (Resource Booking)

*   **`POST /api/resources/{resourceId}/book`**
    *   **說明**：建立會議室預約。
    *   **後端邏輯**：
        1. 查詢該時段是否有未軟刪除 (`deletedAt: null`) 且不重疊 (`startTime` < 本次結束 && `endTime` > 本次開始) 的紀錄。
        2. 若有重疊，則回傳 `409 Conflict`。
        3. 若無重疊，執行 Prisma 原生 Insert。
        4. (選用：若為修改預約 `PUT`，則條件須加上 `where: { id: req.id, version: req.version }` 並執行 `data: { version: { increment: 1 } }`。若因併發遭覆寫，Prisma 會拋棄更新，此時 API 向前端回傳 `409 Conflict`)。

### 2.4 BPM 與系統推流 (Server-Sent Events)

*   **`GET /api/events/stream`**
    *   **說明**：建立長連接 (Long-polling / SSE)，用於即時接收單據審核結果與新推播，取代無效的輪詢 (Polling)。
    *   **機制**：
        *   客戶端帶 JWT 發起 GET 請求，HTTP Header 回傳 `Content-Type: text/event-stream`。
        *   後端 (如 NestJS SSE) 暫不關閉連線。當 BPM 用 Webhook 敲進 OA API，OA API 透過 Event Emitter 將事件推播至對應 `userId` 的這根水管中。
    *   **Event Payload** 範例：
        ```text
        event: TaskStatusChanged
        data: {"taskId": "external-task-x123", "status": "APPROVED"}
        
        event: NewAnnouncement
        data: {"announcementId": "ann-1234", "title": "五一勞動節放假公告"}
        ```
