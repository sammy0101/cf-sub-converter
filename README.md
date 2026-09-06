# ⚡ CF Sub Converter Pro

基於 Cloudflare Workers 的全能 Serverless 訂閱轉換與節點中樞。擁有現代深色 UI、SWR 高可用快取容災架構、私密配置管理安全鎖、智慧倍率/專線分組、國旗萬國對齊系統，以及 **Argo 隧道 2.0 自動化生成器**。支援將各類代理節點一鍵轉換為 **Sing-Box / Clash Meta (Mihomo) / Surge 5 / Quantumult X / Loon / Base64** 格式，並提供全平台專屬喚醒協議（Deep Link）與行動條碼掃描自動導入。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sammy0101/cf-sub-converter)

---

## 🌟 核心特性

### 1. 🔌 全主流與新興協議深度解析
- **WireGuard 官方 `.conf` 深度支援**：直接貼入 Proton VPN、Mullvad 或 WARP 等多行 `[Interface] ... [Peer] ...` 設定檔，自動轉換為各平台出站，並智慧識別國家標籤（如 `🇳🇱 NL-FREE#246`）。
- **VLESS**：支援最新 `xhttp` / `splithttp`、`Reality`、`Vision`、`WebSocket (含 ?ed=2560 Early Data 淨化)`、`gRPC`。
- **ECH (Encrypted Client Hello)**：自動解析 `&ech=` 參數，在 Sing-Box 與 Clash 中開啟 ECH 加密問候，徹底繞過 GFW 針對 SNI 網域的阻斷。
- **WebSocket ALPN 智慧鎖定**：自動為 WS+TLS 節點指定 `alpn: ["http/1.1"]`，解決 Cloudflare 邊緣節點錯誤協商 HTTP/2 導致的斷流問題。
- **Shadowsocks-2022**：完整支援 `2022-blake3-*` 多端口與服務端密鑰。
- **其他協議**：Trojan、VMess、Hysteria 2 (`hy2`)、TUIC、AnyTLS。

### 2. 📱 全生態客戶端適配與一鍵喚醒 (Deep Link)
- **自適應識別 (Adaptive)**：自動依據請求客戶端的 `User-Agent` 回傳對應格式。
- **Clash Meta (Mihomo)**：YAML 格式，內建 Fake-IP、DoH 分流、流量嗅探與動態策略組。
- **Sing-Box (1.14+ 現代規範)**：
  - 完整符合 1.14+ 規範，徹底消除 `download_detour`、`missing default_domain_resolver`、`outbound DNS rule`、`dns-out` 等廢棄警告。
  - WireGuard 自動轉化為頂層現代 `endpoints` 結構，由策略組直接切換。
  - 國外代理流量採用 Fake-IP 封裝網域名稱，國內/內網流量自動使用 Real-IP 直連。
- **Surge 5**：標準 `.conf` 格式，支援 Proxy、Proxy Group、分流規則與 `[WireGuard ...]` 獨立專屬區塊。
- **Quantumult X**：支援包含 `vless=` 在內的標準 `server_remote` 節點清單。
- **Loon**：標準 `[Proxy]` 格式。
- **通用 Base64**：相容 v2rayNG、PassWall、Shadowrocket 等。
- **🚀 專屬喚醒二維碼**：
  - 點擊 QR Code 圖示自動產生客戶端專屬協議條碼（如 `sing-box://...`、`clash://...`、`surge:///...`）。
  - 手機相機或 App 掃描**全自動填入名稱與網址**，亦可點擊按鈕直接喚醒 App 一鍵導入。

### 3. 🔐 私密配置管理安全鎖 (PAGE_PASSWORD)
- **公私分明**：
  - **公開使用**：通用訂閱轉換、節點過濾、Argo 隧道生成、客戶端訂閱更新一律開放。
  - **私密保護**：下方的「已儲存的配置」受密碼保護，需輸入管理密碼才能檢視、新增或編輯私密節點。
- **永久記住登入狀態**：解鎖成功後瀏覽器（`localStorage`）自動保持登入，重開網頁免重複輸入，並提供隨時「🔒 鎖定」按鈕。
- **後端安全攔截**：`/favs` 路由全面校驗 `X-Password`，未授權請求直接回傳 `401 Unauthorized`。

### 4. 🛡️ 99.99% 高可用 SWR 容災架構 (Zero Downtime)
- **Stale-While-Revalidate + KV 快取**：遠端規則模板自動在邊緣快取，背景非同步靜默更新。
- **三重容災降級保證**：`KV 快取優先` ➔ `GitHub 即時獲取` ➔ `內嵌應急模板兜底`，徹底杜絕因 GitHub 429 限流或連線波動導致的轉換失敗。
- **支援即時穿透**：訂閱網址後外掛 `&force=1` 或 `&nocache=1` 即可跳過快取即時拉取最新規則。

### 5. 🏎️ 智慧倍率與專線動態策略組
- **倍率辨識**：自動識別節點名稱中的倍率特徵（如 `0.1x`、`0.5X`、`0.2倍`），並在 Sing-Box 與 Clash Meta 中動態建立「🏎️ 低倍率節點」策略組。
- **專線辨識**：自動擷取 `IPLC`、`IEPL`、`專線`、`內網` 特徵，動態生成「⚡ 專線加速」策略組。

### 6. 🌀 Argo 隧道 2.0 一鍵生成器
- **優選 IP / 官方域名注入**：支援填入 Cloudflare Clean IP（如 `104.16.80.1`）或優選網域，自動完成連接伺服器與 SNI/Host 映射，顯著降低延遲。
- **極簡 VPS 命令**：腳本自動上傳至 KV 快取，透過 `curl -sSL ... | bash` 極速完成部署。
- **智慧探測與修復**：VPS 端自動探測 443 / 80 本地監聽連接埠、TLS 狀態與 Host Header 重寫。

### 7. 🔍 智慧篩選、名稱替換與黃金國旗排版
- **雙向過濾**：支援「僅保留」與「排除」規則（多組用 `|` 隔開，如 `HK|TW` 或 `5x`），內建 `x`/`X`/`×` 字符相容匹配。
- **名稱替換**：支援 `DEL-關鍵字`（刪除）、`尋找-替換`，以及 `ALL-新名稱`（一鍵統改所有節點名稱）。
- **黃金 22 地區國旗排序**：自動為節點補上國旗 Emoji，依亞太核心（港、台、日、星、韓）➔ 歐美主流（美、英、加、澳）順序緊密分群，並自動對重複節點編號。

### 8. 📊 流量與到期日加總透傳
- 自動從上游多個機場擷取並加總上傳、下載與總流量，計算最近的到期時間，透過標準 `subscription-userinfo` 標頭透傳，完美點亮客戶端流量資訊條。

---

## 🚀 部署教學

### 方法一：一鍵按鈕快速部署 (最推薦、零設定自動託管)

點擊本說明文件上方的 **Deploy to Cloudflare Workers** 按鈕。

* **零設定自動託管**：Cloudflare 網頁部署精靈會引導您登入，並**在背景全自動為您建立並對接好所需的 KV 命名空間（`SUB_CACHE`）**。
* **自建 CI/CD (Workers Builds)**：Cloudflare 會在您的 GitHub 下自動建立此專案的複製倉庫。未來只要在 GitHub 修改並 `git push`，Cloudflare 就會自動在端點編譯部署。

---

### 方法二：手動 Fork 本專案並使用 GitHub Actions 自動部署 (需設定 Secrets)

如果您選擇**手動 Fork 本項目**並利用倉庫內建的 GitHub Actions 自動進行 CI/CD 部署，請依照以下步驟操作：

1. **Fork 本專案**：
   點擊本倉庫右上角的 **`Fork`** 按鈕，將專案複製一份到您的 GitHub 帳號下。

2. **建立 Cloudflare KV 命名空間**：
   - 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
   - 點擊左側選單的 **`Storage & Databases` (儲存與資料庫)** ➔ **`KV`**。
   - 點擊 **`Create a namespace`**，輸入名稱（例如 `SUB_CACHE`），建立完成後複製其 **Namespace ID**。

3. **設定 GitHub Repository Secrets**：
   前往您 Fork 出來的 GitHub 倉庫頁面，依次點擊：
   **`Settings`** ➔ **`Secrets and variables`** ➔ **`Actions`** ➔ **`New repository secret`**，添加以下三個密鑰：

   | 密鑰名稱 (Secret Name) | 說明與獲取方式 |
   | :--- | :--- |
   | **`CF_API_TOKEN`** | **Cloudflare API 權杖**<br>獲取方式：Cloudflare 首頁 ➔ 右上角「我的個人資料」➔「API 權杖」➔「建立權杖」➔ 選擇「編輯 Cloudflare Workers」模板（需具備 Workers 與 KV 的編輯權限）。 |
   | **`CF_ACCOUNT_ID`** | **Cloudflare 帳戶 ID**<br>獲取方式：登入 Cloudflare ➔ 點擊任意網域或 Worker 頁面，在右側欄位即可找到「帳戶 ID (Account ID)」。 |
   | **`CF_KV_ID`** | **KV 命名空間 ID**<br>獲取方式：填入步驟 2 中建立的 `SUB_CACHE` 命名空間 ID。 |

4. **觸發自動部署**：
   - 前往 GitHub 倉庫的 **`Actions`** 標籤頁。
   - 點擊左側的 **`Deploy to Cloudflare Workers`** 工作流，點擊 **`Run workflow`** 手動執行部署。
   - 後續只要您對 `main` 或 `master` 分支推送（Push）任何代碼變更，GitHub Actions 就會全自動為您編譯並發布至 Cloudflare Workers。

---

### 方法三：本地手動編譯部署 (Wrangler CLI)

1. **克隆專案並安裝依賴**：
   ```bash
   git clone https://github.com/sammy0101/cf-sub-converter.git
   cd cf-sub-converter
   npm install
   ```

2. **建立 KV 命名空間**：
   ```bash
   wrangler kv:namespace create SUB_CACHE
   ```
   *將終端機回傳的 `id` 替換至 `wrangler.toml` 中的 `KV_ID_PLACEHOLDER`。*

3. **發布至 Cloudflare**：
   ```bash
   npm run deploy
   ```

---

## 🔐 設定私密管理密碼（PAGE_PASSWORD）

若要啟用「已儲存的配置」安全密碼鎖，推薦直接在 Cloudflare Dashboard 中設定為 **Secret（加密機密）**，無論重新部署多少次都**永遠不會丟失**：

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ 點進您的 Worker。
2. 點擊頂部的 **`Settings` (設定)** ➔ **`Variables and Secrets` (變數與機密)**。
3. 點擊 **`Add variable`** 或 **`Add secret`**：
   - **名稱**：`PAGE_PASSWORD`
   - **值**：輸入您的管理密碼（例如 `MyPass888`）
   - 點擊欄位旁的 **`Encrypt` (加密)** 按鈕鎖定。
4. 點擊 **`Save and deploy` (儲存並部署)** 即可立即生效！

---

## 📖 使用指南

### 1. 視覺化 Web 面板
訪問您部署完成的 Workers 網址：
- **資料來源設定**：貼上機場訂閱連結、WireGuard `.conf` 設定檔或各類協議節點（支援多行混合輸入）。
- **過濾與替換**：設定保留/排除關鍵字或名稱替換規則。
- **短連結雲端儲存**：設定自訂短代碼，規則將自動打包存入 KV。
- **多平台訂閱面板**：
  - 複製對應客戶端的訂閱連結。
  - 點擊 QR Code 圖示彈出專屬喚醒視窗，手機相機掃描自動填入，或點擊「🚀 一鍵打開並導入」直接喚醒 App。
- **配置收藏管理**：輸入管理密碼解鎖後，可自由新增、編輯、刪除或一鍵套用常用的私密配置，瀏覽器會自動記住登入狀態。

---

### 2. Argo 隧道 2.0 部署步驟

1. 在網頁主輸入框貼入您的 VLESS / VMess 節點內容。
2. 點擊 **「第一步：解析並載入目前輸入的 VLESS / VMess 節點」**。
3. 勾選欲轉換之節點，系統會自動匹配原埠號。
4. （選填）填入 **Cloudflare 優選 IP**（例如 `104.16.80.1`）以加速連線。
5. （選填）填入固定 Tunnel Token 與自訂綁定域名（若留空則為臨時隨機隧道）。
6. 點擊 **「第二步：生成 Argo 一鍵部署指令與節點」**。
7. 將產生的 `curl -sSL ... | bash` 指令複製至 VPS（以 root 權限執行）。
8. 部署成功後：
   - **固定域名模式**：下方文字框直接複製已轉換好的 `_Argo_優選` 節點。
   - **臨時隨機模式**：VPS 終端機將動態輸出最終分配的節點連結。

---

### 3. API 調用與外部前端對接

#### 當作標準 SubConverter 後端使用
本專案內建標準 `/sub` 與 `/version` 端點，可直接填入任何開源 `sub-web` 前端的「後端地址 (Backend URL)」：
```text
https://your-worker.workers.dev
```

#### URL 參數手動轉換

| 參數 | 說明 | 範例 |
| :--- | :--- | :--- |
| `url` | 原始訂閱連結或節點內容（需 URL 編碼） | `https://example.com/sub` |
| `target` | 目標格式：`clash` / `singbox` / `surge` / `quanx` / `loon` / `base64` | `target=clash` |
| `include` | 僅保留符合正則之節點 | `include=HK\|TW` |
| `exclude` | 排除符合正則之節點（自動相容乘號 `×`） | `exclude=5x\|官網` |
| `rename` | 名稱替換（刪除：`DEL-字串`、替換：`A-B`、統改：`ALL-名稱`） | `rename=DEL-[69云]\|ALL-JP` |
| `force` / `nocache` | 強制穿透 KV 快取，即時拉取最新遠端規則模板 | `force=1` |

**完整調用範例**：
```http
# 轉換原始訂閱為 Clash Meta 格式，僅保留香港，並刪除廣告名稱
https://your-worker.workers.dev/sub?url=<URL編碼>&target=clash&include=HK&rename=DEL-[廣告]

# 讀取已存於雲端 KV 的短連結配置
https://your-worker.workers.dev/<自訂短連結名稱>?target=singbox

# 強制刷新快取獲取最新 Sing-Box 規則
https://your-worker.workers.dev/<自訂短連結名稱>?target=singbox&force=1
```

---

## 🛡️ 內建分流群組 (Sing-Box / Clash Meta)

| 圖示 | 策略組名稱 | 路由邏輯 |
| :--- | :--- | :--- |
| 🏎️ | 低倍率節點 | 自動彙整倍率 `< 1.0x` 的節點（省流專用） |
| ⚡ | 專線加速 | 自動彙整包含 `IPLC` / `IEPL` / `專線` 的低延遲節點 |
| 🚀 | 節點選擇 | 手動指定出站節點 |
| ⚡ | 自動選擇 | URL Test 自動測速切換最低延遲節點 |
| 💬 | AI 服務 | 針對 OpenAI / Claude / Gemini / AI Studio 專屬分流 |
| 🍎 | 蘋果服務 | Apple 相關服務直連或代理 |
| Ⓜ️ | 微軟服務 | Microsoft 服務直連或代理 |
| 🎮 | 遊戲平台 | Steam / Epic / EA / Ubisoft / Blizzard |
| 🌐 | 非中國 | 全球主流網站（Google、Telegram、YouTube 等） |
| 🇨🇳 | 國內服務 | 中國大陸 IP 與網域自動精準直連 |
| 🏠 | 私有網絡 | 區域網路 (LAN) 直連 |
| 🛑 | 廣告攔截 | 阻擋常見廣告與追蹤器 (AdBlock) |
| 🐟 | 漏網之魚 | Final Match 未命中規則之預設路由 |

---

## ❓ 常見問題排錯 (FAQ)

### 1. Windows 上運行 WireGuard 節點報錯 `listen udp6: An invalid argument was supplied`？
- **原因**：Windows 電腦未開啟 IPv6 協議元件，導致 Sing-Box 核心在嘗試雙棧 UDP 監聽時被 Windows Winsock 攔截。
- **解法**：在 Windows 按 `Win + R` ➔ 輸入 `ncpa.cpl` ➔ 在連線的網卡（乙太網路或 Wi-Fi）點右鍵「內容」➔ **將「網際網路通訊協定第 6 版 (TCP/IPv6)」打勾啟用** 即可正常握手連通。若電腦完全無法開啟 IPv6，建議使用 **Clash Meta** 格式訂閱。

### 2. Cloudflare EdgeTunnel 節點在手機端連線逾時？
- **原因**：部分 Cloudflare 節點啟用了 ECH（加密問候）或自訂 WebSocket Early Data。
- **解法**：本工具已全面自動淨化路徑中的 `?ed=2560`，並鎖定 `alpn: ["http/1.1"]`，只要透過本轉換器更新至最新訂閱，即可完美相容。

---

## 📁 專案架構

```text
cf-sub-converter/
├── src/
│   ├── index.ts          # Worker 核心路由、並發請求控制、安全鑒權與 API 接口
│   ├── constants.ts      # 響應式深色 UI 模板、QR Code 生成器與 SWR 內嵌降級規則
│   ├── parser.ts         # 萬能節點解析器 (WireGuard .conf, VLESS SplitHTTP/EarlyData, ECH 等)
│   ├── generator.ts      # 多平台格式生成器 (Sing-Box 1.14+, Clash, Surge 5, QuanX, Loon, Base64)
│   ├── utils.ts          # 倍率與專線特徵提取、Base64 安全編碼、萬國國旗對齊演算法
│   └── types.ts          # 嚴格 TypeScript 類型定義
├── argo.sh               # VPS Argo 隧道 2.0 一鍵安裝與自我修復通用腳本
├── Sing-Box_Rules.JSON   # 遠端 Sing-Box 混合 TUN 規則模板 (1.14+ 現代無警告規範)
├── Clash_Rules.YAML      # 遠端 Clash Meta (Mihomo) 規則模板
├── wrangler.toml         # Cloudflare Workers 配置檔
└── .github/workflows/
    └── deploy.yml        # GitHub Actions 自動化部署工作流
```

---

## ⚠️ 免責聲明

本專案僅供網路安全、分散式架構學習與技術交流使用，不提供任何代理伺服器或節點服務。請使用者自覺遵守當地法律法規，切勿用於任何非法用途。
