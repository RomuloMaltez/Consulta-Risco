/**
 * Sistema de Logging Estruturado para Produção
 * 
 * Fornece logging seguro e estruturado, evitando vazamento de informações sensíveis.
 * Em desenvolvimento, mostra logs detalhados. Em produção, sanitiza dados sensíveis.
 */

import 'server-only';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Campos sensíveis que devem ser ocultados nos logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'api_key',
  'apiKey',
  'token',
  'secret',
  'authorization',
  'cookie',
  'session',
  'GROQ_API_KEY',
  'SUPABASE_ANON_KEY',
];

/**
 * Sanitiza objeto removendo ou mascarando campos sensíveis
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Verificar se é campo sensível
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Formata timestamp no formato ISO 8601
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Determina se está em ambiente de produção
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Formata entrada de log para saída estruturada
 */
function formatLogEntry(entry: LogEntry): string {
  const isDev = !isProduction();
  
  if (isDev) {
    // Em desenvolvimento: output legível com cores (se terminal suportar)
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      security: '🔒'
    }[entry.level];

    let output = `${emoji} [${entry.level.toUpperCase()}] ${entry.message}`;
    
    if (entry.context) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    return output;
  } else {
    // Em produção: JSON estruturado para ferramentas de log
    return JSON.stringify(entry);
  }
}

/**
 * Logger principal
 */
class Logger {
  private logLevel: LogLevel = isProduction() ? 'info' : 'debug';

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'security'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: getTimestamp(),
      level,
      message,
    };

    // Sanitizar contexto
    if (context) {
      entry.context = sanitizeObject(context);
    }

    // Adicionar informações de erro
    if (error) {
      entry.error = {
        message: error.message,
        code: (error as any).code,
      };

      // Stack trace apenas em desenvolvimento
      if (!isProduction() && error.stack) {
        entry.error.stack = error.stack;
      }
    }

    const formatted = formatLogEntry(entry);
    
    // Escolher método de console baseado no nível
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'security':
        console.error(formatted);
        break;
    }
  }

  /**
   * Log de debug - apenas em desenvolvimento
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log informativo
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log de aviso
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log de erro
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }

  /**
   * Log de evento de segurança (sempre registrado)
   */
  security(message: string, context?: Record<string, unknown>): void {
    this.log('security', message, context);
  }

  /**
   * Log de tentativa de rate limiting
   */
  rateLimit(action: 'blocked' | 'allowed', ip: string, remaining: number): void {
    this.security(`Rate limit ${action}`, {
      ip: this.maskIp(ip),
      remaining,
    });
  }

  /**
   * Log de tentativa de prompt injection
   */
  promptInjection(question: string, pattern?: string): void {
    this.security('Prompt injection attempt detected', {
      questionPreview: question.substring(0, 100),
      questionLength: question.length,
      detectedPattern: pattern,
    });
  }

  /**
   * Log de erro de validação
   */
  validationError(field: string, message: string, value?: unknown): void {
    this.warn('Validation error', {
      field,
      message,
      valueType: typeof value,
    });
  }

  /**
   * Log de erro de LLM
   */
  llmError(operation: string, error: Error): void {
    this.error(`LLM ${operation} error`, error, {
      operation,
    });
  }

  /**
   * Mascara IP para privacidade (mantém apenas primeiros dois octetos)
   */
  private maskIp(ip: string): string {
    if (ip === 'unknown') return 'unknown';
    
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    
    // IPv6 ou formato desconhecido
    return ip.substring(0, 10) + '...';
  }
}

// Exportar instância singleton
export const logger = new Logger();

/**
 * Exemplo de uso:
 * 
 * import { logger } from '@/lib/logger';
 * 
 * // Logs simples
 * logger.info('API request received');
 * logger.warn('Cache miss', { key: 'user:123' });
 * 
 * // Erros
 * try {
 *   // ...
 * } catch (error) {
 *   logger.error('Database query failed', error, { query: 'SELECT...' });
 * }
 * 
 * // Segurança
 * logger.security('Unauthorized access attempt', { ip: clientIp });
 * logger.promptInjection(userQuestion, 'ignore previous instructions');
 * logger.rateLimit('blocked', clientIp, 0);
 */
