# Scripts de Segurança

Este diretório contém scripts automatizados para verificação e teste de segurança do sistema.

## Scripts Disponíveis

### 1. verify-rls.ts - Verificação de Row Level Security

Verifica se as políticas de Row Level Security (RLS) do Supabase estão ativas e configuradas corretamente.

**O que testa:**
- ✅ SELECT permitido (usuários podem ler dados)
- ❌ INSERT bloqueado (usuários não podem inserir dados)
- ❌ UPDATE bloqueado (usuários não podem atualizar dados)
- ❌ DELETE bloqueado (usuários não podem deletar dados)

**Uso:**
```bash
# Via npm script (recomendado)
npm run security:verify-rls

# Diretamente
npx tsx scripts/verify-rls.ts
```

**Pré-requisitos:**
- Variáveis de ambiente configuradas:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Output de sucesso:**
```
🔒 Iniciando verificação de Row Level Security (RLS)

📊 Verificando 3 tabelas...

🔍 Testando: cnae_item_lc
  ✅ SELECT: Permitido (1 registros)
  ✅ INSERT: Bloqueado (RLS ativo)
  ✅ UPDATE: Bloqueado (RLS ativo)
  ✅ DELETE: Bloqueado (RLS ativo)
  📝 Status: RLS configurado corretamente ✅

...

============================================================
📊 RESUMO DA VERIFICAÇÃO DE SEGURANÇA
============================================================

✅ OK: 3/3
⚠️  WARNING: 0/3
❌ CRITICAL: 0/3

✅ cnae_item_lc              RLS configurado corretamente ✅
✅ itens_lista_servicos      RLS configurado corretamente ✅
✅ item_lc_ibs_cbs           RLS configurado corretamente ✅

✅ SUCESSO: Todas as tabelas estão protegidas com RLS!
O banco de dados está seguro para uso em produção.
```

**Se falhar:**
1. Acesse Supabase Dashboard → SQL Editor
2. Execute o arquivo `supabase-rls-setup.sql`
3. Execute o script novamente

**Exit codes:**
- `0`: Sucesso (todas as tabelas OK)
- `1`: Falha crítica (RLS não configurado)

---

### 2. test-rate-limit.ts - Teste de Rate Limiting

Testa se o rate limiting da API está funcionando corretamente, enviando múltiplas requisições e verificando se o limite é respeitado.

**O que testa:**
- Taxa de requisições (20 req/minuto por IP)
- Headers de rate limit (`X-RateLimit-*`)
- Resposta 429 (Too Many Requests)
- Tempo de resposta

**Uso:**
```bash
# Testar localmente (recomendado)
npm run security:test-ratelimit

# Testar em produção
npx tsx scripts/test-rate-limit.ts https://seu-site.vercel.app

# Testar URL específica
npx tsx scripts/test-rate-limit.ts http://localhost:3000
```

**Pré-requisitos:**
- Servidor rodando (local ou produção)
- API `/api/chat` acessível

**Output de sucesso:**
```
⏱️  Iniciando teste de Rate Limiting

🎯 URL: http://localhost:3000/api/chat
📊 Requisições: 25
🔒 Limite esperado: 20 req/minuto

======================================================================

✅ #01 | Status: 200 | Remaining: 19 | 145ms
✅ #02 | Status: 200 | Remaining: 18 | 132ms
✅ #03 | Status: 200 | Remaining: 17 | 128ms
...
✅ #20 | Status: 200 | Remaining: 0 | 125ms
❌ #21 | Status: 429 | Reset: 14:25:30 | 89ms
❌ #22 | Status: 429 | Reset: 14:25:30 | 92ms
...

======================================================================
📊 RESUMO DO TESTE DE RATE LIMITING
======================================================================

Total de requisições: 25
✅ Sucessos (200): 20
❌ Bloqueadas (429): 5
⚠️  Erros: 0

⏱️  Tempo médio de resposta: 118ms

✅ RESULTADO: Rate limiting está FUNCIONANDO corretamente!
   As primeiras ~20 requisições passaram, depois foram bloqueadas.

🔍 Primeira requisição bloqueada: #21
⏰ Reset programado para: 14:25:30
```

**Se falhar:**
- Verifique se o servidor está rodando
- Confirme que rate limiting está implementado em `src/app/api/chat/route.ts`
- Para produção serverless, considere migrar para Redis/Upstash

---

## Comandos NPM

Para facilitar o uso, os scripts estão disponíveis como comandos npm:

```bash
# Verificar RLS do Supabase
npm run security:verify-rls

# Testar rate limiting
npm run security:test-ratelimit

# Auditoria completa (npm audit + instruções)
npm run security:audit
```

---

## Integração com CI/CD

Os scripts podem ser integrados em pipelines de CI/CD:

### GitHub Actions

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Verify RLS
        run: npm run security:verify-rls
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Security audit
        run: npm run security:audit
```

### GitLab CI

```yaml
security-tests:
  stage: test
  script:
    - npm install
    - npm run security:verify-rls
    - npm run security:audit
  variables:
    NEXT_PUBLIC_SUPABASE_URL: $SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY: $SUPABASE_ANON_KEY
```

---

## Frequência Recomendada

| Script | Quando Executar | Frequência |
|--------|----------------|-----------|
| `verify-rls.ts` | Após mudanças no schema | Semanal |
| `test-rate-limit.ts` | Após mudanças na API | Cada deploy |
| `npm audit` | Antes de cada release | Mensal |

---

## Troubleshooting

### Erro: "Variáveis de ambiente não configuradas"

**Problema:** `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` não estão definidas

**Solução:**
```bash
# Criar .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
GROQ_API_KEY=sua_groq_key
EOF
```

### Erro: "Não foi possível conectar ao servidor"

**Problema:** Servidor não está rodando

**Solução:**
```bash
# Iniciar servidor em outro terminal
npm run dev

# Aguardar servidor iniciar
# Executar script novamente
npm run security:test-ratelimit
```

### Erro: "tsx: command not found"

**Problema:** Dependência `tsx` não instalada

**Solução:**
```bash
npm install --save-dev tsx
```

**Nota:** Em sistemas com problemas de permissão no npm, pode ser necessário:
```bash
sudo chown -R $(whoami) ~/.npm
npm install --save-dev tsx
```

---

## Desenvolvimento

### Adicionar novo script

1. Criar arquivo `.ts` neste diretório
2. Adicionar shebang (opcional):
   ```typescript
   #!/usr/bin/env tsx
   ```
3. Adicionar comando em `package.json`:
   ```json
   {
     "scripts": {
       "security:seu-script": "tsx scripts/seu-script.ts"
     }
   }
   ```
4. Documentar aqui

### Estrutura de um script

```typescript
/**
 * Nome do Script
 * 
 * Descrição do que o script faz
 * 
 * Uso:
 *   npx tsx scripts/seu-script.ts [args]
 */

// Imports necessários
import { createClient } from '@supabase/supabase-js';

// Função principal
async function main(): Promise<void> {
  console.log('🔒 Iniciando...\n');
  
  try {
    // Lógica do script
    
    console.log('\n✅ Sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro:', error);
    process.exit(1);
  }
}

// Executar
main();
```

---

## Referências

- [Documentação completa de segurança](../SECURITY.md)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Rate Limiting Best Practices](https://www.ietf.org/rfc/rfc6585.txt)

---

**Última atualização:** 15 de Janeiro de 2026
