/**
 * Rate Limiting em Memória (Best-Effort para Serverless)
 * 
 * ATENÇÃO: Esta implementação é best-effort em ambientes serverless.
 * Cada instância da função mantém seu próprio contador em memória.
 * Para rate limiting distribuído 100% preciso, use Redis/Upstash.
 * 
 * Adequado para:
 * - Tráfego baixo a médio
 * - Proteção contra abuso casual
 * - Ambientes sem orçamento para Redis
 */

import 'server-only';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// Map em memória para armazenar buckets de rate limiting
const buckets = new Map<string, RateLimitBucket>();

// Controle de limpeza periódica
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos

/**
 * Remove buckets expirados da memória para evitar crescimento indefinido
 */
function cleanup() {
  const now = Date.now();
  
  // Só executa limpeza se passou tempo suficiente
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  const keysToDelete: string[] = [];
  
  buckets.forEach((bucket, key) => {
    if (now > bucket.resetAt) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => buckets.delete(key));
  lastCleanup = now;
  
  if (keysToDelete.length > 0) {
    console.log(`[Rate Limit] Limpeza: ${keysToDelete.length} buckets removidos`);
  }
}

/**
 * Extrai IP do cliente de forma segura
 * 
 * Em produção (Vercel), usa headers de proxy:
 * - x-forwarded-for: lista de IPs (client, proxy1, proxy2...)
 * - x-real-ip: IP real do cliente
 * 
 * @param req - Request object do Next.js
 * @returns IP do cliente ou 'unknown'
 */
export function getClientIp(req: Request): string {
  // Headers comuns de proxies/CDNs
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for pode conter múltiplos IPs separados por vírgula
    // O primeiro é o IP real do cliente
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback para evitar erros (em desenvolvimento local, por exemplo)
  return 'unknown';
}

/**
 * Verifica rate limit em memória (best-effort)
 * 
 * Implementa sliding window simples:
 * - Conta requisições dentro de uma janela de tempo
 * - Reseta contador quando a janela expira
 * - Não é perfeito em serverless, mas funciona para casos básicos
 * 
 * @param key - Identificador único (geralmente IP do cliente)
 * @param limit - Número máximo de requisições permitidas
 * @param windowMs - Janela de tempo em milissegundos
 * @returns Objeto com ok (permitido), remaining (requisições restantes), resetAt (timestamp do reset)
 */
export function rateLimitMemory(
  key: string,
  limit: number = 20,
  windowMs: number = 60 * 1000 // 60 segundos
): { ok: boolean; remaining: number; resetAt: number } {
  // Limpeza ocasional para não crescer indefinidamente
  cleanup();
  
  const now = Date.now();
  const bucket = buckets.get(key);
  
  // Primeiro acesso ou janela expirou - criar novo bucket
  if (!bucket || now > bucket.resetAt) {
    const newBucket: RateLimitBucket = {
      count: 1,
      resetAt: now + windowMs
    };
    
    buckets.set(key, newBucket);
    
    return {
      ok: true,
      remaining: limit - 1,
      resetAt: newBucket.resetAt
    };
  }
  
  // Dentro da janela - verificar se atingiu o limite
  if (bucket.count >= limit) {
    // Limite atingido - bloquear
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.resetAt
    };
  }
  
  // Ainda tem espaço - incrementar contador
  bucket.count++;
  
  return {
    ok: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt
  };
}

/**
 * Retorna estatísticas do rate limiter (útil para debugging)
 */
export function getRateLimitStats(): {
  totalBuckets: number;
  oldestBucket: number | null;
  newestBucket: number | null;
} {
  const now = Date.now();
  let oldest: number | null = null;
  let newest: number | null = null;
  
  buckets.forEach((bucket) => {
    const age = now - (bucket.resetAt - 60000); // Aproximação da idade
    if (oldest === null || age > oldest) oldest = age;
    if (newest === null || age < newest) newest = age;
  });
  
  return {
    totalBuckets: buckets.size,
    oldestBucket: oldest,
    newestBucket: newest
  };
}
