# ⚡ CF Sub Converter Pro

基於 Cloudflare Workers 的全能 Serverless 訂閱轉換與節點中樞。擁有現代深色 UI、GitHub 遠端規則即時直讀與內嵌容災架構、自訂短代碼全字元（大小寫/符號）1:1 完整保留、私密配置管理安全鎖、智慧倍率/專線分組、國旗萬國對齊系統、**Argo 隧道 2.0 自動化生成器**，以及 **OpenWrt Honk / DAE (eBPF 內核級透明代理) 與 Doona Web UI 深度適配**。支援將各類代理節點一鍵轉換為 **Sing-Box / Clash Meta (Mihomo) / Honk (DAE) / Surge 5 / Quantumult X / Loon / Base64** 格式，並提供全平台專屬喚醒協議（Deep Link）與行動條碼掃描自動導入。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sammy0101/cf-sub-converter)

---

## 🌟 核心特性

### 1. 🔌 全主流與新興協議深度解析
- **完整 Clash / Mihomo YAML 跨協議智慧解析**：
  - 支援將任何網上下載或機場提供的完整 `.yaml` 設定檔整份貼入主輸入框。
  - 後端解析器自動跳過頂層 `port:`、`rules:` 與策略組，精準提取 `proxies:` 陣列中的所有節點，並無縫轉換為 Sing-Box、Honk、Surge、Base64 等任何目標格式。
- **Cloudflare WARP MASQUE 萬能解析與高階調優**：
  - **多元來源識別**：支援貼入單一 JSON 物件、多組連續 JSON 物件、標準 JSON 陣列 `[ { ... } ]`、單行 `masque://` URI，或包含 MASQUE 的 Clash YAML 設定檔。
  - **Mihomo 專屬全規格補齊**：自動注入 `uri: https://cloudflareaccess.com`、`sni: www.microsoft.com`（防封鎖偽裝）、`congestion-controller: bbr`，以及 `dns: [1.1.1.1, 8.8.8.8]`。
  - **客戶端 IP 遮罩規範化**：針對 Clash 自動剝離子網掩碼（純 IP：`172.16.0.2`），避免舊版或部分核心解析異常；針對 Sing-Box 精準保留標準 CIDR（`172.16.0.2/32`）。
  - **Shadowrocket（小火箭）自動點亮 BBR**：在 Base64 明文 URI 中注入多別名 `cca=bbr`、`cc=bbr` 與 `congestion_control=bbr`，小火箭掃碼導入後**「擁塞控制」自動精確設定為 `bbr`**。
  - **Sing-Box 戰未來支援**：輸出結構完整對齊現代規範與社群擴展分支（如 `sing-box-lx`、`sing-box-extended`），內嵌 `congestion_control: "bbr"` 與 `tls` 物件。
- **WireGuard 官方 `.conf` 深度支援（支援多組批次貼入）**：
  - 直接貼入多組 Proton VPN、Mullvad 或 WARP 的 `[Interface] ... [Peer] ...` 設定檔，自動批次辨識並分割為獨立節點。
  - 自動提取 Proton 專屬 NetShield 內部 DNS（`10.2.0.1`），完整保留原生去廣告與極致防洩漏功能。
  - 智慧辨識伺服器備註與國家標籤（例如 `# JP-FREE#23` 自動轉換為 `🇯🇵 JP-FREE#23`）。
- **VLESS**：支援最新 `xhttp` / `splithttp`、`Reality`、`Vision`、`WebSocket (含 ?ed=2560 Early Data 規範化)`、`gRPC`。
- **ECH (Encrypted Client Hello) 零腦補動態適配**：
  - 嚴格依照節點輸入解析 ECH，僅在節點自帶以 `https://` 開頭的 DoH 時才掛載自訂解析器，絕不胡亂捏造 IP 或虛構網域。
  - 完美對齊節點偽裝域名（SNI）或指定之 ECH 查詢網域。
- **WebSocket ALPN 智慧鎖定**：自動為 WS+TLS 節點指定 `alpn: ["http/1.1"]`，解決 Cloudflare 邊緣節點錯誤協商 HTTP/2 導致的斷流問題；其餘協議（Reality、gRPC、TCP）維持靈活原生協商。
- **Shadowsocks-2022**：完整支援 `2022-blake3-*` 多端口與服務端密鑰。
- **其他協議**：Trojan、VMess、Hysteria 2 (`hy2`)、TUIC、AnyTLS。

### 2. 📱 全生態客戶端適配與一鍵喚醒 (Deep Link)
- **自適應識別 (Adaptive)**：自動依據請求客戶端的 `User-Agent` 回傳對應格式。
- **Clash Meta (Mihomo)**：YAML 格式，內建 Fake-IP、DoH 分流、流量嗅探與動態策略組。
- **Sing-Box (1.14+ 現代規範)**：
  - 完整符合現代標準，WireGuard 自動歸入頂層現代 `endpoints` 結構，徹底消除廢棄與語法錯誤。
  - 國外代理流量採用 Fake-IP 封裝網域名稱，國內/內網流量自動使用 Real-IP 直連。
- **OpenWrt Honk / DAE (`config.dae`，新增)**：
  - 一鍵生成適用於 OpenWrt Linux eBPF 內核級透明代理的完整 `/etc/honk/config.dae` 設定檔。
  - **Doona 原生 Web UI 深度整合**：自動配置 `experimental.native_api` 監聽 `0.0.0.0:9527`，區域網路手機或電腦直接開啟 `http://路由器IP:9527` 即可直觀監控即時流量與策略組。
  - **自動化訂閱對接**：配置 `subscription` 區塊直接拉取本轉換器的 Base64 訂閱，指定 `route: direct`（直連下載），並預設設定每 12 小時自動排程更新（`interval: 43200s`）。
  - **旁路由（雙網關）專屬優化**：私有網段規則採用純 `dip(geoip:private) -> direct`（排除 `must`），徹底消除同網段主旁路由非對稱路由（Asymmetric Routing）導致的 DNS 癱瘓問題。
  - **動態雲端規則連動**：即時拉取 GitHub 專屬 `geosite_ai_hk_proxy.dae` 規則，AI 網域修改隨時生效，零代碼維護。
- **Surge 5**：標準 `.conf` 格式，支援 Proxy、Proxy Group、分流規則與 `[WireGuard ...]` 獨立專屬區塊。
- **Quantumult X**：支援包含 `vless=` 在內的標準 `server_remote` 節點清單。
- **Loon**：標準 `[Proxy]` 格式。
- **通用 Base64 / Shadowrocket (小火箭)**：
  - 完整對齊標準 URI 結構（私鑰、公鑰、IP、DNS、MTU、CCA/BBR 與 Keepalive 參數全規格映射），解決小火箭解碼錯誤並支援原生通連。
- **🚀 專屬喚醒二維碼與自動命名**：
  - 點擊 QR Code 圖示自動產生符合各客戶端規範的條碼。
  - 手機相機或 App 掃描全自動填入名稱與網址，亦可點擊按鈕直接喚醒 App 一鍵導入。

### 3. 🏷️ 短連結雲端儲存與全字元完整保留
- **大小寫字母與特殊符號 1:1 完全保留**：
  - 點選已儲存的配置時，自訂短路徑名稱完整保留原始大小寫字母（如 `HK-VIP-Pro`）、符號、Emoji 與中文，不再強制轉換為小寫。
  - 網址生成器整合標準安全轉義（`encodeURIComponent`），確保包含特殊字元或空白時 HTTP 路由不被截斷，並能精確於 KV 還原對應配置。
- **路徑短代碼命名同步**：
  - 設定自訂短代碼（如 `My_Sub`），客戶端拉取時，後端自動下發標準 HTTP 標頭：
    - `Profile-Title: My_Sub`
    - `Subscription-Title: My_Sub`
    - `Content-Disposition: inline; filename="My_Sub.json"`

### 4. 🔐 私密配置管理安全鎖 (PAGE_PASSWORD)
- **公私分明**：
  - **公開使用**：通用訂閱轉換、節點過濾、Argo 隧道生成、客戶端訂閱更新一律開放。
  - **私密保護**：下方的「已儲存的配置」受密碼保護，需輸入管理密碼才能檢視、新增或編輯私密節點。
- **永久記住登入狀態**：解鎖成功後瀏覽器（`localStorage`）自動保持登入，重開網頁免重複輸入，並提供隨時「🔒 鎖定」按鈕。
- **後端安全攔截**：`/favs` 路由全面校驗 `X-Password`，未授權請求直接回傳 `401 Unauthorized`。

### 5. 🛡️ 99.99% GitHub 模板即時直讀與雙重容災架構 (Zero Downtime)
- **GitHub 遠端直讀 (零 KV 模板冗餘)**：
  - 遠端規則模板直接向 GitHub 倉庫請求最新內容，徹底移除寫入 KV 之 `tpl:singbox` 與 `tpl:clash` 鍵值，邊緣資料庫乾淨純粹。
  - 修改 GitHub 上的規則模板後，客戶端更新立即生效，無需手動清除快取。
- **雙重容災降級保證**：
  - 請求流程為：`GitHub 即時獲取` ➔ `內嵌應急模板兜底`。
  - 若遇 GitHub 服務波動、網路逾時或 429 限流，系統自動無縫回退至內建純淨版預設模板，確保訂閱拉取 100% 成功。
- **專屬純淨儲存**：KV 空間專門用於儲存用戶自訂短連結、私密收藏配置與 Argo 部署腳本。

### 6. 🏎️ 智慧倍率與專線動態策略組
- **倍率辨識**：自動識別節點名稱中的倍率特徵（如 `0.1x`、`0.5X`、`0.2倍`），並在 Sing-Box 與 Clash Meta 中動態建立「🏎️ 低倍率節點」策略組。
- **專線辨識**：自動擷取 `IPLC`、`IEPL`、`專線`、`內網` 特徵，動態生成「⚡ 專線加速」策略組。

### 7. 🌀 Argo 隧道 2.0 一鍵生成器
- **優選 IP / 官方域名注入**：支援填入 Cloudflare Clean IP（如 `104.16.80.1`）或優選網域，自動完成連接伺服器與 SNI/Host 映射，顯著降低延遲。
- **極簡 VPS 命令**：腳本自動上傳至 KV 快取，透過 `curl -sSL ... | bash` 極速完成部署。
- **智慧探測與修復**：VPS 端自動探測 443 / 80 本地監聽連接埠、TLS 狀態與 Host Header 重寫。

### 8. 🔍 智慧篩選、名稱替換與黃金國旗排版
- **雙向過濾**：支援「僅保留」與「排除」規則（多組用 `|` 隔開，如 `HK|TW` 或 `5x`），內建 `x`/`X`/`×` 字符相容匹配。
- **名稱替換**：支援 `DEL-關鍵字`（刪除）、`尋找-替換`，以及 `ALL-新名稱`（一鍵統改所有節點名稱）。
- **黃金 22 地區國旗排序**：自動為節點補上國旗 Emoji，依亞太核心（港、台、日、星、韓）➔ 歐美主流（美、英、加、澳）順序緊密分群，並自動對重複節點編號。

### 9. 📊 流量與到期日加總透傳
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
- **資料來源設定**：
  - 貼上完整 **Clash Meta (.yaml) 設定檔**、機場訂閱連結、WireGuard `.conf` 設定檔（支援多組 `[Interface]...[Peer]` 連續貼入）、Cloudflare WARP MASQUE JSON（支援陣列或多個物件），或各類代理節點。
- **過濾與替換**：設定保留/排除關鍵字或名稱替換規則。
- **短連結雲端儲存**：設定自訂短代碼（如 `My_Sub`），規則將自動打包存入 KV，大小寫與字元原樣保留。
- **多平台訂閱面板**：
  - 複製對應客戶端的訂閱連結（含 Sing-Box、Clash Meta、Honk/DAE、Surge、Base64 等）。
  - 點擊 QR Code 圖示彈出專屬喚醒視窗，手機相機或 App 掃描自動填入，或點擊「🚀 一鍵打開並導入」直接喚醒 App。
- **配置收藏管理**：輸入管理密碼解鎖後，可自由新增、編輯、刪除或一鍵套用常用的私密配置，瀏覽器會自動記住登入狀態。

---

### 2. API 調用與外部前端對接

#### 當作標準 SubConverter 後端使用
本專案內建標準 `/sub` 與 `/version` 端點，可直接填入任何開源 `sub-web` 前端的「後端地址 (Backend URL)」：
```text
https://your-worker.workers.dev
```

#### URL 參數手動轉換

| 參數 | 說明 | 範例 |
| :--- | :--- | :--- |
| `url` | 原始訂閱連結、YAML 或節點內容（需 URL 編碼） | `https://example.com/sub` |
| `target` | 目標格式：`clash` / `singbox` / `honk` (或 `dae`) / `surge` / `quanx` / `loon` / `base64` | `target=honk` |
| `include` | 僅保留符合正則之節點 | `include=HK\|TW` |
| `exclude` | 排除符合正則之節點（自動相容乘號 `×`） | `exclude=5x\|官網` |
| `rename` | 名稱替換（刪除：`DEL-字串`、替換：`A-B`、統改：`ALL-名稱`） | `rename=DEL-[69云]\|ALL-JP` |
| `name` | 自訂客戶端訂閱名稱（覆蓋預設檔名） | `name=my-vip-sub` |
| `force` / `nocache` | 兼容保留參數（模板已全面改為 GitHub 即時獲取） | `force=1` |

**完整調用範例**：
```http
# 轉換原始訂閱為 Clash Meta 格式，僅保留香港，並刪除廣告名稱
https://your-worker.workers.dev/sub?url=<URL編碼>&target=clash&include=HK&rename=DEL-[廣告]

# 讀取已存於雲端 KV 的短連結配置為 OpenWrt Honk (config.dae) 格式
https://your-worker.workers.dev/<自訂短連結名稱>?target=honk

# 讀取短連結為 Sing-Box 格式
https://your-worker.workers.dev/<自訂短連結名稱>?target=singbox
```

---

## 🛡️ 內建分流群組 (Sing-Box / Clash Meta / Honk)

| 圖示 | 策略組名稱 | 路由邏輯 |
| :--- | :--- | :--- |
| 🏎️ | 低倍率節點 | 自動彙整倍率 `< 1.0x` 的節點（省流專用） |
| ⚡ | 專線加速 | 自動彙整包含 `IPLC` / `IEPL` / `專線` 的低延遲節點 |
| 🚀 | 節點選擇 | 手動指定出站節點 / 主代理 |
| ⚡ | 自動選擇 | URL Test 自動測速切換最低延遲節點 |
| 💬 | AI 服務 | 針對 OpenAI / Claude / AI Studio 專屬分流 |
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

### 1. 在 OpenWrt 旁路由（雙網關）使用 Honk / DAE 時，為什麼私有網段不能加 `(must)`？
- **原因說明**：
  - 在旁路由架構中，主路由與旁路由位於同一個 L2 廣播網段。
  - 若在私有 IP 規則寫上 `dip(geoip:private) -> direct(must)`，Linux 核心會強制跳過 eBPF 狀態鏈直接發送，繞過了 DAE 的 Conntrack（連接追蹤）與 SNAT 偽裝。
  - 主路由收到 DNS 查詢後，會跨過旁路由直接回覆客戶端，造成**非對稱路由（Asymmetric Routing）**。客戶端因來源 IP 不匹配直接丟棄回覆，造成全網 DNS 癱瘓。
- **解法**：
  - 本專案產出的 Honk 配置已採用 `dip(geoip:private) -> direct`，保留 eBPF 狀態追蹤，在旁路由與單臂路由環境下均可順暢連通。

### 2. 為什麼官方原版 Sing-Box 無法使用 MASQUE 節點？如何在 Sing-Box 使用 WARP？
- **原因說明**：
  - **MASQUE 協議現狀**：官方 `SagerNet/sing-box` 主線尚未合併 MASQUE 模組（若強行載入會報 `unknown outbound type: masque`）。目前僅社群擴展分支（如 `sing-box-lx`、`sing-box-extended`）支援 MASQUE。
  - **協議不可互轉**：MASQUE（ECDSA P-256 / HTTP/3）與 WireGuard（Curve25519 / UDP）是兩套完全獨立的密碼學體系，轉換器無法直接將 MASQUE 金鑰轉換成 WireGuard 節點。
- **解法（官方 Sing-Box 如何使用 WARP）**：
  - 若需在官方原版 Sing-Box 使用 WARP，請直接獲取 **WARP 的 WireGuard 設定檔**（例如使用 `wgcf` 工具產生內含 `[Interface]...[Peer]` 的 `.conf` 檔）。
  - 將該 WireGuard `.conf` 貼入本轉換器，即可轉出符合官方規範的頂層現代 `endpoints` 結構，流暢連通。

### 3. WireGuard 節點在小火箭（Shadowrocket）測速顯示超時/紅燈（TCP 無延遲），但打開開關能正常上網？
- **原因**：WireGuard 是工作在第 3 層（網路層）的虛擬網卡 TUN 隧道協議。小火箭首頁的「連通性測試」預設發送的是 **TCP/HTTP Ping**；在開關未開啟前，TUN 路由尚未真正建立，因此向私有 DNS（如 Proton 的 `10.2.0.1`）發起的 TCP 域名解析必定超時。
- **說明**：這是所有包含內部私有 DNS 的 WireGuard / WARP 節點在小火箭中的**正常現象**。只要連線開關開啟後能順暢瀏覽網頁，即代表功能完全正常。若需測出數值，可在小火箭「設定」➔「測試方法」中切換為 **ICMP** 測速。

### 4. 某些優選節點（如 `www.visa.cn`）在小火箭測速顯示綠燈，但在 Sing-Box / Clash 上連不上？
- **原因**：
  - **小火箭 TCP Ping 假象**：小火箭預設只測 TCP 握手。`www.visa.cn` 的真實伺服器目前已遷至阿里雲香港（`47.75.18.65`），TCP 端口能通（顯示 2ms 綠燈），但**阿里雲節點根本不具備 Cloudflare Workers 的反代回源功能**，實際上根本無法上網。
  - **Sing-Box 真實業務探測**：Sing-Box 的測速發起的是真正的 HTTP 204 端到端業務測試（`https://www.gstatic.com/generate_204`），握手失敗立即如實回報紅燈。
- **解法**：請避免使用 `.cn` 結尾的過期優選域名，建議改用真正的官方 Anycast 節點（如 `www.visa.com`、`icook.hk`、`mfa.gov.ua` 或純 IP `162.159.198.2`）。

---

## 📁 專案架構

```text
cf-sub-converter/
├── src/
│   ├── index.ts          # Worker 核心路由、短代碼雙向容錯檢索、安全鑒權與 API 接口
│   ├── constants.ts      # 響應式深色 UI 模板、QR Code 生成器與內嵌緊急降級規則
│   ├── parser.ts         # 萬能節點解析器 (Clash YAML, WireGuard, MASQUE, VLESS, ECH 動態解析)
│   ├── generator.ts      # 多平台格式生成器 (Sing-Box, Clash Meta, Honk/DAE, Surge 5, Base64)
│   ├── utils.ts          # 倍率與專線特徵提取、Base64 安全編碼、萬國國旗對齊演算法
│   └── types.ts          # 嚴格 TypeScript 類型定義
├── argo.sh               # VPS Argo 隧道 2.0 一鍵安裝與自我修復通用腳本
├── Sing-Box_Rules.JSON   # GitHub 遠端 Sing-Box 混合 TUN 規則模板
├── Clash_Rules.YAML      # GitHub 遠端 Clash Meta (Mihomo) 規則模板
├── wrangler.toml         # Cloudflare Workers 配置檔
└── .github/workflows/
    └── deploy.yml        # GitHub Actions 自動化部署工作流
```

---

## ⚠️ 免責聲明

本專案僅供網路安全、分散式架構學習與技術交流使用，不提供任何代理伺服器或節點服務。請使用者自覺遵守當地法律法規，切勿用於任何非法用途。
