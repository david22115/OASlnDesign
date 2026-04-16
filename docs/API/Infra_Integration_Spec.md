# 基礎設施與第三方整合規格書 (Infra & Integration Spec) *[WebSocket & CDN 升級版]*

針對單一入口與 OA 架構轉向「微服務與前台非同步分離」的方向，我們在原本的基礎配置中，納入了 **CDN 靜態分流網** 以及用於橫向擴展 (Scaling) **WebSocket 服務的 Redis Pub/Sub 機制**。

---

## 1. 架構部署點 (Points of Presence) 與 CDN 整合

### CDN 擔任第一道防線
為了將主 API (BFF) 解放，讓它專注在身分驗證與 Token 交換，所有不會頻繁變動的**靜態素材 (Static Assets)** 皆交由 CDN 分派：
*   **涵蓋範圍**：Web SPA Build 產物 (如 Next.js 的 JS Bundle)、組織 Logo 圖、`Application` 註冊表中的各系統 Icons。
*   **運作流程**：
    1.  部署流水線 (CI/CD) 建置完成後，將 `apps/portal/out` 與 `apps/admin/out` 內的檔案同步至 AWS S3 (或阿里雲 OSS)。
    2.  利用 CloudFront 或 Cloudflare 做 CDN 邊緣加速。
    3.  使用者打開 OA 入口，瞬間由地理最近節點派送 UI。
    4.  UI 載入完成，才向我們自建的 BFF API Server 發起帶著 Cookie 的動態 Auth 或 WebSocket 請求。

---

## 2. 微服務與 WebSocket 全域環境變數 (.env)

因應微服務與高可用性架構，API Server (.env) 需要擴充中樞定義：

```env
# ==========================================
# 1. Microservice BFF Gateway
# ==========================================
NODE_ENV=production
GATEWAY_PORT=3000
# 各後方微服務的內網對接位址 (Kubernetes / Docker Network)
SERVICE_AUTH_URL=http://auth-svc:3001
SERVICE_ORG_URL=http://org-svc:3002

# ==========================================
# 2. Redis Pub/Sub (For WebSocket Scaling)
# ==========================================
# 這是為了防範啟動了 [兩台以上 node.js API] 時，Socket 事件無法跨機器廣播的問題。
# 我們掛載 Socket.io-redis-adapter 或類似機制，將所有 Websocket 事件由 Redis 交換機來中轉。
REDIS_HOST=redis-master.internal
REDIS_PORT=6379
REDIS_WS_ADAPTER_CHANNEL=oa_socket_cluster

# ==========================================
# 3. CDN & 靜態資源對接
# ==========================================
CDN_BASE_URL="https://cdn.company-oa.com"

# ==========================================
# 4. MFA & Security
# ==========================================
MFA_APP_ISSUER="CompanyOA"
SESSION_COOKIE_SECRET="super-strong-cookie-signature"
```

---

## 3. WebSocket 高可用性 (HA) 整合架構解析

如果公司有一千位員工同時在線上，後端 Node.js 只開一台扛不住 WebSocket 長連接，我們必須開 N 台 (如容器化 Kubernetes 的 Replicas=3)。於是會產生整合難題：

**情境與解法：發公告機制**
1.  董事長發出一則「颱風放假」的全域推播。
2.  這包資料打中了 **API 伺服器 Node A**。
3.  但如果有 300 名員工恰好是與 **API 伺服器 Node B** 建立 WebSocket 呢？他們不就收不到推播了？
4.  **【整合解法】**：所有 Node 伺服器掛載 `Redis Pub/Sub`。Node A 收到發公告的 Request 後，自己將這則 WS Event 寫入 Redis；Redis 瞬間廣播給 Node B 與 Node C，隨後所有的 Node 同時觸發自身維持的 WebSocket 連線，推播 `system:broadcast` 事件給所有的瀏覽器。

---

## 4. Legacy (舊世代) 系統與 Proxy 整合

 *(保留原有反向代理免二次登入設計與 OIDC 策略。當新架構的 BFF 接獲請求後，利用 Server-to-Server 內網發送 Token 換取 Legacy Session 的架構依舊生效，不受微服務影響。)*
