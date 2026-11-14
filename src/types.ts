export interface Env {
  SUB_CACHE: KVNamespace;
  PAGE_PASSWORD?: string;
}

export interface WireGuardConfig {
  privateKey: string;
  localAddress: string[];
  publicKey?: string;
  presharedKey?: string;
  mtu?: number;
  reserved?: number[];
  dns?: string;
}

export interface MasqueConfig {
  privateKey: string;
  publicKey: string;
  localIpv4?: string;
  localIpv6?: string;
  mtu?: number;
  uri?: string;
  sni?: string;
  congestion_controller?: string;
  dns?: string[];
}

export interface RealityConfig {
  publicKey: string;
  shortId: string;
  spiderX?: string;
  supportX25519Mlkem768?: boolean;
}

export interface ProxyNode {
  type: string;
  name: string;
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  cipher?: string;
  udp?: boolean;
  tls?: boolean;
  sni?: string;
  alpn?: string[];
  fingerprint?: string;
  flow?: string;
  network?: string;
  wsPath?: string;
  wsHeaders?: Record<string, string>;
  reality?: RealityConfig;
  obfs?: string;
  obfsPassword?: string;
  skipCertVerify?: boolean;
  singboxObj?: Record<string, unknown>;
  clashObj?: Record<string, unknown>;
  congestion_control?: string;
  udp_relay_mode?: string;
  // VLESS SplitHTTP (xhttp)
  xhttpPath?: string;
  xhttpHost?: string;
  xhttpMode?: string;
  // WireGuard / WARP
  wireguard?: WireGuardConfig;
  // Cloudflare WARP MASQUE
  masque?: MasqueConfig;
  // ECH (Encrypted Client Hello)
  ech?: boolean;
  echQueryServerName?: string;
  echDoh?: string;
  // 標籤特徵
  multiplier?: number;
  isIplc?: boolean;
}

export interface CachedTemplate {
  content: string;
  updatedAt: number;
}

export type OperationLogAction =
  | '獲取訂閱'
  | '登入後台'
  | '登入失敗'
  | '新增配置'
  | '修改配置'
  | '刪除配置'
  | '儲存短連結';

export interface OperationLogEntry {
  time: string;
  ip: string;
  region: string;
  asn: string;
  action: OperationLogAction;
  url: string;
  ua: string;
}
