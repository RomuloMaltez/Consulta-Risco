import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { executeQuery, QueryId, QueryParams } from '@/lib/chat/allowedQueries';

// Configuração do Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

// Cache simples em memória (para demonstração)
const cache = new Map<string, { response: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Rate limiting simples (em memória)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // 20 requisições
const RATE_LIMIT_WINDOW = 60 * 1000; // por minuto

/**
 * Verifica rate limit por IP
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Normaliza a pergunta para cache
 */
function normalizeQuestion(question: string): string {
  return question.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Normaliza CNAEs removendo formatação
 */
function normalizeCNAE(input: string): string | null {
  // Remove tudo exceto números
  const digits = input.replace(/\D/g, '');
  
  // CNAEs têm 7 dígitos
  if (digits.length === 7) {
    return digits;
  }
  
  return null;
}

/**
 * Usa o Groq (Llama 3) como cérebro do assistente
 * Ele decide se precisa de dados do banco ou se pode responder diretamente
 */
async function processWithGroq(question: string, history: any[] = []): Promise<{ needsQuery: boolean; queryId?: QueryId; params?: QueryParams; directResponse?: string }> {
  try {
    // Adicionar contexto do histórico se existir
    let contextPrompt = '';
    if (history && history.length > 0) {
      contextPrompt = '\n\nCONTEXTO DA CONVERSA ANTERIOR:\n' + 
        history.map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`).join('\n') +
        '\n\nUSE ESTE CONTEXTO para entender melhor a pergunta atual.\n';
    }

    const prompt = `Você é um assistente virtual especializado e amigável da SEMEC Porto Velho. Seu nome é "Assistente CNAE".${contextPrompt}

Você ajuda contribuintes com questões sobre CNAE, tributação, classificação de serviços, NBS, IBS e CBS.

IMPORTANTE: Seja natural, amigável e conversacional. Use emojis quando apropriado. Responda como um humano experiente e prestativo.

Analise a pergunta do usuário e retorne um JSON:

**Se for uma pergunta pessoal/cumprimento/ajuda (sobre você ou geral):**
{
  "needsQuery": false,
  "directResponse": "sua resposta personalizada aqui"
}

Exemplos de perguntas pessoais:
- "quem é você?" → Se apresente de forma amigável
- "olá/oi" → Cumprimente e pergunte como pode ajudar
- "o que você faz?" → Explique suas capacidades
- "obrigado" → Responda educadamente
- "ajuda" → Explique como usar o sistema
- "o que é IBS?" → Explique de forma didática
- "diferença entre X e Y" → Compare e explique

**Se for uma pergunta técnica que precisa de dados do banco:**
{
  "needsQuery": true,
  "queryId": "cnae_to_item|cnae_details|item_to_details|item_to_nbs|search_text|search_by_risk",
  "params": {
    "cnae": "apenas números",
    "item_lc": "formato numérico",
    "q": "termo de busca",
    "grau_risco": "ALTO|MEDIO|BAIXO"
  }
}

Tipos de consulta disponíveis:

1. **cnae_to_item**: quando o usuário pergunta sobre um CNAE específico
   Exemplos: "CNAE 6920601", "6920-6/01", "me fale sobre 7020400", "qual o risco do 8599604", "7020400"
   Ação: extrair apenas os NÚMEROS do CNAE (remover hífens e barras)
   
2. **search_text**: quando o usuário busca por ATIVIDADE/PALAVRA-CHAVE (NÃO por código numérico)
   Exemplos de perguntas:
   - "CNAEs de consultoria" → q: "consultoria"
   - "hospital" → q: "hospital"  
   - "tenho empresa hospital quero códigos" → q: "hospital"
   - "trabalho com design gráfico" → q: "design"
   - "minha empresa é de tecnologia" → q: "tecnologia"
   
   REGRA DE EXTRAÇÃO:
   - Extraia APENAS o substantivo da ATIVIDADE/SETOR
   - Remova: "tenho", "empresa", "quero", "códigos", "serviço", "minha", "é de"
   - Mantenha APENAS: a palavra-chave da atividade (hospital, consultoria, design, etc)
   - Use UMA palavra sempre que possível
   
3. **item_to_nbs**: quando pergunta sobre NBS/IBS/CBS de um item específico
   Exemplos: "qual o NBS do item 17.01?", "códigos NBS do item 5.09", "NBS do 17.12"
   Ação: extrair o número do item (ex: "17.01")
   
4. **search_by_risk**: buscar CNAEs por grau de risco
   Exemplos: "atividades de risco alto", "CNAEs de baixo risco", "mostre riscos médios"
   Ação: identificar ALTO, MEDIO ou BAIXO

5. **item_to_details**: descrição de um item LC específico
   Exemplos: "o que é o item 17.12?", "item 5.09", "qual o serviço do código 01.03", "código 1.05"
   Importante: Códigos com formato XX.XX são ITEMS LC, não CNAEs!

Regras de extração:

PARA ITEMS LC (formato XX.XX):
- Reconheça padrões: "código 01.03", "serviço 1.05", "item 17.12"
- Remova zeros à esquerda: "01.03" vira "1.03", "05.09" vira "5.09"
- Formato final: "X.XX" ou "XX.XX" (sem zero à esquerda no primeiro número)

PARA CNAE:
- Se a pergunta contém APENAS números ou números com formatação (ex: "7020400", "6920-6/01"), extraia como CNAE
- Remova todos os caracteres não-numéricos: "6920-6/01" vira "6920601"
- CNAEs válidos têm 7 dígitos

Decisão de query (prioridade):
1. Se menciona "NBS", "IBS" ou "CBS" + item número → item_to_nbs
2. Se é código/serviço formato XX.XX (ex: "01.03", "17.12") → item_to_details
3. Se é número puro de 7 dígitos ou CNAE formatado → cnae_to_item
4. Se busca por PALAVRA/ATIVIDADE (SEM código) → search_text
5. Se pergunta sobre "risco alto/médio/baixo" → search_by_risk

Pergunta do usuário: "${question}"

Retorne APENAS o JSON válido, sem markdown, sem explicações.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente que sempre retorna JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const text = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(text);

    if (parsed.needsQuery === false && parsed.directResponse) {
      return {
        needsQuery: false,
        directResponse: parsed.directResponse
      };
    }

    if (parsed.needsQuery === true && parsed.queryId) {
      return {
        needsQuery: true,
        queryId: parsed.queryId as QueryId,
        params: parsed.params || {}
      };
    }

    throw new Error('Resposta inválida do Groq');
  } catch (error: any) {
    console.error('Erro ao processar com Groq:', error);
    return {
      needsQuery: false,
      directResponse: 'Desculpe, tive um problema ao processar sua pergunta. Pode tentar novamente? 😊'
    };
  }
}

/**
 * Usa o Groq para formatar a resposta final com os dados do banco
 */
async function formatWithGroq(question: string, queryId: QueryId, queryResult: any): Promise<string> {
  try {
    const prompt = `Você é um assistente virtual amigável e prestativo especializado em questões fiscais da SEMEC Porto Velho.

O usuário perguntou: "${question}"

CONTEXTO DA QUERY EXECUTADA:
- Tipo de consulta: ${queryId}
- Resultado do banco de dados:
${JSON.stringify(queryResult, null, 2)}

INSTRUÇÕES DE FORMATAÇÃO POR TIPO DE QUERY:

Se foi "search_text" (busca por palavra-chave):
  - Liste TODOS os CNAEs encontrados de forma clara e numerada
  - Mostre o código CNAE formatado e a descrição completa
  - Se encontrou resultados, celebre o sucesso!
  
Se foi "item_to_nbs" (consulta de código NBS):
  - DESTAQUE o código NBS encontrado com formatação especial
  - Explique o que é NBS/IBS/CBS de forma didática
  - Mostre todas as informações técnicas disponíveis
  
Se foi "cnae_to_item" (consulta de CNAE específico):
  - Mostre CNAE, descrição, item LC e grau de risco
  - Explique o significado do grau de risco
  
Se NÃO encontrou dados:
  - Seja empático e gentil
  - Sugira reformular a busca com palavras diferentes
  - Ofereça exemplos de como buscar

Agora, formate uma resposta natural, amigável e informativa em texto puro (não JSON). Use:
- Emojis contextuais (📋 📌 🎯 🔴 🟡 🟢) MAS COM MODERAÇÃO
- Linguagem clara e acessível
- Explique o significado das informações
- Seja prestativo e ofereça ajuda adicional
- Responda em PORTUGUÊS
- Seja pessoal e humano, não robótico
- Sempre pergunte se pode ajudar com mais algo no final

REGRAS ESTRITAS DE FORMATAÇÃO (OBRIGATÓRIO SEGUIR):
1. NÃO use asteriscos ** para negrito - escreva em texto normal
2. Use emojis para destacar (📋 📌 🎯) ao invés de negrito
3. Organize com quebras de linha, não com formatação markdown
4. Escreva de forma natural e conversacional

Exemplo CORRETO de formatação:

"📋 CNAE 6920601

Descrição: Atividades de contabilidade
Item LC: 17.19
Grau de Risco: BAIXO 🟢

Isso significa que..."

Exemplo ERRADO (NÃO FAÇA):

"**CNAE**: **6920601**
**Descrição**: Atividades de contabilidade
**Item LC**: **17.19**"

IMPORTANTE: Escreva SEM asteriscos duplos (**), use texto normal!

Formate a resposta agora:`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente amigável que ajuda contribuintes com questões fiscais. Seja natural e conversacional.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1500
    });

    return completion.choices[0]?.message?.content || formatResponse(queryId, queryResult, question);
  } catch (error) {
    console.error('Erro ao formatar com Groq:', error);
    // Fallback para formatação básica
    return formatResponse(queryId, queryResult, question);
  }
}

/**
 * Formata a resposta de forma natural e humana
 */
function formatResponse(queryId: QueryId, result: any, question: string): string {
  if (!result.success) {
    return `Ops, encontrei um problema ao processar sua solicitação. ${result.error ? `O sistema retornou: "${result.error}". ` : ''}Pode tentar reformular sua pergunta? Estou aqui para ajudar! 😊`;
  }

  if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
    return `Hmm, não encontrei resultados para sua consulta. ${result.summary || ''}\n\n💡 **Dica:** Tente usar o código completo do CNAE (ex: 6920601) ou palavras-chave da atividade que você procura. Posso te ajudar com qualquer dúvida sobre classificação fiscal!`;
  }

  let response = '';

  switch (queryId) {
    case 'cnae_to_item':
      if (Array.isArray(result.data) && result.data.length > 0) {
        const item = result.data[0];
        const risco = item.grau_risco || 'não especificado';
        const riscoEmoji = risco === 'ALTO' ? '🔴' : risco === 'MEDIO' ? '🟡' : risco === 'BAIXO' ? '🟢' : '⚪';
        
        response = `Perfeito! Encontrei as informações sobre este CNAE:\n\n`;
        response += `📋 **CNAE ${item.cnae_mascara || item.cnae}**\n`;
        response += `${item.cnae_descricao}\n\n`;
        response += `📌 **Item da Lista de Serviços:** ${item.item_lc}\n`;
        
        if (item.itens_lista_servicos) {
          response += `${item.itens_lista_servicos.descricao}\n\n`;
        }
        
        response += `${riscoEmoji} **Grau de Risco:** ${risco}\n\n`;
        
        // Explicação sobre o grau de risco
        if (risco === 'ALTO') {
          response += `⚠️ Este CNAE possui grau de risco **alto**, o que significa que as atividades requerem maior atenção quanto à fiscalização e conformidade tributária.\n`;
        } else if (risco === 'MEDIO') {
          response += `ℹ️ Este CNAE possui grau de risco **médio**. Recomendo manter a documentação fiscal sempre organizada e em dia.\n`;
        } else if (risco === 'BAIXO') {
          response += `✅ Este CNAE possui grau de risco **baixo**, mas é importante manter as obrigações fiscais em dia.\n`;
        }
        
        response += `\n💬 Posso ajudar com mais alguma informação sobre este CNAE ou outro código?`;
      }
      break;

    case 'cnae_details':
      if (Array.isArray(result.data) && result.data.length > 0) {
        const cnae = result.data[0];
        response = `Aqui estão as informações sobre o CNAE que você consultou:\n\n`;
        response += `📋 **CNAE ${cnae.cnae_mascara || cnae.cnae}**\n`;
        response += `${cnae.cnae_descricao}\n\n`;
        response += `📌 **Item da Lista de Serviços:** ${cnae.item_lc}\n\n`;
        response += `💡 **Quer saber mais?** Posso te informar sobre o grau de risco, códigos NBS/IBS/CBS ou qualquer outra dúvida sobre este CNAE!`;
      }
      break;

    case 'item_to_details':
      if (Array.isArray(result.data) && result.data.length > 0) {
        const item = result.data[0];
        response = `Encontrei as informações do Item da Lista de Serviços:\n\n`;
        response += `📌 **Item ${item.item_lc}**\n`;
        response += `${item.descricao}\n\n`;
        
        if (item.item_lc_ibs_cbs && item.item_lc_ibs_cbs.length > 0) {
          const rel = item.item_lc_ibs_cbs[0];
          response += `📊 **Códigos de Classificação:**\n\n`;
          response += `🔹 **NBS (Nomenclatura Brasileira de Serviços):** ${rel.nbs_codigo}\n`;
          response += `   ${rel.nbs_descricao}\n\n`;
          response += `🔹 **IBS (Imposto sobre Bens e Serviços):** ${rel.ibs_codigo}\n`;
          response += `   ${rel.ibs_descricao}\n\n`;
          response += `🔹 **CBS (Contribuição sobre Bens e Serviços):** ${rel.cbs_codigo}\n`;
          response += `   ${rel.cbs_descricao}\n\n`;
        }
        
        response += `💬 Precisa de mais esclarecimentos sobre este item ou outro? Estou à disposição!`;
      }
      break;

    case 'search_text':
      const data = result.data;
      let totalCount = (data.items?.length || 0) + (data.cnaes?.length || 0);
      
      response = `Encontrei ${totalCount} resultado${totalCount !== 1 ? 's' : ''} relacionado${totalCount !== 1 ? 's' : ''} à sua busca:\n\n`;
      
      if (data.cnaes && data.cnaes.length > 0) {
        response += `📋 **CNAEs encontrados:**\n\n`;
        data.cnaes.slice(0, 5).forEach((cnae: any, index: number) => {
          response += `${index + 1}. **${cnae.cnae_mascara || cnae.cnae}** - ${cnae.cnae_descricao.substring(0, 100)}${cnae.cnae_descricao.length > 100 ? '...' : ''}\n`;
        });
        response += '\n';
      }
      
      if (data.items && data.items.length > 0) {
        response += `📌 **Itens da Lista de Serviços:**\n\n`;
        data.items.slice(0, 5).forEach((item: any, index: number) => {
          response += `${index + 1}. **Item ${item.item_lc}** - ${item.descricao.substring(0, 100)}${item.descricao.length > 100 ? '...' : ''}\n`;
        });
      }
      
      if (totalCount > 5) {
        response += `\n_Mostrando os primeiros 5 resultados de ${totalCount} encontrados._\n`;
      }
      
      response += `\n💡 **Dica:** Clique em qualquer código CNAE ou Item LC acima para obter informações detalhadas, ou me pergunte especificamente sobre algum deles!`;
      break;

    case 'search_by_risk':
      if (Array.isArray(result.data) && result.data.length > 0) {
        const risco = result.data[0].grau_risco;
        const riscoEmoji = risco === 'ALTO' ? '🔴' : risco === 'MEDIO' ? '🟡' : '🟢';
        
        response = `${riscoEmoji} Encontrei **${result.data.length} CNAEs** com grau de risco **${risco}**:\n\n`;
        
        result.data.slice(0, 10).forEach((cnae: any, index: number) => {
          response += `${index + 1}. **${cnae.cnae_mascara || cnae.cnae}** - ${cnae.cnae_descricao.substring(0, 100)}${cnae.cnae_descricao.length > 100 ? '...' : ''}\n`;
          response += `   📌 Item LC: ${cnae.item_lc}\n\n`;
        });
        
        if (result.data.length > 10) {
          response += `_Mostrando 10 de ${result.data.length} resultados._\n\n`;
        }
        
        response += `💬 Quer saber mais detalhes sobre algum desses CNAEs?`;
      }
      break;

    case 'item_to_nbs':
      if (Array.isArray(result.data) && result.data.length > 0) {
        const item = result.data[0];
        response = `📊 **Dados Completos de NBS/IBS/CBS**\n\n`;
        response += `📌 **Item LC:** ${item.item_lc}\n\n`;
        
        if (item.nbs) {
          response += `🔹 **NBS (Nomenclatura Brasileira de Serviços):**\n`;
          response += `   Código: ${item.nbs}\n`;
          response += `   ${item.nbs_descricao}\n\n`;
        }
        
        if (item.indop) {
          response += `📋 **INDOP:** ${item.indop}\n`;
          response += `   (Indicador de Operação para IBS/CBS)\n\n`;
        }
        
        if (item.local_incidencia_ibs) {
          response += `📍 **Local de Incidência do IBS:** ${item.local_incidencia_ibs}\n\n`;
        }
        
        if (item.c_class_trib) {
          response += `🏛️ **Classificação Tributária:**\n`;
          response += `   Código: ${item.c_class_trib}\n`;
          response += `   ${item.c_class_trib_nome}\n\n`;
        }
        
        if (item.ps_onerosa) {
          response += `💰 Prestação Onerosa: ${item.ps_onerosa === 'S' ? 'Sim' : 'Não'}\n`;
        }
        
        if (item.adq_exterior) {
          response += `🌐 Aquisição Exterior: ${item.adq_exterior === 'S' ? 'Sim' : 'Não'}\n`;
        }
        
        response += `\n💬 Precisa de mais informações sobre este item ou outro?`;
      }
      break;
  }

  return response;
}

/**
 * Endpoint POST /api/chat
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar chave API
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta (GROQ_API_KEY não configurada)' },
        { status: 500 }
      );
    }

    // Obter IP para rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Verificar rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Por favor, aguarde um momento.' },
        { status: 429 }
      );
    }

    // Obter pergunta e histórico do body
    const body = await request.json();
    const { question, history = [] } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Pergunta inválida' },
        { status: 400 }
      );
    }

    // Verificar tamanho da pergunta
    if (question.length > 500) {
      return NextResponse.json(
        { error: 'Pergunta muito longa (máximo 500 caracteres)' },
        { status: 400 }
      );
    }

    // Verificar cache
    const cacheKey = normalizeQuestion(question);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...cached.response,
        cached: true
      });
    }

    // Processar pergunta com Groq com contexto (ele decide tudo)
    const groqDecision = await processWithGroq(question, history);
    
    // Se o Groq respondeu diretamente (pergunta pessoal/geral)
    if (!groqDecision.needsQuery && groqDecision.directResponse) {
      return NextResponse.json({
        response: groqDecision.directResponse,
        isDirect: true
      });
    }

    // Se precisa de dados do banco
    if (groqDecision.needsQuery && groqDecision.queryId) {
      // Executar consulta
      const queryResult = await executeQuery(groqDecision.queryId, groqDecision.params || {});

      // Deixar o Groq formatar a resposta com os dados
      const formattedResponse = await formatWithGroq(question, groqDecision.queryId, queryResult);

      const responseData = {
        response: formattedResponse,
        queryId: groqDecision.queryId,
        params: groqDecision.params,
        success: queryResult.success
      };

      // Armazenar em cache
      cache.set(cacheKey, {
        response: responseData,
        timestamp: Date.now()
      });

      return NextResponse.json(responseData);
    }

    // Fallback se algo der errado
    return NextResponse.json({
      response: 'Desculpe, não consegui processar sua pergunta desta vez. Pode reformular? 😊'
    });
  } catch (error: any) {
    console.error('Erro no endpoint /api/chat:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Endpoint GET /api/chat (para health check)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Chatbot API está funcionando'
  });
}
