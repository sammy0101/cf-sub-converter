# ⚡ CF Sub Converter Pro

基於 Cloudflare Workers 的全能 Serverless 訂閱轉換與節點中樞。擁有現代深色 UI、SWR 高可用快取容災架構、智慧倍率/專線分組、國旗萬國對齊系統，以及 **Argo 隧道 2.0 自動化生成器**。支援將各類代理節點一鍵轉換為 **Sing-Box / Clash Meta (Mihomo) / Surge 5 / Quantumult X / Loon / Base64** 格式，亦可作為第三方轉換前端（如 `sub-web`）的標準後端。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sammy0101/cf-sub-converter)

---

## 🌟 核心特性

### 1. 🔌 全主流與新興協議深度解析
- 完整支援 **VLESS**（含最新 `xhttp` / `splithttp`、`Reality`、`Vision`、`WebSocket`、`gRPC`）。
- 完整支援 **WireGuard** / **Cloudflare WARP**（雙棧 IPv4/IPv6、Reserved 欄位相容）。
- 完整支援 **Shadowsocks-2022**（`2022-blake3-*` 多端口與密鑰）、**Trojan**、**VMess**、**Hysteria 2 (`hy2`)**、**TUIC**、**AnyTLS**。

### 2. 📱 全生態客戶端格式適配
- **自適應識別 (Adaptive)**：自動依據請求客戶端的 `User-Agent` 回傳對應格式。
- **Clash Meta (Mihomo)**：YAML 格式，內建流量嗅探、Fake-IP、DoH 分流與動態策略組。
- **Sing-Box**：標準 JSON 格式，支援 Mixed TUN 堆疊、獨立 DNS 規則與出站映射。
- **Surge 5**：標準 `.conf` 格式，支援 Proxy、Proxy Group 與分流規則。
- **Quantumult X**：標準 `server_remote` 節點清單格式。
- **Loon**：標準 `[Proxy]` 格式。
- **Base64**：通用明文與編碼格式，適用於 v2rayNG、PassWall、Shadowrocket 等。

### 3. 🛡️ 99.99% 高可用 SWR 容災架構 (Zero Downtime)
- **Stale-While-Revalidate + KV 快取**：遠端規則模板自動在邊緣快取，背景非同步靜默更新。
- **三重容災降級保證**：`KV 快取優先` ➔ `GitHub 即時獲取` ➔ `內嵌應急模板兜底`，徹底杜絕因 GitHub 429 限流或網路波動導致轉換失敗。

### 4. 🏎️ 智慧倍率與專線動態策略組
- **倍率辨識**：自動識別節點名稱中的倍率特徵（如 `0.1x`、`0.5X`、`0.2倍`），並在 Sing-Box 與 Clash Meta 中動態建立「🏎️ 低倍率節點」策略組。
- **專線辨識**：自動擷取 `IPLC`、`IEPL`、`專線`、`內網` 特徵，動態生成「⚡ 專線加速」策略組。

### 5. 🌀 Argo 隧道 2.0 一鍵生成器
- **優選 IP / 官方域名注入**：支援填入 Cloudflare Clean IP（如 `104.16.80.1`）或優選網域，自動完成連接伺服器與 SNI/Host 映射，顯著降低延遲。
- **極簡 VPS 命令**：腳本自動上傳至 KV 快取，透過 `curl -sSL ... | bash` 極速完成部署。
- **智慧探測與修復**：VPS 端自動探測 443 / 80 本地監聽連接埠、TLS 狀態與 Host Header 重寫。

### 6. 🔍 智慧篩選、名稱替換與黃金國旗排版
- **雙向過濾**：支援「僅保留」與「排除」規則（多組用 `|` 隔開，如 `HK|TW` 或 `5x`），內建 `x`/`X`/`×` 字符相容匹配。
- **名稱替換**：支援 `DEL-關鍵字`（刪除）、`尋找-替換`，以及 `ALL-新名稱`（一鍵統改所有節點名稱）。
- **黃金 22 地區國旗排序**：自動為節點補上國旗 Emoji，依亞太核心（港、台、日、星、韓）➔ 歐美主流（美、英、加、澳）順序緊密分群，並自動對重複節點編號。

### 7. 📊 流量與到期日加總透傳
- 自動從上游多個機場擷取並加總上傳、下載與總流量，計算最近的到期時間，透過標準 `subscription-userinfo` 標頭透傳，完美點亮客戶端流量資訊條。

---

## 🚀 部署教學

### 方法一：一鍵快速部署 (最推薦、零設定)

點擊本說明文件上方的 **Deploy to Cloudflare Workers** 藍色按鈕。
- Cloudflare 網頁精靈會引導您登入，並**自動建立並綁定 KV 命名空間（`SUB_CACHE`）**。
- 自動建立 GitHub 複製倉庫，後續 `git push` 即自動觸發 Cloudflare CI/CD 部署。

---

### 方法二：本地 Wrangler 手動部署

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

## 📖 使用指南

### 1. 視覺化 Web 面板
訪問您部署完成的 Workers 網址：
- **資料來源設定**：貼上機場訂閱連結或各類協議節點（支援多行混合輸入）。
- **過濾與替換**：設定保留/排除關鍵字或名稱替換規則。
- **短連結雲端儲存**：設定自訂短代碼，規則將自動打包存入 KV。
- **多平台訂閱面板**：一鍵複製對應客戶端連結，或點擊 QR Code 按鈕掃描行動條碼。
- **配置收藏管理**：可隨時儲存、編輯、一鍵載入常用配置，卡片上直觀顯示「保 / 排 / 替」規則標籤。

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

**完整調用範例**：
```http
# 轉換原始訂閱為 Clash Meta 格式，僅保留香港，並刪除廣告名稱
https://your-worker.workers.dev/sub?url=<URL編碼>&target=clash&include=HK&rename=DEL-[廣告]

# 讀取已存於雲端 KV 的短連結配置
https://your-worker.workers.dev/<自訂短連結名稱>?target=singbox
```

---

## 🛡️ 內建分流群組 (Sing-Box / Clash Meta)

| 圖示 | 策略組名稱 | 路由邏輯 |
| :--- | :--- | :--- |
| 🏎️ | 低倍率節點 | 自動彙整倍率 `< 1.0x` 的節點（省流專用） |
| ⚡ | 專線加速 | 自動彙整包含 `IPLC` / `IEPL` / `專線` 的低延遲節點 |
| 🚀 | 節點選擇 | 手動指定出站節點 |
| ⚡ | 自動選擇 | URL Test 自動測速切換最低延遲節點 |
| 💬 | AI 服務 | 針對 OpenAI / Claude / Gemini 專屬分流 |
| 🍎 | 蘋果服務 | Apple 相關服務直連或代理 |
| Ⓜ️ | 微軟服務 | Microsoft 服務直連或代理 |
| 🎮 | 遊戲平台 | Steam / Epic / EA / Ubisoft / Blizzard |
| 🌐 | 非中國 | 全球主流網站（Google、Telegram、YouTube 等） |
| 🇨🇳 | 國內服務 | 中國大陸 IP 與網域自動精準直連 |
| 🏠 | 私有網絡 | 區域網路 (LAN) 直連 |
| 🛑 | 廣告攔截 | 阻擋常見廣告與追蹤器 (AdBlock) |
| 🐟 | 漏網之魚 | Final Match 未命中規則之預設路由 |

---

## 📁 專案架構

```text
cf-sub-converter/
├── src/
│   ├── index.ts          # Worker 核心路由、並發請求控制、User-Agent 辨識與 API 接口
│   ├── constants.ts      # 響應式深色 UI 模板、QR Code 生成器與 SWR 內嵌降級規則
│   ├── parser.ts         # 萬能節點解析器 (VLESS SplitHTTP, WireGuard, SS-2022, Hy2, TUIC 等)
│   ├── generator.ts      # 多平台格式生成器 (Sing-Box, Clash, Surge 5, QuanX, Loon, Base64)
│   ├── utils.ts          # 倍率與專線特徵提取、Base64 安全編碼、萬國國旗對齊演算法
│   └── types.ts          # 嚴格 TypeScript 類型定義
├── argo.sh               # VPS Argo 隧道 2.0 一鍵安裝與自我修復通用腳本
├── Sing-Box_Rules.JSON   # 遠端 Sing-Box 混合 TUN 規則模板
├── Clash_Rules.YAML      # 遠端 Clash Meta (Mihomo) 規則模板
└── wrangler.toml         # Cloudflare Workers 配置檔
```

---

## ⚠️ 免責聲明

本專案僅供網路安全、分散式架構學習與技術交流使用，不提供任何代理伺服器或節點服務。請使用者自覺遵守當地法律法規，切勿用於任何非法用途。
