// src/generators/uri.ts
import { ProxyNode } from '../types';
import { utf8ToBase64 } from '../utils';

function formatHost(host: string): string {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

export function toRawLinks(nodes: ProxyNode[]): string {
  const links = nodes
    .map(node => {
      try {
        const host = formatHost(node.server);

        if (node.type === 'vless') {
          const params = new URLSearchParams();
          params.set('encryption', 'none');
          params.set('security', node.reality ? 'reality' : node.tls ? 'tls' : 'none');
          params.set('type', node.network || 'tcp');
          if (node.flow) params.set('flow', node.flow);
          if (node.sni) params.set('sni', node.sni);
          if (node.fingerprint) params.set('fp', node.fingerprint);
          if (node.ech) {
            if (node.echDoh && node.echQueryServerName) {
              params.set('ech', `${node.echQueryServerName}+${node.echDoh}`);
            } else if (node.echDoh) {
              params.set('ech', node.echDoh);
            } else if (node.echQueryServerName) {
              params.set('ech', node.echQueryServerName);
            } else {
              params.set('ech', '1');
            }
          }
          if (node.reality) {
            params.set('pbk', node.reality.publicKey);
            params.set('sid', node.reality.shortId);
            if (node.reality.spiderX) params.set('spx', node.reality.spiderX);
          }
          if (node.network === 'ws') {
            if (node.wsPath) params.set('path', node.wsPath);
            if (node.wsHeaders?.Host) params.set('host', node.wsHeaders.Host);
          }
          if (node.network === 'xhttp' || node.network === 'splithttp') {
            if (node.xhttpPath) params.set('path', node.xhttpPath);
            if (node.xhttpHost) params.set('host', node.xhttpHost);
            if (node.xhttpMode) params.set('mode', node.xhttpMode);
          }
          if (node.network === 'grpc' && node.grpcServiceName) {
            params.set('serviceName', node.grpcServiceName);
          }
          return `vless://${node.uuid}@${host}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
        }
        if (node.type === 'hysteria2') {
          const params = new URLSearchParams();
          if (node.sni) params.set('sni', node.sni);
          if (node.obfs) {
            params.set('obfs', node.obfs);
            if (node.obfsPassword) params.set('obfs-password', node.obfsPassword);
          }
          if (node.skipCertVerify) params.set('insecure', '1');
          return `hysteria2://${node.password}@${host}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
        }
        if (node.type === 'vmess') {
          const vmessObj = {
            v: '2',
            ps: node.name,
            add: node.server,
            port: node.port,
            id: node.uuid,
            aid: (node.clashObj as Record<string, unknown>)?.alterId || 0,
            scy: 'auto',
            net: node.network,
            type: 'none',
            host: node.wsHeaders?.Host || '',
            path: node.wsPath || '',
            tls: node.tls ? 'tls' : '',
            sni: node.sni || ''
          };
          return 'vmess://' + utf8ToBase64(JSON.stringify(vmessObj));
        }
        if (node.type === 'shadowsocks') {
          const method = encodeURIComponent(node.cipher || '');
          const pass = encodeURIComponent(node.password || '');
          const params = new URLSearchParams();
          if (node.tls) {
            params.set('security', 'tls');
            if (node.sni) params.set('sni', node.sni);
            if (node.alpn) params.set('alpn', node.alpn.join(','));
            if (node.fingerprint) params.set('fp', node.fingerprint);
            if (node.ech) {
              if (node.echDoh && node.echQueryServerName) {
                params.set('ech', `${node.echQueryServerName}+${node.echDoh}`);
              } else if (node.echDoh) {
                params.set('ech', node.echDoh);
              } else if (node.echQueryServerName) {
                params.set('ech', node.echQueryServerName);
              } else {
                params.set('ech', '1');
              }
            }
            params.set('type', node.network || 'tcp');
          }
          const clashPlugin = (node.clashObj as Record<string, unknown>)?.plugin as string | undefined;
          if (clashPlugin && !node.tls) {
            const pluginOpts = (node.clashObj as Record<string, unknown>)?.['plugin-opts'] as Record<string, string> | undefined;
            const optStr = pluginOpts ? ';' + new URLSearchParams(pluginOpts).toString().replace(/&/g, ';') : '';
            params.set('plugin', clashPlugin + optStr);
          }
          const query = params.toString();
          return `ss://${method}:${pass}@${host}:${node.port}${query ? '/?' + query : ''}#${encodeURIComponent(node.name)}`;
        }
        if (node.type === 'tuic') {
          const params = new URLSearchParams();
          if (node.sni) params.set('sni', node.sni);
          if (node.congestion_control) params.set('congestion_control', node.congestion_control);
          if (node.udp_relay_mode) params.set('udp_relay_mode', node.udp_relay_mode);
          if (node.alpn && node.alpn.length > 0) params.set('alpn', node.alpn.join(','));
          if (node.skipCertVerify) params.set('allow_insecure', '1');
          return `tuic://${node.uuid || ''}:${node.password || ''}@${host}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
        }
        if (node.type === 'anytls') {
          const params = new URLSearchParams();
          params.set('security', 'tls');
          if (node.sni) params.set('sni', node.sni);
          params.set('insecure', node.skipCertVerify ? '1' : '0');
          if (node.fingerprint) params.set('fp', node.fingerprint);
          if (node.alpn && node.alpn.length > 0) params.set('alpn', node.alpn.join(','));
          params.set('type', 'tcp');
          return `anytls://${node.password}@${host}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
        }
        if (node.type === 'trojan') {
          const params = new URLSearchParams();
          if (node.sni) params.set('sni', node.sni);
          if (node.skipCertVerify) params.set('allowInsecure', '1');
          if (node.ech) {
            if (node.echDoh && node.echQueryServerName) {
              params.set('ech', `${node.echQueryServerName}+${node.echDoh}`);
            } else if (node.echDoh) {
              params.set('ech', node.echDoh);
            } else if (node.echQueryServerName) {
              params.set('ech', node.echQueryServerName);
            } else {
              params.set('ech', '1');
            }
          }
          return `trojan://${node.password}@${host}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
        }
        if (node.type === 'wireguard' && node.wireguard) {
          const wg = node.wireguard;
          const cleanIp = wg.localAddress[0]?.split('/')[0] || '10.2.0.2';
          const params = new URLSearchParams();
          params.set('publickey', wg.publicKey || '');
          params.set('privatekey', wg.privateKey || '');
          params.set('ip', cleanIp);
          params.set('address', cleanIp);
          if (wg.dns) params.set('dns', wg.dns);
          if (wg.presharedKey) params.set('presharedkey', wg.presharedKey);
          params.set('mtu', String(wg.mtu || 1420));
          params.set('keepalive', '25');
          return `wireguard://${host}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
        }
        if (node.type === 'masque' && node.masque) {
          const m = node.masque;
          const params = new URLSearchParams();
          params.set('public_key', m.publicKey);
          if (m.localIpv4) params.set('ip', m.localIpv4.split('/')[0]);
          if (m.localIpv6) params.set('ipv6', m.localIpv6.split('/')[0]);
          if (m.mtu) params.set('mtu', String(m.mtu));
          if (m.uri) params.set('uri', m.uri);
          if (m.sni) params.set('sni', m.sni);

          const cc = m.congestion_controller || 'bbr';
          params.set('cca', cc);
          params.set('cc', cc);
          params.set('congestion_control', cc);
          params.set('congestion_controller', cc);
          params.set('congestion-controller', cc);

          if (m.dns && m.dns.length > 0) params.set('dns', m.dns.join(','));
          return `masque://${encodeURIComponent(m.privateKey)}@${host}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
        }
        return null;
      } catch {
        return null;
      }
    })
    .filter((l): l is string => Boolean(l));

  return links.join('\n');
}

export function toBase64(nodes: ProxyNode[]): string {
  const rawLinks = toRawLinks(nodes);
  return utf8ToBase64(rawLinks);
}
