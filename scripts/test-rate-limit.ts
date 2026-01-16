/**
 * Script de Teste de Rate Limiting
 * 
 * Este script testa o rate limiting da API do chatbot, enviando múltiplas
 * requisições para verificar se o limite de 20 req/min está funcionando.
 * 
 * Uso:
 *   npx tsx scripts/test-rate-limit.ts [url]
 * 
 * Exemplos:
 *   npx tsx scripts/test-rate-limit.ts                    # Testa localhost:3000
 *   npx tsx scripts/test-rate-limit.ts https://seu-site.vercel.app
 */

interface RateLimitTest {
  requestNumber: number;
  statusCode: number;
  success: boolean;
  remaining?: number;
  resetAt?: string;
  error?: string;
  duration: number;
}

async function testRateLimit(baseUrl: string, totalRequests: number = 25): Promise<void> {
  console.log('⏱️  Iniciando teste de Rate Limiting\n');
  console.log(`🎯 URL: ${baseUrl}/api/chat`);
  console.log(`📊 Requisições: ${totalRequests}`);
  console.log(`🔒 Limite esperado: 20 req/minuto\n`);
  console.log('='.repeat(70) + '\n');

  const results: RateLimitTest[] = [];
  let blockedCount = 0;
  let successCount = 0;

  for (let i = 1; i <= totalRequests; i++) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: `Teste de rate limiting ${i}`
        })
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      const result: RateLimitTest = {
        requestNumber: i,
        statusCode: response.status,
        success: response.status === 200,
        duration
      };

      // Extrair headers de rate limit
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const reset = response.headers.get('X-RateLimit-Reset');

      if (remaining) result.remaining = parseInt(remaining);
      if (reset) {
        const resetDate = new Date(parseInt(reset) * 1000);
        result.resetAt = resetDate.toLocaleTimeString('pt-BR');
      }

      if (response.status === 429) {
        blockedCount++;
        result.error = data.error || 'Rate limit excedido';
        console.log(
          `❌ #${i.toString().padStart(2, '0')} | Status: 429 | ` +
          `Reset: ${result.resetAt || 'N/A'} | ${duration}ms`
        );
      } else if (response.status === 200) {
        successCount++;
        console.log(
          `✅ #${i.toString().padStart(2, '0')} | Status: 200 | ` +
          `Remaining: ${result.remaining || 'N/A'} | ${duration}ms`
        );
      } else {
        console.log(
          `⚠️  #${i.toString().padStart(2, '0')} | Status: ${response.status} | ` +
          `${duration}ms`
        );
      }

      results.push(result);

      // Pequeno delay para não sobrecarregar
      if (i < totalRequests) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`💥 #${i.toString().padStart(2, '0')} | Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      results.push({
        requestNumber: i,
        statusCode: 0,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMO DO TESTE DE RATE LIMITING');
  console.log('='.repeat(70) + '\n');

  console.log(`Total de requisições: ${totalRequests}`);
  console.log(`✅ Sucessos (200): ${successCount}`);
  console.log(`❌ Bloqueadas (429): ${blockedCount}`);
  console.log(`⚠️  Erros: ${results.filter(r => r.statusCode !== 200 && r.statusCode !== 429).length}\n`);

  // Análise
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`⏱️  Tempo médio de resposta: ${avgDuration.toFixed(0)}ms\n`);

  // Verificar se rate limiting está funcionando
  if (blockedCount > 0 && successCount <= 20) {
    console.log('✅ RESULTADO: Rate limiting está FUNCIONANDO corretamente!');
    console.log(`   As primeiras ~20 requisições passaram, depois foram bloqueadas.\n`);
  } else if (blockedCount === 0 && totalRequests > 20) {
    console.log('❌ ALERTA: Rate limiting NÃO ESTÁ FUNCIONANDO!');
    console.log(`   Todas as ${totalRequests} requisições foram aceitas.\n`);
    console.log('📝 AÇÃO NECESSÁRIA:');
    console.log('   1. Verifique se o rate limiting está implementado em src/app/api/chat/route.ts');
    console.log('   2. Para ambientes serverless, considere usar Redis/Upstash\n');
  } else {
    console.log('⚠️  RESULTADO: Comportamento inconsistente detectado');
    console.log('   Verifique manualmente os logs do servidor\n');
  }

  // Detalhes da primeira requisição bloqueada
  const firstBlocked = results.find(r => r.statusCode === 429);
  if (firstBlocked) {
    console.log(`🔍 Primeira requisição bloqueada: #${firstBlocked.requestNumber}`);
    if (firstBlocked.resetAt) {
      console.log(`⏰ Reset programado para: ${firstBlocked.resetAt}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 DICA: Em ambientes serverless (Vercel), cada instância tem seu');
  console.log('   próprio contador. Para rate limiting distribuído 100% preciso,');
  console.log('   considere migrar para Redis/Upstash.\n');
}

// Executar teste
const args = process.argv.slice(2);
const baseUrl = args[0] || 'http://localhost:3000';

// Validar URL
try {
  new URL(baseUrl);
} catch {
  console.error('❌ Erro: URL inválida');
  console.error('Uso: npx tsx scripts/test-rate-limit.ts [url]');
  console.error('Exemplo: npx tsx scripts/test-rate-limit.ts http://localhost:3000');
  process.exit(1);
}

// Verificar se servidor está rodando
fetch(`${baseUrl}/api/chat`, { method: 'GET' })
  .then(() => {
    console.log('✅ Servidor está respondendo, iniciando testes...\n');
    return testRateLimit(baseUrl);
  })
  .catch((error) => {
    console.error('❌ Erro: Não foi possível conectar ao servidor');
    console.error(`   URL: ${baseUrl}/api/chat`);
    console.error(`   Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n`);
    console.error('💡 Certifique-se de que o servidor está rodando:');
    console.error('   npm run dev\n');
    process.exit(1);
  });
