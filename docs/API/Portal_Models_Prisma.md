# 單一入口與權限模型 (Portal Models & Prisma Schema) *[Microservices 架構優化版]*

此 Prisma Schema 檔案反映了 OA 架構升級後的兩大重點：
1. **支援「兼任與一人多職」的人令歷史追溯 (Time-based Organization)**。
2. **滿足「客製化 Launchpad」與高階主管「MFA (多因素驗證)」的需求**。

---

## 1. 使用者本體與高安全性設定 (User Core)

拔除原先綁死的單一 `departmentId`，專注於全域身分檔。

```prisma
model EmployeeProfile {
  id             String    @id @default(uuid())
  employeeId     String    @unique
  fullName       String
  email          String    @unique
  
  // 安全與多因素驗證 (MFA)
  isMfaEnabled   Boolean   @default(false)
  mfaSecret      String?   // TOTP (Authenticator) 金鑰
  
  isActive       Boolean   @default(true)
  
  // Relations
  positions      EmployeePosition[] // 取代單一部門，支援多職務
  roles          UserRole[]
  preferences    UserPreference?    // 個人化桌面偏好

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime? // 支援軟刪除
}
```

## 2. 動態組織樹與一人多職履歷 (Time-based Organization)

真正的企業設計，支援董事長掛董事長缺、但兼任執行長，同時擁有兩種權限。

```prisma
model Department {
  id          String       @id @default(uuid())
  code        String       @unique // 部門代號，如 "HR", "RD", "IT"
  name        String       // 部門名稱
  parentId    String?      // 上層部門 ID
  level       Int          @default(0) // 樹狀深度
  isActive    Boolean      @default(true)
  
  // Relations
  parent      Department?  @relation("DepartmentToDepartment", fields: [parentId], references: [id])
  children    Department[] @relation("DepartmentToDepartment")
  positions   EmployeePosition[]

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?
}

model EmployeePosition {
  id             String    @id @default(uuid())
  employeeId     String
  departmentId   String
  title          String    // 職稱 (如：總經理、資深工程師)
  isPrimary      Boolean   @default(false) // 是否為主職 (本職)
  
  // 時間維度 (歷史人令追溯)
  effectiveDate  DateTime  @default(now()) // 人令生效日 (BPM 找主管的依據)
  expireDate     DateTime? // 人令失效日/卸任日
  
  // Relations
  Employee     EmployeeProfile @relation(fields: [employeeId], references: [id])
  Department   Department      @relation(fields: [departmentId], references: [id])
}
```

## 3. 面向 Launchpad 的使用者體驗與動態權限

### 3.1 系統註冊表與桌面釘選偏好
給予使用者極致的桌面客製化權利。

```prisma
model Application {
  id            String    @id @default(uuid())
  code          String    @unique 
  name          String
  iconCdnUrl    String?   // CDN 託管的靜態圖示位址
  entryUrl      String    
  authType      String    // "OIDC" | "SAML" | "PROXY" | "DIRECT"
  proxyConfig   Json?     
  globalSortOrder Int     @default(0) // 預設全域排序
  isActive      Boolean   @default(true)
  
  // Relations
  policies      AccessPolicy[]
}

model UserPreference {
  id             String    @id @default(uuid())
  employeeId     String    @unique
  pinnedAppIds   String[]  // 使用者自定義釘選 (Pin) 到首頁的系統 Array
  dashboardOrder Json?     // 拖曳 Widget 的自定義版面排序結構
  
  Employee       EmployeeProfile @relation(fields: [employeeId], references: [id])
  updatedAt      DateTime  @updatedAt
}
```

### 3.2 角色與全域可見度引擎 (ABAC)

與原本設計一致，保留最高維度的權限賦予彈性。

```prisma
model Role {
  id          String         @id @default(uuid())
  code        String         @unique 
  name        String         
  userRoles   UserRole[]
  policies    AccessPolicy[]
}

model UserRole {
  id         String     @id @default(uuid())
  employeeId String
  roleId     String
  Employee   EmployeeProfile @relation(fields: [employeeId], references: [id])
  Role       Role            @relation(fields: [roleId], references: [id])
  @@unique([employeeId, roleId])
}

model AccessPolicy {
  id             String      @id @default(uuid())
  policyType     String      // "APPLICATION" | "WIDGET"
  applicationId  String?
  widgetId       String?     // 關聯至特定的 WS Widget
  roleId         String?     
  departmentId   String?     
  employeeId     String?     
  effect         String      @default("ALLOW")

  Application    Application? @relation(fields: [applicationId], references: [id])
  Role           Role?        @relation(fields: [roleId], references: [id])
}
```
