/**
 * Script de Verificação de Row Level Security (RLS) do Supabase
 * 
 * Este script verifica se as políticas de RLS estão ativas e configuradas corretamente
 * nas tabelas do banco de dados.
 * 
 * Uso:
 *   npx tsx scripts/verify-rls.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuração
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Tabelas a verificar
const TABLES_TO_CHECK = [
  'cnae_item_lc',
  'itens_lista_servicos',
  'item_lc_ibs_cbs'
];

interface RLSStatus {
  table: string;
  rlsEnabled: boolean;
  canSelect: boolean;
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  message: string;
}

async function verifyRLS(): Promise<void> {
  console.log('🔒 Iniciando verificação de Row Level Security (RLS)\n');

  // Validar variáveis de ambiente
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ ERRO: Variáveis de ambiente não configuradas');
    console.error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const results: RLSStatus[] = [];

  console.log(`📊 Verificando ${TABLES_TO_CHECK.length} tabelas...\n`);

  for (const tableName of TABLES_TO_CHECK) {
    console.log(`🔍 Testando: ${tableName}`);
    
    const result: RLSStatus = {
      table: tableName,
      rlsEnabled: false,
      canSelect: false,
      canInsert: false,
      canUpdate: false,
      canDelete: false,
      status: 'CRITICAL',
      message: ''
    };

    try {
      // 1. Testar SELECT (deve funcionar)
      const { data: selectData, error: selectError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      result.canSelect = !selectError;
      
      if (selectError) {
        console.log(`  ❌ SELECT: ${selectError.message}`);
      } else {
        console.log(`  ✅ SELECT: Permitido (${selectData?.length || 0} registros)`);
      }

      // 2. Testar INSERT (deve falhar com RLS)
      const testData = tableName === 'cnae_item_lc' 
        ? { cnae: 9999999, cnae_descricao: 'TESTE_RLS', item_lc: '99.99', grau_risco: 'BAIXO' }
        : tableName === 'itens_lista_servicos'
        ? { item_lc: '99.99', descricao: 'TESTE_RLS' }
        : { item_lc: '99.99', nbs: '9.9999.99.99', nbs_descricao: 'TESTE_RLS' };

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(testData);

      result.canInsert = !insertError;

      if (insertError) {
        if (insertError.message.includes('row-level security') || 
            insertError.message.includes('policy') ||
            insertError.code === '42501') {
          console.log(`  ✅ INSERT: Bloqueado (RLS ativo)`);
          result.rlsEnabled = true;
        } else {
          console.log(`  ⚠️  INSERT: Erro diferente - ${insertError.message}`);
        }
      } else {
        console.log(`  ❌ INSERT: Permitido (RLS não está funcionando!)`);
      }

      // 3. Testar UPDATE (deve falhar com RLS)
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ updated_at: new Date().toISOString() })
        .eq(tableName === 'cnae_item_lc' ? 'cnae' : 'item_lc', '0000000')
        .select();

      result.canUpdate = !updateError;

      if (updateError) {
        if (updateError.message.includes('row-level security') || 
            updateError.message.includes('policy') ||
            updateError.code === '42501') {
          console.log(`  ✅ UPDATE: Bloqueado (RLS ativo)`);
        } else {
          console.log(`  ⚠️  UPDATE: Erro diferente - ${updateError.message}`);
        }
      } else {
        console.log(`  ❌ UPDATE: Permitido (RLS não está funcionando!)`);
      }

      // 4. Testar DELETE (deve falhar com RLS)
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq(tableName === 'cnae_item_lc' ? 'cnae' : 'item_lc', '0000000');

      result.canDelete = !deleteError;

      if (deleteError) {
        if (deleteError.message.includes('row-level security') || 
            deleteError.message.includes('policy') ||
            deleteError.code === '42501') {
          console.log(`  ✅ DELETE: Bloqueado (RLS ativo)`);
        } else {
          console.log(`  ⚠️  DELETE: Erro diferente - ${deleteError.message}`);
        }
      } else {
        console.log(`  ❌ DELETE: Permitido (RLS não está funcionando!)`);
      }

      // Avaliar status geral
      if (result.canSelect && !result.canInsert && !result.canUpdate && !result.canDelete) {
        result.status = 'OK';
        result.message = 'RLS configurado corretamente ✅';
      } else if (!result.canSelect) {
        result.status = 'CRITICAL';
        result.message = 'SELECT bloqueado - RLS muito restritivo ou tabela não existe';
      } else if (result.canInsert || result.canUpdate || result.canDelete) {
        result.status = 'CRITICAL';
        result.message = 'Operações de escrita permitidas - RLS NÃO ESTÁ ATIVO! ⚠️';
      } else {
        result.status = 'WARNING';
        result.message = 'Status incerto - verificar manualmente';
      }

      console.log(`  📝 Status: ${result.message}\n`);

    } catch (error) {
      result.status = 'CRITICAL';
      result.message = `Erro ao testar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      console.log(`  ❌ Erro: ${result.message}\n`);
    }

    results.push(result);
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA VERIFICAÇÃO DE SEGURANÇA');
  console.log('='.repeat(60) + '\n');

  const okCount = results.filter(r => r.status === 'OK').length;
  const warningCount = results.filter(r => r.status === 'WARNING').length;
  const criticalCount = results.filter(r => r.status === 'CRITICAL').length;

  console.log(`✅ OK: ${okCount}/${TABLES_TO_CHECK.length}`);
  console.log(`⚠️  WARNING: ${warningCount}/${TABLES_TO_CHECK.length}`);
  console.log(`❌ CRITICAL: ${criticalCount}/${TABLES_TO_CHECK.length}\n`);

  results.forEach(result => {
    const emoji = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${emoji} ${result.table.padEnd(30)} ${result.message}`);
  });

  console.log('\n' + '='.repeat(60));

  // Status final
  if (criticalCount > 0) {
    console.log('\n❌ CRÍTICO: Algumas tabelas não têm RLS configurado corretamente!');
    console.log('\n📝 AÇÃO NECESSÁRIA:');
    console.log('1. Acesse o Supabase Dashboard → SQL Editor');
    console.log('2. Execute o arquivo: supabase-rls-setup.sql');
    console.log('3. Execute este script novamente para verificar\n');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('\n⚠️  ATENÇÃO: Algumas tabelas precisam de revisão manual');
    console.log('Verifique as políticas RLS no Supabase Dashboard\n');
    process.exit(0);
  } else {
    console.log('\n✅ SUCESSO: Todas as tabelas estão protegidas com RLS!');
    console.log('O banco de dados está seguro para uso em produção.\n');
    process.exit(0);
  }
}

// Executar verificação
verifyRLS().catch((error) => {
  console.error('❌ Erro fatal ao executar verificação:', error);
  process.exit(1);
});
