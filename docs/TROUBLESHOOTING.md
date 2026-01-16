# Guia de Solução de Problemas

Este guia fornece soluções para problemas comuns encontrados no Sistema de Consulta CNAE.

## Índice

- [Problemas de Instalação](#problemas-de-instalação)
- [Problemas de Configuração](#problemas-de-configuração)
- [Problemas com o Chatbot](#problemas-com-o-chatbot)
- [Problemas de Rate Limiting](#problemas-de-rate-limiting)
- [Problemas com Supabase](#problemas-com-supabase)
- [Problemas de Build/Deploy](#problemas-de-builddeploy)
- [Problemas de Performance](#problemas-de-performance)
- [FAQ](#faq)

## Problemas de Instalação

### Erro: "Cannot find module 'next'"

**Sintoma:**
```
Error: Cannot find module 'next'
```

**Causa:** Dependências não instaladas

**Solução:**
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Node version mismatch"

**Sintoma:**
```
Error: The engine "node" is incompatible with this module
```

**Causa:** Versão do Node.js incompatível

**Solução:**
```bash
# Verificar versão
node -v  # Deve ser >= 18.17.0

# Instalar/atualizar Node via nvm
nvm install 18
nvm use 18
```

### npm install falha com erro de permissão

**Sintoma:**
```
EACCES: permission denied
```

**Solução:**
```bash
# Não use sudo! Em vez disso:
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Ou reinstale Node via nvm
```

## Problemas de Configuração

### Erro: "GROQ_API_KEY não configurada"

**Sintoma:**
```
❌ Invalid server environment variables:
  - GROQ_API_KEY: Required
```

**Solução:**

1. **Verifique se o arquivo existe:**
```bash
ls -la .env.local
```

2. **Verifique o conteúdo:**
```bash
cat .env.local | grep GROQ
```

3. **Se não existir, crie:**
```bash
cp .env.example .env.local
# Edite .env.local e adicione sua chave
```

4. **Obtenha a chave:**
   - Acesse [console.groq.com](https://console.groq.com)
   - Crie uma conta gratuita
   - Vá em "API Keys" → "Create API Key"
   - Copie a chave (começa com `gsk_`)

5. **Reinicie o servidor:**
```bash
npm run dev
```

### Erro: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL"

**Sintoma:**
```
NEXT_PUBLIC_SUPABASE_URL must be a valid URL
```

**Causa:** URL do Supabase inválida ou não configurada

**Solução:**

1. **Obtenha a URL correta:**
   - Acesse [app.supabase.com](https://app.supabase.com)
   - Selecione seu projeto
   - Settings → API
   - Copie "Project URL"

2. **Formato correto:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
# NÃO: supabase.co (sem https)
# NÃO: https://app.supabase.com (errado)
```

3. **Reinicie o servidor**

### Variáveis de ambiente não carregam

**Sintoma:** Erro "undefined" ao acessar env vars

**Soluções:**

1. **Arquivo correto:** Deve ser `.env.local` (não `.env`)

2. **Reinicie o servidor:**
```bash
# Ctrl+C para parar
npm run dev
```

3. **Next.js ignora mudanças em .env durante dev:**
```bash
# Sempre reinicie após mudar .env.local
```

4. **Variáveis públicas precisam de prefixo:**
```env
# ✅ CORRETO - Acessível no cliente
NEXT_PUBLIC_SUPABASE_URL=...

# ❌ ERRADO - Só server-side
SUPABASE_URL=...
```

## Problemas com o Chatbot

### Chatbot não responde

**Sintoma:** Spinner de loading infinito ou erro silencioso

**Diagnóstico:**

1. **Verifique console do navegador:**
```
F12 → Console → Procure por erros
```

2. **Verifique logs do servidor:**
```bash
# Terminal onde npm run dev está rodando
```

**Soluções por erro:**

#### Erro: Network error

**Causa:** API não acessível

**Solução:**
```bash
# Verifique se o servidor está rodando
curl http://localhost:3000/api/chat
# Deve retornar: {"status":"ok","message":"Chatbot API está funcionando"}
```

#### Erro: 429 Too Many Requests

**Causa:** Rate limit excedido

**Solução:**
```bash
# Aguarde 1 minuto
# Ou aumente o limite em src/lib/ratelimit-memory.ts:
rateLimitMemory(ip, 30, 60 * 1000) // 30 req/min
```

#### Erro: 500 Internal Server Error

**Causa:** Erro no servidor

**Solução:**

1. **Verifique logs:**
```bash
# Procure por [ERROR] no terminal
```

2. **Problemas comuns:**

**a) Groq API Key inválida:**
```bash
# Teste a key manualmente
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

**b) Supabase não acessível:**
```bash
# Teste conexão
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/
```

**c) Timeout:**
```typescript
// Aumente timeout em route.ts se necessário
// (padrão: 30s em serverless)
```

### Chatbot retorna "Desculpe, não consegui processar"

**Sintoma:** Resposta genérica de erro

**Causas possíveis:**

#### 1. Detecção de Prompt Injection

**Diagnóstico:**
```bash
# Verifique logs
grep "Prompt injection" logs.txt
```

**Solução:**
- Se falso positivo, ajuste padrões em `detectPromptInjection()`
- Se tentativa real, está funcionando corretamente

#### 2. LLM retornou JSON inválido

**Diagnóstico:**
```bash
# Logs mostram "LLM JSON parsing failed"
```

**Solução:**
- Geralmente temporário
- Tente novamente
- Se persistir, verifique system prompts

#### 3. Validação Zod falhou

**Diagnóstico:**
```bash
# Logs: "LLM validation failed"
```

**Solução:**
```typescript
// Ajuste schema se necessário em route.ts
const LLMResponseSchema = z.discriminatedUnion(...)
```

### Respostas do chatbot estão em inglês

**Sintoma:** LLM responde em inglês apesar dos prompts em português

**Solução:**

1. **Verifique system prompts:**
```typescript
// src/lib/chat/systemPrompt.ts
// Deve ter: "Responda em PORTUGUÊS"
```

2. **Adicione instrução explícita:**
```typescript
const userPrompt = `${JSON_FORMAT_INSTRUCTIONS}

Pergunta do usuário: "${sanitizedQuestion}"

IMPORTANTE: Responda SEMPRE em português brasileiro.
`;
```

3. **Force no prompt de formatação:**
```typescript
// FORMAT_SYSTEM_PROMPT deve ter:
"- Responda em PORTUGUÊS"
```

### Chatbot não encontra CNAEs que existem

**Sintoma:** "Não encontrei resultados" para CNAEs válidos

**Diagnóstico:**

1. **Verifique no banco:**
```sql
SELECT * FROM cnae_item_lc WHERE cnae = 6920601;
```

2. **Verifique normalização:**
```typescript
// CNAE é armazenado sem formatação: 6920601
// Não: 6920-6/01
```

**Solução:**

1. **Se CNAE existe no banco mas não encontra:**
```typescript
// Verifique lógica de normalização em allowedQueries.ts
const cleanCnae = params.cnae.replace(/[^\d]/g, ''); // Remove não-dígitos
```

2. **Se CNAE não existe:**
- Importe dados corretos
- Verifique script de importação

## Problemas de Rate Limiting

### Erro 429 com poucos requests

**Sintoma:** Rate limit acionado rapidamente mesmo com poucos requests

**Causa:** Multiple instâncias serverless ou limite muito baixo

**Solução:**

1. **Aumente o limite:**
```typescript
// src/app/api/chat/route.ts
rateLimitMemory(ip, 30, 60 * 1000) // 30 req/min ao invés de 20
```

2. **Para produção com alto tráfego:**
```bash
# Implemente Redis/Upstash para rate limiting distribuído
npm install @upstash/redis @upstash/ratelimit
```

### Headers de rate limit não aparecem

**Sintoma:** `X-RateLimit-*` headers ausentes

**Verificação:**
```bash
curl -I http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"test"}'
```

**Solução:**

1. **Verifique se está retornando headers:**
```typescript
// route.ts deve ter:
return NextResponse.json(data, {
  headers: {
    'X-RateLimit-Limit': '20',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString(),
  }
});
```

2. **CORS pode remover headers:**
```typescript
// middleware.ts - adicione headers CORS se necessário
```

### Rate limit não reseta

**Sintoma:** Continua bloqueado após tempo de reset

**Causa:** Cleanup de buckets não funcionando

**Solução:**
```typescript
// ratelimit-memory.ts
// Verifique função cleanup()
// Pode reduzir CLEANUP_INTERVAL para testes
```

## Problemas com Supabase

### Erro: "Failed to fetch"

**Sintoma:**
```
Failed to fetch from Supabase
```

**Diagnóstico:**

1. **Teste conexão:**
```bash
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

2. **Verifique status do Supabase:**
- [status.supabase.com](https://status.supabase.com)

**Soluções:**

1. **Credenciais incorretas:**
```bash
# Verifique URL e key no dashboard
# Settings → API
```

2. **Projeto pausado:**
- Supabase pausa projetos inativos no free tier
- Acesse dashboard e reative

3. **Firewall/proxy:**
```bash
# Teste sem VPN/proxy
```

### RLS bloqueia queries legítimas

**Sintoma:** SELECT retorna vazio ou erro de permissão

**Diagnóstico:**
```bash
npm run security:verify-rls
```

**Solução:**

1. **Verifique se RLS está habilitado:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'cnae_item_lc';
```

2. **Verifique políticas:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'cnae_item_lc';
```

3. **Re-crie políticas:**
```sql
-- Remover políticas existentes
DROP POLICY IF EXISTS "allow_select" ON cnae_item_lc;

-- Recriar
CREATE POLICY "allow_select" ON cnae_item_lc 
  FOR SELECT TO anon USING (true);
```

### Dados não aparecem nas queries

**Sintoma:** Query retorna array vazio

**Diagnóstico:**

1. **Verifique se dados existem:**
```sql
SELECT COUNT(*) FROM cnae_item_lc;
```

2. **Verifique query específica:**
```sql
-- No Supabase SQL Editor
SELECT * FROM cnae_item_lc WHERE cnae = 6920601;
```

**Solução:**

1. **Se tabela vazia:**
```bash
# Importe dados
# Execute script de seed/import
```

2. **Se query específica falha:**
```typescript
// Verifique lógica em allowedQueries.ts
// Debug: console.log o SQL gerado
```

## Problemas de Build/Deploy

### Build falha: "Type error"

**Sintoma:**
```
Type error: Property 'xxx' does not exist on type 'yyy'
```

**Solução:**

1. **Limpe .next:**
```bash
rm -rf .next
npm run build
```

2. **Verifique tipos:**
```bash
npx tsc --noEmit
```

3. **Corrija erros de tipo:**
```typescript
// Adicione tipos faltantes
// Ajuste interfaces
```

### Build falha: "Module not found"

**Sintoma:**
```
Module not found: Can't resolve '@/lib/...'
```

**Solução:**

1. **Verifique tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

2. **Reconstrua:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Deploy na Vercel falha

**Sintoma:** Build passa localmente mas falha na Vercel

**Diagnóstico:**
```bash
# Simule build da Vercel
npm run build
```

**Soluções:**

1. **Variáveis de ambiente:**
```
Vercel Dashboard → Settings → Environment Variables
Adicione as 3 variáveis necessárias
```

2. **Node version:**
```json
// package.json
"engines": {
  "node": ">=18.17.0"
}
```

3. **Build logs:**
```bash
# Acesse Vercel → Deployments → [deployment] → Building
# Procure por erros específicos
```

### Vercel deploy lento

**Sintoma:** Build demora > 5 minutos

**Solução:**

1. **Cache:**
```bash
# Vercel cacheia node_modules automaticamente
# Se der problema, limpe:
# Dashboard → Settings → General → Clear Cache
```

2. **Dependências:**
```bash
# Remova dependências não usadas
npm prune
```

## Problemas de Performance

### Chatbot responde lentamente

**Sintoma:** Demora > 5s para responder

**Diagnóstico:**

1. **Verifique latência do Groq:**
```bash
# Logs devem mostrar tempo de resposta
```

2. **Verifique queries Supabase:**
```sql
-- No Supabase, ative Query Performance
```

**Soluções:**

1. **Cache hit rate baixo:**
```typescript
// Aumente TTL do cache
const CACHE_TTL = 10 * 60 * 1000; // 10 min
```

2. **Groq lento:**
- Verifique [status.groq.com](https://groq.com/status)
- Pode estar próximo do limite de rate

3. **Queries lentas:**
```sql
-- Adicione índices
CREATE INDEX idx_cnae_desc ON cnae_item_lc(cnae_descricao);
```

### Página carrega lentamente

**Sintoma:** First Load > 3s

**Diagnóstico:**
```bash
# Use Lighthouse
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

**Soluções:**

1. **Imagens não otimizadas:**
```typescript
// Use Next.js Image
import Image from 'next/image';
```

2. **Bundle muito grande:**
```bash
# Analise bundle
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

3. **Server Components:**
```typescript
// Use Server Components quando possível
// Remova 'use client' desnecessários
```

## FAQ

### Como testar a API diretamente?

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"CNAE 6920601"}'
```

### Como ver logs em produção?

```bash
# Via CLI
vercel logs <deployment-url>

# Seguir logs
vercel logs --follow

# Filtrar por erro
vercel logs | grep -i error
```

### Como aumentar o limite de rate limiting?

```typescript
// src/app/api/chat/route.ts
// Linha ~543
rateLimitMemory(ip, 30, 60 * 1000) // 30 req/min ao invés de 20
```

### Como adicionar uma nova query permitida?

1. **Adicione em `allowedQueries.ts`:**
```typescript
export const allowedQueries = {
  // ... queries existentes
  
  nova_query: async (params: QueryParams): Promise<QueryResult> => {
    const { data, error } = await supabase
      .from('tabela')
      .select('*')
      .eq('campo', params.valor)
      .limit(10);
      
    return { success: !error, data };
  }
};
```

2. **Atualize type `QueryId`:**
```typescript
export type QueryId = 'cnae_to_item' | 'nova_query' | ...;
```

3. **Atualize `systemPrompt.ts`:**
```typescript
// Adicione instruções sobre quando usar nova_query
```

### Como desabilitar detecção de prompt injection (não recomendado)?

```typescript
// src/app/api/chat/route.ts
// Comente a verificação (apenas para debug!)
/*
if (detectPromptInjection(question)) {
  logger.promptInjection(question);
  return { needsQuery: false, directResponse: '...' };
}
*/
```

### Como limpar cache do chatbot?

**No código:**
```typescript
// src/app/api/chat/route.ts
cache.clear(); // Adicione esta linha temporariamente
```

**Ou aguarde:**
- Cache expira automaticamente após 5 minutos

### Como debugar o LLM?

```typescript
// src/app/api/chat/route.ts
// Em processWithGroq(), adicione:
console.log('LLM Input:', userPrompt);
console.log('LLM Output:', text);
console.log('Parsed:', parsed);
```

### Como rodar o projeto sem Groq (offline)?

Não é possível - o Groq é essencial. Alternativas:

1. **Mock para testes:**
```typescript
// route.ts - adicione flag de desenvolvimento
if (process.env.NODE_ENV === 'test') {
  return mockResponse(question);
}
```

2. **Ollama local (substituto):**
```bash
# Instale Ollama
# Use llama2 local
# Modifique código para usar Ollama ao invés de Groq
```

## Ainda com Problemas?

1. **Verifique Issues no GitHub**
2. **Verifique logs detalhadamente:**
```bash
# Desenvolvimento
# Veja terminal onde npm run dev está rodando

# Produção
vercel logs --follow
```

3. **Limpe tudo e recomece:**
```bash
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

4. **Crie um issue detalhado:**
- Descrição do problema
- Passos para reproduzir
- Logs relevantes
- Ambiente (OS, Node version, etc)

---

**Última Atualização:** Janeiro 2026  
**Precisa de mais ajuda?** Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para entrar em contato.
