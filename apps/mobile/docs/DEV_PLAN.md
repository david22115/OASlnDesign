# 企業行動 App 開發計畫

**所屬專案**：`apps/mobile`
**技術棧**：React Native, Expo

## 一、專案職責概述
Mobile 專案主要解決「外勤業務、產線員工」無法使用電腦的情境。將專注於考勤打卡的時效性、推播的即時性，並以保障憑證安全及兼顧離線可用性為核心。

> 💡 **UI/UX 狀態紀錄**：目前 Mobile 行動端的介面視覺 (UI/UX) 尚未準備好，將於後續設計定案後再補入相關文件與實作項目。

---

## 二、SE 級工程實踐規範 (Engineering Practices)
* **安全無虞的離線存儲 (Offline Strategy)**：
    * 針對高度敏感資料 (如登入用的 JWT Token)，強制採用 `expo-secure-store` 作業系統內建隔離加密技術。
    * 針對【離線打卡紀錄】等純粹等待同步的 JSON 型別隊列，排除使用由中國廠商維護的解決方案，改為採用國際標準 **`@react-native-async-storage/async-storage`** 配合 Zustand Persist。不僅開發速度快，更避開了重型 SQLite 的 Migration 維護地獄與資安隱患。
* **支援 OTA 熱更新 (Over-The-Air Update)**：
    * 原生應用程式（App Store / Google Play）送審流程過於冗長。基建第一步必須導入 **`Expo EAS Update`** 機制，保留開發團隊在遇到 P0 級緊急 Bug 時，可以直接繞過商店審核，推送 Javascript Bundle 更新至用戶手機的能力。
* **程式碼品質與崩潰回報 (Code Quality & Crash Run)**：
    * 實作 `Husky` Pre-commit hook 以統一樣板風格。
    * 針對碎片化的 Mobile 環境，強制於 Phase 1 掛載 **`Sentry`**。一旦 App 崩潰或無回應 (ANR)，立刻收集 Stack Trace 回傳後台報警。

---

## 三、開發階段任務 (Phases)

### Phase 1：基建與原生功能整合
*   **PR 1-1: EAS Update 與狀態儲存建立**：
    *   導入 AsyncStorage 與 `expo-secure-store`，設定 OTA 發布通道。
*   **PR 1-2: 生物辨識與 IdP 登入橋接**：
    *   結合 Expo 原生模組，實作 Face ID / Touch ID 快速解鎖 OA 功能，確保 Token 駐留手機時的安全性。

### Phase 2：即時通訊推播 (FCM)
*   **PR 2-1: Firebase 整合設定**：
    *   配置 FCM 原生模組，載入憑證並自動向後端註冊專屬的 Device Token (**推播平台金鑰待申請**)。
*   **PR 2-2: 緊急公告與簽核互動推播**：
    *   實作全系統通用通知中心 (Notification Center)，支援點擊通知直接喚醒 App 並深度跳轉 (Deep Linking) 至對應頁面。

### Phase 3：防弊考勤打卡 (核心商務)
*   **PR 3-1: 雙因子定位技術 (GPS + Wi-Fi)**：
    *   開發嚴格的地理圍欄 (Geofencing) 距離偵測；掃描企業大樓內的指定 Wi-Fi SSID 作為物理距離保證。
*   **PR 3-2: 離線/防弊容錯打卡**：
    *   實作「地下室無收訊」時的離線簽章防弊機制。所有因無網際網路導致的排隊打卡資訊，皆透過 AsyncStorage 緩存，待連線信號恢復後，背景同步至 BFF。
