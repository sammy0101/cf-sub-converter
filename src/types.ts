export interface Env {
  SUB_CACHE: KVNamespace;
}

export interface WireGuardConfig {
  privateKey: string;
  localAddress: string[];
  publicKey?: string;
  presharedKey?: string;
  mtu?: number;
  reserved?: number[];
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
  reality?: { publicKey: string; shortId: string };
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
  // 標籤特徵 (B2 方案)
  multiplier?: number;
  isIplc?: boolean;
}

export interface CachedTemplate {
  content: string;
  updatedAt: number;
}
