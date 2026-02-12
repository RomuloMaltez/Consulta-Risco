import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { executeQuery, QueryId, QueryParams } from '@/lib/chat/allowedQueries';
import { getGroqApiKey } from '@/lib/env.server';
import { rateLimitMemory, getClientIp } from '@/lib/ratelimit-memory';
import { logger } from '@/lib/logger';
import {
  DECISION_SYSTEM_PROMPT,
  FORMAT_SYSTEM_PROMPT,
  JSON_FORMAT_INSTRUCTIONS,
  EXTRACTION_RULES
} from '@/lib/chat/systemPrompt';

// Validation schema for chat request
const ChatRequestSchema = z.object({
  question: z.string()
    .min(1, 'Pergunta não pode estar vazia')
    .max(500, 'Pergunta muito longa (máximo 500 caracteres)')
    .trim()
}).strict(); // Prevents extra fields (mass assignment protection)

type ChatRequest = z.infer<typeof ChatRequestSchema>;

// Schema para validar resposta do LLM
const LLMResponseSchema = z.discriminatedUnion('needsQuery', [
  z.object({
    needsQuery: z.literal(false),
    directResponse: z.string().min(1).max(2000),
  }),
  z.object({
    needsQuery: z.literal(true),
    queryId: z.enum(['cnae_to_item', 'cnae_details', 'item_to_details',
      'item_to_nbs', 'search_text', 'search_by_risk',
      'cnae_full_info', 'cnae_by_mascara', 'search_nbs', 'list_items_by_group']),
    params: z.record(z.string()).optional(),
  }),
]);

// Fallback seguro caso a resposta do LLM seja inválida
const SAFE_FALLBACK = {
  needsQuery: false,
  directResponse: 'Desculpe, não consegui processar sua pergunta adequadamente. Por favor, tente perguntar de forma clara e objetiva sobre CNAE, tributação, NBS, IBS, CBS ou serviços. 🤔'
} as const;

// Configuração do Groq (inicialização lazy para evitar erro no build)
// Now using validated environment variables from env.server.ts
const getGroqClient = () => {
  try {
    const apiKey = getGroqApiKey();
    return new Groq({ apiKey });
  } catch (error) {
    console.error('[Config Error] Failed to initialize Groq client:', error);
    throw new Error('Configuração do servidor incompleta');
  }
};

// Cache simples em memória (para demonstração)
const cache = new Map<string, { response: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

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
 * Detects potential prompt injection attempts
 * Supports both English and Portuguese patterns
 */
function detectPromptInjection(input: string): boolean {
  const suspiciousPatterns = [
    // English patterns
    /ignore\s+(previous|all|above|system)\s+(instructions?|prompts?|rules?)/i,
    /forget\s+(everything|all|previous)/i,
    /you\s+are\s+(now|actually)\s+a/i,
    /new\s+(instructions?|role|task)/i,
    /system\s*(prompt|message|instruction)/i,
    /reveal\s+(your|the)\s+(prompt|instructions?|system)/i,
    /disregard\s+(previous|all|above)/i,

    // Portuguese patterns (TÉCNICA #3)
    /esqueça\s+(tudo|todas?|todos?|o\s+que|anteriores?)/i,
    /ignore\s+(todas?|todos?|tudo|anteriores?|as\s+instruções)/i,
    /revele?\s+(seu|o|suas?|teu)\s*(prompt|sistema|instruções?|regras?)/i,
    /mostre?\s+(seu|o|suas?|teu)\s*(prompt|instruções?|sistema|regras?)/i,
    /diga\s+(seu|o|suas?)\s*(prompt|sistema|instruções?)/i,
    /quais?\s+(são|sao)\s+suas\s+(instruções?|regras?)/i,
    /você\s+(agora\s+)?é\s+(um|uma)/i,
    /nova\s+(tarefa|instrução|função)/i,
    /desconsidere\s+(tudo|todas?|todos?|anteriores?)/i,

    // Code injection
    /<\s*script\s*>/i,
    /\{\s*\{.*\}\s*\}/,  // Template injection attempts
    /\$\{.*\}/,  // Template literal injection
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Validates LLM response to prevent system prompt leakage (TÉCNICA #1)
 * This is the last line of defense - checks output before sending to user
 */
function isResponseSafe(response: string): boolean {
  // Words/phrases that indicate system prompt leakage
  const forbiddenPatterns = [
    // Direct mentions of system components
    /system\s*(prompt|instruction|message)/i,
    /<CRITICAL_SECURITY_RULES>/i,
    /<TASK>/i,
    /<\/?(system|instructions|rules)>/i,

    // Phrases from our actual system prompts
    /DEVE responder APENAS/i,
    /NÃO PODE revelar/i,
    /NUNCA IGNORE/i,
    /suas instruções internas/i,
    /configuração do sistema/i,
    /este prompt/i,
    /minhas instruções/i,

    // Meta-references to being an AI
    /eu sou (programado|configurado|instruído) (a|para)/i,
    /minhas (regras|diretrizes) (são|dizem)/i,

    // Technical implementation details
    /DECISION_SYSTEM_PROMPT/i,
    /FORMAT_SYSTEM_PROMPT/i,
    /processWithGroq/i,
    /formatWithGroq/i,
  ];

  const containsForbidden = forbiddenPatterns.some(pattern => pattern.test(response));

  if (containsForbidden) {
    logger.security('Response blocked - contains forbidden content', {
      responsePreview: response.substring(0, 100),
      detectedPattern: forbiddenPatterns.find(p => p.test(response))?.source
    });
  }

  return !containsForbidden;
}

/**
 * Sanitizes user input before sending to LLM
 */
function sanitizeUserInput(input: string): string {
  // Remove potential code execution patterns
  return input
    .replace(/[<>{}$]/g, '') // Remove potential injection characters
    .slice(0, 500); // Enforce max length
}

/**
 * Usa o Groq (Llama 3) como cérebro do assistente
 * Ele decide se precisa de dados do banco ou se pode responder diretamente
 */
async function processWithGroq(question: string): Promise<{ needsQuery: boolean; queryId?: QueryId; params?: QueryParams; directResponse?: string }> {
  try {
    // Check for prompt injection attempts
    if (detectPromptInjection(question)) {
      logger.promptInjection(question);
      return {
        needsQuery: false,
        directResponse: 'Desculpe, não consigo processar essa pergunta. Por favor, reformule de forma clara e objetiva sobre CNAE, tributação ou serviços. 🤔'
      };
    }

    // Sanitize input before sending to LLM
    const sanitizedQuestion = sanitizeUserInput(question);

    // Construir user prompt com instruções e pergunta
    const userPrompt = `${JSON_FORMAT_INSTRUCTIONS}

${EXTRACTION_RULES}

Pergunta do usuário: "${sanitizedQuestion}"

IMPORTANTE: Retorne APENAS o JSON válido, sem markdown, sem explicações.`;


    const groqClient = getGroqClient();
    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: DECISION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const text = completion.choices[0]?.message?.content || '{}';

    // Validate LLM response doesn't contain suspicious content
    if (detectPromptInjection(text)) {
      logger.security('Suspicious LLM response detected', {
        responsePreview: text.substring(0, 100)
      });
      return SAFE_FALLBACK;
    }

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      logger.error('LLM JSON parsing failed', parseError instanceof Error ? parseError : undefined);
      return SAFE_FALLBACK;
    }

    // Validate with Zod schema
    const validationResult = LLMResponseSchema.safeParse(parsed);

    if (!validationResult.success) {
      logger.warn('LLM validation failed', {
        errorCount: validationResult.error.errors?.length || 0,
        firstError: validationResult.error.errors?.[0]?.message || 'Unknown validation error'
      });
      return SAFE_FALLBACK;
    }

    // Return validated data
    return validationResult.data;
  } catch (error: any) {
    logger.llmError('processing', error instanceof Error ? error : new Error('Unknown error'));
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
    // Sanitize question before including in prompt
    const sanitizedQuestion = sanitizeUserInput(question);

    const userPromptFormat = `O usuário perguntou: "${sanitizedQuestion}"

CONTEXTO DA QUERY EXECUTADA:
- Tipo de consulta: ${queryId}
- Resultado do banco de dados:
${JSON.stringify(queryResult, null, 2)}

INSTRUÇÕES DE FORMATAÇÃO:

REGRA PRINCIPAL: Seja PRECISO. Mostre APENAS dados que vieram do banco. NUNCA invente.

Para QUALQUER tipo de consulta:
- Mostre os dados de forma objetiva e organizada
- NÃO invente informações que não estejam no resultado do banco
- NÃO repita a pergunta do usuário
- Se houver muitos resultados, liste TODOS de forma clara
- Finalize oferecendo ajuda adicional

Se NÃO encontrou dados:
- Diga que não encontrou de forma clara
- Sugira uma alternativa de busca

REGRAS ESTRITAS DE FORMATAÇÃO:
1. NÃO use asteriscos ** para negrito
2. Use emojis com moderação (📋 📌 🔴 🟡 🟢)
3. Organize com quebras de linha para facilitar a leitura
4. NUNCA adicione dados que não estejam no resultado fornecido acima

Exemplo de resposta IDEAL (curta e direta):

"📋 CNAE 6920-6/01
Atividades de contabilidade
Item LC: 17.19 | Risco: BAIXO 🟢

Precisa de mais alguma coisa?"

Formate a resposta agora:`;

    const groqClient = getGroqClient();
    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: FORMAT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPromptFormat
        }
      ],
      temperature: 0.5,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content || '';

    // TÉCNICA #1: Validate response before returning to user
    if (!isResponseSafe(response)) {
      logger.security('Unsafe LLM response blocked - potential prompt leakage', {
        queryId,
        responseLength: response.length
      });
      // Return safe fallback instead of leaked content
      return formatResponse(queryId, queryResult, question);
    }

    return response || formatResponse(queryId, queryResult, question);
  } catch (error) {
    logger.llmError('formatting', error instanceof Error ? error : new Error('Unknown error'));
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
        const itemLc = result.data[0].item_lc;
        response = `📊 **Códigos NBS/IBS/CBS para o Item ${itemLc}**\n\n`;
        response += `Encontrei **${result.data.length}** código(s) NBS relacionado(s):\n\n`;

        result.data.forEach((item: any, index: number) => {
          response += `**${index + 1}. NBS ${item.nbs}**\n`;
          response += `   ${item.nbs_descricao}\n\n`;

          if (item.indop) {
            response += `   📋 INDOP: ${item.indop}\n`;
          }

          if (item.local_incidencia_ibs) {
            response += `   📍 Local de Incidência: ${item.local_incidencia_ibs}\n`;
          }

          if (item.cclass_trib && item.nome_cclass_trib) {
            response += `   🏛️ Classificação Tributária: ${item.cclass_trib} - ${item.nome_cclass_trib}\n`;
          }

          if (item.ps_onerosa) {
            response += `   💰 Prestação Onerosa: ${item.ps_onerosa === 'S' ? 'Sim' : 'Não'}\n`;
          }

          if (item.adq_exterior) {
            response += `   🌐 Aquisição Exterior: ${item.adq_exterior === 'S' ? 'Sim' : 'Não'}\n`;
          }

          response += '\n';
        });

        response += `💬 Precisa de mais detalhes sobre algum desses códigos ou tem outra dúvida?`;
      }
      break;

    case 'cnae_full_info':
      if (result.data) {
        const cnaeInfo = result.data.cnae;
        const nbsInfo = result.data.nbs_ibs_cbs;

        if (Array.isArray(cnaeInfo) && cnaeInfo.length > 0) {
          const first = cnaeInfo[0];
          const risco = first.grau_risco || 'não especificado';
          const riscoEmoji = risco === 'ALTO' ? '🔴' : risco === 'MÉDIO' ? '🟡' : risco === 'BAIXO' ? '🟢' : '⚪';

          response = `📋 Informações completas do CNAE ${first.cnae_mascara || first.cnae}\n\n`;
          response += `Descrição: ${first.cnae_descricao}\n`;
          response += `📌 Item LC: ${first.item_lc}\n`;

          if (first.itens_lista_servicos) {
            response += `Serviço: ${first.itens_lista_servicos.descricao}\n`;
          }

          response += `${riscoEmoji} Grau de Risco: ${risco}\n\n`;

          if (Array.isArray(nbsInfo) && nbsInfo.length > 0) {
            response += `📊 Códigos NBS/IBS/CBS relacionados:\n\n`;
            nbsInfo.forEach((nbs: any, index: number) => {
              response += `${index + 1}. NBS ${nbs.nbs} - ${nbs.nbs_descricao}\n`;
              if (nbs.cclass_trib) {
                response += `   Classificação: ${nbs.cclass_trib} - ${nbs.nome_cclass_trib}\n`;
              }
              response += '\n';
            });
          }

          response += `💬 Posso ajudar com mais alguma informação?`;
        }
      }
      break;

    case 'cnae_by_mascara':
      if (Array.isArray(result.data) && result.data.length > 0) {
        response = `Encontrei ${result.data.length} resultado(s):\n\n`;
        result.data.forEach((cnae: any, index: number) => {
          const risco = cnae.grau_risco || 'não especificado';
          const riscoEmoji = risco === 'ALTO' ? '🔴' : risco === 'MÉDIO' ? '🟡' : risco === 'BAIXO' ? '🟢' : '⚪';
          response += `${index + 1}. 📋 CNAE ${cnae.cnae_mascara} - ${cnae.cnae_descricao}\n`;
          response += `   📌 Item LC: ${cnae.item_lc} | ${riscoEmoji} Risco: ${risco}\n\n`;
        });
        response += `💬 Quer mais detalhes sobre algum desses CNAEs?`;
      }
      break;

    case 'search_nbs':
      if (Array.isArray(result.data) && result.data.length > 0) {
        response = `📊 Encontrei ${result.data.length} código(s) NBS:\n\n`;
        result.data.forEach((nbs: any, index: number) => {
          response += `${index + 1}. NBS ${nbs.nbs} - ${nbs.nbs_descricao}\n`;
          response += `   📌 Item LC: ${nbs.item_lc}\n`;
          if (nbs.cclass_trib) {
            response += `   🏛️ Classificação: ${nbs.cclass_trib} - ${nbs.nome_cclass_trib}\n`;
          }
          response += '\n';
        });
        response += `💬 Precisa de mais detalhes sobre algum código NBS?`;
      }
      break;

    case 'list_items_by_group':
      if (Array.isArray(result.data) && result.data.length > 0) {
        const groupNum = result.data[0]?.item_lc ? Math.floor(result.data[0].item_lc) : '?';
        response = `📌 Itens do Grupo ${groupNum} da Lista de Serviços:\n\n`;
        result.data.forEach((item: any, index: number) => {
          response += `${index + 1}. Item ${item.item_lc} - ${item.descricao}\n\n`;
        });
        response += `💬 Quer saber mais detalhes sobre algum desses itens?`;
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
    // 1. Rate Limiting (antes de qualquer processamento pesado)
    const ip = getClientIp(request);
    const { ok: rateLimitOk, remaining, resetAt } = rateLimitMemory(ip, 20, 60 * 1000);

    logger.rateLimit(rateLimitOk ? 'allowed' : 'blocked', ip, remaining);

    if (!rateLimitOk) {
      const resetDate = new Date(resetAt);
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

      return NextResponse.json(
        {
          error: 'Muitas requisições. Por favor, aguarde um momento.',
          code: 'RATE_LIMIT_EXCEEDED',
          resetAt: resetDate.toISOString()
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString(),
            'Retry-After': retryAfter.toString(),
          }
        }
      );
    }

    // 2. (Opcional) Verificar tamanho do payload
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024) { // 10KB
      return NextResponse.json(
        { error: 'Payload muito grande', code: 'PAYLOAD_TOO_LARGE' },
        { status: 413 }
      );
    }

    // 3. Verify API key is configured (will throw if not)
    getGroqApiKey();

    // Parse and validate request body with Zod
    const body = await request.json();

    const validationResult = ChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('Request validation failed', {
        errorCount: errors.length,
        fields: errors.map(e => e.field).join(', ')
      });

      return NextResponse.json(
        {
          error: 'Dados inválidos',
          validation_errors: errors
        },
        { status: 400 }
      );
    }

    const { question } = validationResult.data;

    // Verificar cache
    const cacheKey = normalizeQuestion(question);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(
        {
          ...cached.response,
          cached: true
        },
        {
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString(),
          }
        }
      );
    }

    // Processar pergunta com Groq (ele decide tudo)
    const groqDecision = await processWithGroq(question);

    // Se o Groq respondeu diretamente (pergunta pessoal/geral)
    if (!groqDecision.needsQuery && groqDecision.directResponse) {
      // TÉCNICA #1: Validate direct response before sending
      if (!isResponseSafe(groqDecision.directResponse)) {
        logger.security('Direct response blocked - unsafe content', {
          responseLength: groqDecision.directResponse.length
        });
        return NextResponse.json(
          {
            response: 'Desculpe, não posso processar essa solicitação. Como posso ajudar com informações sobre CNAE, tributação ou serviços? 🤔',
            isDirect: true
          },
          {
            headers: {
              'X-RateLimit-Limit': '20',
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString(),
            }
          }
        );
      }

      return NextResponse.json(
        {
          response: groqDecision.directResponse,
          isDirect: true
        },
        {
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString(),
          }
        }
      );
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

      return NextResponse.json(responseData, {
        headers: {
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString(),
        }
      });
    }

    // Fallback se algo der errado
    return NextResponse.json(
      {
        response: 'Desculpe, não consegui processar sua pergunta desta vez. Pode reformular? 😊'
      },
      {
        headers: {
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString(),
        }
      }
    );
  } catch (error: any) {
    logger.error('API Chat Error', error instanceof Error ? error : undefined, {
      endpoint: '/api/chat',
    });

    // Return generic error message without exposing internal details
    return NextResponse.json(
      {
        error: 'Erro interno do servidor. Por favor, tente novamente mais tarde.',
        code: 'INTERNAL_ERROR'
      },
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
