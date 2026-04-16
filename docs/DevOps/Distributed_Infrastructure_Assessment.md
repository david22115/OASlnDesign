# 分散式基礎設施評估與部署架構 (Distributed Infrastructure Assessment)

**專案名稱**：`OASlnDesign`
**文件日期**：2026-04-17
**核心戰略**：**混合雲分散式架構 (Hybrid Cloud Distributed Architecture)** — 80% 公有雲無伺服器 (Serverless) 搭配 20% 私有地端運算叢集 (On-Prem)。

## 1. 架構決策核心摘要 (Executive Summary)

為了平衡「極致的管理效率 (降維運成本)」與「最高機密資料落地管控 (合規與安全)」的需求，本專案捨棄了單點失效風險高的單一虛擬機 (Monolithic VM) 架構。經過團隊與架構師決策，基礎設施採用 **「公有雲全託管容器 (80%) + 企業內部輕量 K8s 叢集 (20%)」** 的混合戰略。

---

## 2. 部署拓撲與資源分配 (Topology & Sizing)

### 2.1 公有雲層 (Public Cloud Zone) 佔比：80%
**技術選型**：全託管無伺服器容器服務 (推薦：`Google Cloud Run` 或 `AWS ECS Fargate`)
**部署目的**：承載大流量、無狀態 (Stateless)、對外開放的應用入口。

*   **🌐 應用的展示層 (Web App Frontend)**：
    *   **服務對象**：`apps/portal` (員工入口) 與 `apps/admin` (後台中樞)。
    *   **運作機制**：Next.js SSR 產生的 Docker Image 直接部署至 Serverless 平台。遇大併發流量瞬間 (如早上 9:00 全公司打卡)，平台會自動水平擴容 (Auto-Scale Out) 節點數量以吸收流量；離峰時自動降至最低甚至 0 節點以節省經費。
*   **⚙️ BFF 與流控大腦 (API Gateway)**：
    *   **服務對象**：`apps/api` 的核心業務 Router。
    *   **運作機制**：這層只做請求驗證、OAuth 解析與輕度代理轉發，依賴公有雲平台無中斷吸收海量 Webhook 回調 (來自 MS Graph / Google Workspace)。

### 2.2 企業私有地端層 (On-Premise Private Zone) 佔比：20%
**技術選型**：現代化輕量自建叢集 (推薦：`Proxmox VE + K3s` 或 `Nutanix Kubernetes Engine`)
**部署目的**：存放極高敏資料、長駐型背景任務，以及做為公有雲失效時的安全港灣。

*   **🔄 長駐型資料同步與補償工作者 (Background Workers)**：
    *   **服務對象**：`apps/api` 內的 `BullMQ Worker`。
    *   **運作機制**：地端 Worker 固定連線到 Redis 監聽 Queue。負責處理耗時的非同步作業 (如大量匯出稽核報表、傳遞推播通知、或是公網失聯時的離線資料補償)，這類作業不適合 Serverless 平台 (容易有單一 Request Timeout 限制)。
*   **🗃️ 關聯與記憶體資料庫 (Database & Cache)**：
    *   **服務對象**：`PostgreSQL 15` 與 `Redis Cluster`。
    *   **運作機制**：所有員工基本資料與商業配置強勢鎖定在企業自家的機房，不外流至公有雲代管資料庫，擁有最高的資安掌控權。

---

## 3. 網路架構與安全機制 (Network & Security)

由於是混和雲架構，跨域連線的安全是系統命脈：
1. **站對站連線 (VPN / VPC Peering)**：公有雲的 Serverless (80%) 區塊不能直接透過公網連線本地的資料庫。必須建立 IPSec VPN 或是雲端專線阻斷外部流量，讓公有雲的 API 能透過內網 IP 直接讀取本地 K3s 叢集內的 PG。
2. **零信任防護 (Zero-Trust)**：即使公有雲 Serverless App 被攻破，其到達地端資料庫的連線仍須具備嚴格的 Rate limiting 與 PgBouncer 連線池封鎖策略。
