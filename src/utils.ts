import { ProxyNode } from "./types";

export function safeBase64Decode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  try {
    return atob(str);
  } catch {
    return "";
  }
}

export function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export function deduplicateNodeNames(nodes: ProxyNode[]): ProxyNode[] {
  const nameCounts = new Map<string, number>();
  
  return nodes.map(node => {
    let finalName = node.name;
    if (nameCounts.has(node.name)) {
      const count = nameCounts.get(node.name)! + 1;
      nameCounts.set(node.name, count);
      finalName = `${node.name} ${count}`;
    } else {
      nameCounts.set(node.name, 1);
    }
    
    // Update internal names
    const newNode = { ...node, name: finalName };
    if (newNode.singboxObj) newNode.singboxObj.tag = finalName;
    if (newNode.clashObj) newNode.clashObj.name = finalName;
    
    return newNode;
  });
}
