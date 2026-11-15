// src/generators/legacy.ts
import { ProxyNode } from '../types';

export function toSurge(nodes: ProxyNode[]): string {
  const lines: string[] = ['[Proxy]'];
  const nodeNames: string[] = [];
  const wgSections: string[] = [];

  for (const node of nodes) {
    let line = '';
    const name = node.name.replace(/[,=]/g, '').trim();

    if (node.type === 'shadowsocks') {
      line = `${name} = ss, ${node.server}, ${node.port}, encrypt-method=${node.cipher}, password=${node.password}, udp-relay=true`;
      if (node.sni) line += `, sni=${node.sni}`;
    } else if (node.type === 'trojan') {
      line = `${name} = trojan, ${node.server}, ${node.port}, password=${node.password}, sni=${node.sni || node.server}, skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'}, udp-relay=true`;
      if (node.network === 'ws') {
        line += `, ws=true, ws-path=${node.wsPath || '/'}`;
        if (node.wsHeaders?.Host) line += `, ws-headers=Host:${node.wsHeaders.Host}`;
      }
    } else if (node.type === 'vmess') {
      line = `${name} = vmess, ${node.server}, ${node.port}, username=${node.uuid}, tls=${node.tls ? 'true' : 'false'}, udp-relay=true`;
      if (node.sni) line += `, sni=${node.sni}`;
      if (node.network === 'ws') {
        line += `, ws=true, ws-path=${node.wsPath || '/'}`;
        if (node.wsHeaders?.Host) line += `, ws-headers=Host:${node.wsHeaders.Host}`;
      }
    } else if (node.type === 'vless') {
      line = `${name} = vless, ${node.server}, ${node.port}, username=${node.uuid}, tls=${node.tls ? 'true' : 'false'}, sni=${node.sni || node.server}, skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'}, udp-relay=true`;
      if (node.network === 'ws') {
        line += `, ws=true, ws-path=${node.wsPath || '/'}`;
        if (node.wsHeaders?.Host) line += `, ws-headers=Host:${node.wsHeaders.Host}`;
      }
    } else if (node.type === 'hysteria2') {
      line = `${name} = hysteria2, ${node.server}, ${node.port}, password=${node.password}, sni=${node.sni || node.server}, skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'}, udp-relay=true`;
    } else if (node.type === 'tuic') {
      line = `${name} = tuic, ${node.server}, ${node.port}, token=${node.password}, sni=${node.sni || node.server}, skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'}`;
    } else if (node.type === 'wireguard' && node.wireguard) {
      const wg = node.wireguard;
      const safeSecName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
      line = `${name} = wireguard, section-name=${safeSecName}`;

      let wgSec = `\n[WireGuard ${safeSecName}]\n`;
      wgSec += `private-key = ${wg.privateKey}\n`;
      wgSec += `self-ip = ${wg.localAddress[0]?.split('/')[0] || '10.2.0.2'}\n`;
      if (wg.localAddress[1]) {
        wgSec += `self-ip-v6 = ${wg.localAddress[1]?.split('/')[0]}\n`;
      }
      if (wg.dns) {
        wgSec += `dns-server = ${wg.dns}\n`;
      }
      wgSec += `peer = (public-key = ${wg.publicKey || ''}, allowed-ips = "0.0.0.0/0, ::/0", endpoint = ${node.server}:${node.port}, keepalive = 25)\n`;
      wgSections.push(wgSections.length > 0 ? '\n' + wgSec : wgSec);
    }

    if (line) {
      lines.push(line);
      nodeNames.push(name);
    }
  }

  lines.push('\n[Proxy Group]');
  if (nodeNames.length > 0) {
    lines.push(`🚀 節點選擇 = select, ⚡ 自動選擇, DIRECT, ${nodeNames.join(', ')}`);
    lines.push(`⚡ 自動選擇 = url-test, ${nodeNames.join(', ')}, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50`);
  } else {
    lines.push('🚀 節點選擇 = select, DIRECT');
    lines.push('⚡ 自動選擇 = select, DIRECT');
  }
  lines.push('🐟 漏網之魚 = select, 🚀 節點選擇, DIRECT');

  lines.push('\n[Rule]');
  lines.push('GEOIP,CN,DIRECT');
  lines.push('FINAL,🐟 漏網之魚\n');

  if (wgSections.length > 0) {
    lines.push(wgSections.join('\n'));
  }

  return lines.join('\n');
}

export function toQuantumultX(nodes: ProxyNode[]): string {
  const lines: string[] = [];

  for (const node of nodes) {
    const name = node.name.replace(/[,=]/g, '').trim();

    if (node.type === 'shadowsocks') {
      lines.push(`shadowsocks=${node.server}:${node.port}, method=${node.cipher}, password=${node.password}, fast-open=false, udp-relay=true, tag=${name}`);
    } else if (node.type === 'trojan') {
      lines.push(`trojan=${node.server}:${node.port}, password=${node.password}, over-tls=true, tls-host=${node.sni || node.server}, fast-open=false, udp-relay=true, tag=${name}`);
    } else if (node.type === 'vmess') {
      let vmessLine = `vmess=${node.server}:${node.port}, method=none, password=${node.uuid}, fast-open=false, udp-relay=true, tag=${name}`;
      if (node.tls) vmessLine += `, over-tls=true, tls-host=${node.sni || node.server}`;
      if (node.network === 'ws') vmessLine += `, obfs=ws, obfs-uri=${node.wsPath || '/'}`;
      lines.push(vmessLine);
    } else if (node.type === 'vless') {
      let vlessLine = `vless=${node.server}:${node.port}, method=none, password=${node.uuid}, fast-open=false, udp-relay=true, tag=${name}`;
      if (node.tls) vlessLine += `, over-tls=true, tls-host=${node.sni || node.server}`;
      if (node.network === 'ws') {
        vlessLine += `, obfs=ws, obfs-uri=${node.wsPath || '/'}`;
        if (node.wsHeaders?.Host) vlessLine += `, obfs-host=${node.wsHeaders.Host}`;
      }
      lines.push(vlessLine);
    } else if (node.type === 'hysteria2') {
      lines.push(`hysteria2=${node.server}:${node.port}, password=${node.password}, tls-host=${node.sni || node.server}, skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'}, tag=${name}`);
    }
  }

  if (lines.length === 0) {
    return '# 未在該訂閱中找到相容的節點';
  }

  return lines.join('\n');
}

export function toLoon(nodes: ProxyNode[]): string {
  const lines: string[] = ['[Proxy]'];

  for (const node of nodes) {
    const name = node.name.replace(/,/g, '');
    if (node.type === 'shadowsocks') {
      lines.push(`${name} = Shadowsocks,${node.server},${node.port},${node.cipher},"${node.password}",fast-open=false,udp=true`);
    } else if (node.type === 'trojan') {
      lines.push(`${name} = Trojan,${node.server},${node.port},"${node.password}",sni=${node.sni || node.server},skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'},udp=true`);
    } else if (node.type === 'vless') {
      let l = `${name} = Vless,${node.server},${node.port},"${node.uuid}",tls=${node.tls ? 'true' : 'false'},sni=${node.sni || node.server},skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'},udp=true`;
      if (node.network === 'ws') l += `,transport=ws,path=${node.wsPath || '/'}`;
      lines.push(l);
    } else if (node.type === 'vmess') {
      let v = `${name} = vmess,${node.server},${node.port},auto,"${node.uuid}",fast-open=false,udp=true`;
      if (node.tls) v += `,over-tls=true,tls-name=${node.sni || node.server}`;
      if (node.network === 'ws') v += `,transport=ws,path=${node.wsPath || '/'}`;
      lines.push(v);
    } else if (node.type === 'hysteria2') {
      lines.push(`${name} = Hysteria2,${node.server},${node.port},password=${node.password},sni=${node.sni || node.server},skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'},udp=true`);
    }
  }

  return lines.join('\n');
}
