# 開發實作狀態同步文件 (Implementation Sync Report)
> **文件用途**：同步 SA 規劃文件與實際完成之實作，確保 SA ↔ Code 的一致性。  
> **最後更新**：2026-04-19  
> **狀態版本**：Phase 1 ～ Phase 4 完成

---

## 一、資料庫層 (Database Layer) — `packages/database`

### 實際實作與 SA 原始規劃對照

| SA 規劃模型 | 實際 Prisma Model | 狀態 | 說明 |
|---|---|---|---|
| 員工身份 (User Core) | `EmployeeProfile` | ✅ 完成 | 新增 `passwordHash` 欄位支援地端帳密登入 |
| 組織樹 | `Department`, `EmployeePosition` | ✅ 完成 | 一人多職、無限層級子部門 |
| SSO 應用啟動台 | `Application` | ✅ 完成 | 支援 OIDC / SAML / PROXY / DIRECT |
| 使用者偏好 | `UserPreference` | ✅ 完成 | 釘選 App、儀表板排序 |
| ABAC 引擎 | `Role`, `UserRole`, `AccessPolicy` | ✅ 完成 | 複合索引補強 |
| 稽核日誌 | `SystemAuditLog` | ✅ 已定義（未串 API） | Phase 5 再串接 |
| JWT 登出黑名單 | `RefreshToken` | ✅ 完成（Redis 黑名單） | 實際以 Redis JTI 實作，DB 表保留備援 |
| BPM 待辦快取 | `BpmTaskCache`, `PokeRecord` | ✅ 已定義 | 索引 `[employeeId, status]` 已加 |
| 出勤打卡 | `ClockInRecord` | ✅ 已定義 | GPS 欄位完整 |
| 公告系統 | `Announcement`, `AnnouncementReadLog` | ✅ 已定義 | |
| 文件管理 | `DocumentItem`, `DocumentVersion` | ✅ 已定義 | S3 ObjectKey 欄位預留 |
| **動態表單 (JSONB)** | `DynamicTableDef` + `DynamicRecordMaster` | ✅ SE 強化版 | **新增**：狀態機 (DRAFT→PUBLISHED→ARCHIVED)、Master-Detail 分離架構 |
| 第三方整合 | `IntegrationCredential`, `ThirdPartyResourceMap` | ✅ 完成 | |

### SE 強化補充項目（SA 原始文件未涵蓋，實作後補）
1. **`EmployeeProfile.passwordHash`**：SA 預設 SSO 登入，補充本地帳密欄位。
2. **`DynamicTableDef.status` 狀態機**：原 SA 無此設計，由 SE 于 Phase 4 加入，防止已發布表單被改壞歷史資料。
3. **`DynamicRecordMaster` (取代 `DynamicRecord`)**：原 SA 為單一 JSONB 表，SE 審查後依 Master-Detail Pattern 拆分，以保障查詢效能並留下可追溯的責任人 (ownerEmployeeId)。

---

## 二、API 層 (BFF Layer) — `apps/api`

### 已完成端點清單

#### Auth (身分驗證)
| Method | Path | 說明 | 狀態 |
|---|---|---|---|
| POST | `/api/auth/login` | 帳密登入，簽發 JWT | ✅ |
| POST | `/api/auth/logout` | JWT JTI 寫入 Redis 黑名單 | ✅ |
| GET | `/api/auth/me` | 取得當前登入員工資訊 | ✅ |

#### Dynamic Admin (動態表單 JSONB 引擎)
| Method | Path | 說明 | 狀態 |
|---|---|---|---|
| POST | `/api/admin/dynamic/schemas` | 建立表單定義 (DRAFT) | ✅ |
| PUT | `/api/admin/dynamic/schemas/:id` | 更新 Schema (限 DRAFT) | ✅ |
| PATCH | `/api/admin/dynamic/schemas/:id/publish` | 發布鎖定 Schema | ✅ |
| POST | `/api/admin/dynamic/records/:tableCode` | 提交動態表單資料 | ✅ |
| GET | `/api/admin/dynamic/records/:tableCode` | 查詢表單紀錄 (含分頁) | ✅ |

#### System
| Method | Path | 說明 | 狀態 |
|---|---|---|---|
| GET | `/health` | K8s Liveness Probe 健康檢查 | ✅ |

### 已實作中介軟體
| 中介軟體 | 路徑 | 說明 |
|---|---|---|
| `requireAuth` | `src/middlewares/auth.middleware.ts` | JWT 驗證 + Redis 黑名單比對 |
| `cors` | `src/index.ts` | 帶 Cookie 跨域支援 |
| `cookieParser` | `src/index.ts` | HttpOnly Cookie 解析 |

---

## 三、前端層 (Frontend) — `apps/portal` & `apps/admin`

### Portal (員工入口網)
| 頁面 | 路徑 | 串接 API | 狀態 |
|---|---|---|---|
| 登入 | `/login` | `POST /api/auth/login` | ✅ |
| 儀表板 | `/` | 靜態範本 (Mock Data) | ✅ 範本完成，API 串接 Phase 5 |
| Sidebar 導覽 | 元件 | — | ✅ |

### Admin (系統管理後台)
| 頁面 | 路徑 | 功能 | 狀態 |
|---|---|---|---|
| 表單管理清單 | `/` | Schema 狀態檢視、操作入口 | ✅ 靜態範本 |

---

## 四、架構變更影響說明 (SA Delta)

### 需要反映回 SA 文件的變更項目
> [!WARNING]
> 下列項目為實作過程發現的 SA 與實作不一致處，建議後續回寫至對應 SA 文件節區：

1. **`docs/SA/OA_API_Models_Specification.md`**：
   - 需補充 `DynamicRecordMaster` 的正確欄位定義（取代原 `DynamicRecord`）。
   - 新增 `DynamicTableDef.status` 與 `DynamicTableDef.fieldsSchema` 欄位說明。

2. **`docs/SA/MDS_Module_Design_Spec.md`**：
   - 需補充「動態表單狀態機流程圖 (DRAFT→PUBLISHED→ARCHIVED)」。
   - 需加入「Master-Detail 主檔明細設計說明」。

3. **`docs/API/`（API Spec 文件）**：
   - 需新建 `/api/admin/dynamic/*` 路由規格說明（含請求/回應格式、錯誤碼）。

---

## 五、待開發功能 (Backlog)
| 優先 | 功能模組 | 說明 |
|---|---|---|
| High | `SystemAuditLog` API 串接 | 將 Admin 操作寫入 AuditEvents Queue |
| High | Portal Dashboard API 串接 | 打卡、待辦、公告從真實 API 取資料 |
| Medium | `AccessPolicy` ABAC 中介軟體 | 在 requireAuth 後加入細粒度資源驗證 |
| Medium | Refresh Token 輪換機制 | 完整的 RT → AT 置換流程 |
| Low | Admin 表單 Schema Builder UI | 視覺化欄位設計介面 |
