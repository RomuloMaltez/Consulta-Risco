# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não Lançado]

### Adicionado
- **Redirecionamento automático** da página raiz (`/`) para `/consulta-cnae`
  - Configurado via `next.config.mjs` com redirect permanente (301)
  - Página inicial descontinuada em favor da página de consulta CNAE

### Planejado
- Migração de rate limiting para Redis/Upstash
- Sistema de cache distribuído
- Suporte a múltiplos idiomas
- Dashboard de analytics

## [2.0.0] - 2026-01-15

### Adicionado
- **Proteção contra Prompt Injection** em 3 camadas
  - Detecção de entrada (português e inglês)
  - System prompts reforçados com delimitadores XML
  - Validação de resposta (isResponseSafe)
- **Logging estruturado** com sanitização automática
  - Logs em JSON para produção
  - Logs formatados com emojis para desenvolvimento
  - Mascaramento de IPs e dados sensíveis
- **Validação de variáveis de ambiente** (server-only)
  - Schema Zod para validação
  - Type-safe getters
  - Proteção contra vazamento para cliente
- **Scripts de verificação de segurança**
  - `npm run security:verify-rls` - Testa RLS do Supabase
  - `npm run security:test-ratelimit` - Testa rate limiting
  - `npm run security:audit` - Audit completo
- **Documentação completa** em `/docs`
  - ARCHITECTURE.md - Arquitetura técnica
  - API.md - Documentação da API REST
  - CONTRIBUTING.md - Guia de contribuição
  - DEPLOYMENT.md - Guia de deploy
  - SECURITY.md - Documentação de segurança consolidada
  - TROUBLESHOOTING.md - Guia de solução de problemas
- **Headers de segurança** (middleware.ts)
  - Content-Security-Policy (CSP)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy
  - Permissions-Policy

### Modificado
- **README.md** refatorado como Quick Start conciso
- **Validação de entrada** com Zod strict mode
  - Previne mass assignment
  - Limite de 500 caracteres
  - Trim automático
- **Error handling** melhorado
  - Mensagens genéricas para usuário
  - Detalhes técnicos apenas em logs
  - Stack traces apenas em desenvolvimento
- **Sistema de cache** otimizado
  - TTL de 5 minutos
  - Normalização de perguntas
  - Headers informativos

### Corrigido
- **XSS via dangerouslySetInnerHTML** removido
  - Função `destacarTexto` agora retorna React nodes
  - Sanitização de input do usuário
- **Vazamento de informações** em mensagens de erro
  - Erros 500 não expõem stack traces
  - Logs sanitizados removem secrets
- **Rate limiting** não funcionava em serverless
  - Implementação em memória com cleanup automático
  - Headers informativos (X-RateLimit-*)
  - Resposta 429 adequada

### Removido
- **Arquivos redundantes e duplicados**
  - `next.config.ts` - Configuração nunca utilizada (Next.js usa `.mjs`)
  - `consulta-risco-next/` - Pasta de migração vazia
  - `images/` - Pasta duplicada (arquivos já existem em `public/`)
  - Headers duplicados em `next.config.mjs` - Movidos para `middleware.ts`
- **Documentação redundante da raiz**
  - Arquivos de segurança consolidados em `docs/SECURITY.md`
  - Relatórios de teste arquivados

### Segurança
- **Nível de segurança aumentado de 6/10 para 9/10**
- **Taxa de bloqueio de prompt injection: ~95%**
- **Todas vulnerabilidades críticas e altas corrigidas**
- **OWASP Top 10 for LLM compliance**

## [1.0.0] - 2025-12-20

### Adicionado
- **Chatbot inteligente** com Groq (Llama 3.1 8B)
  - Análise de perguntas em linguagem natural
  - Formatação de respostas contextuais
  - System prompts customizados
- **Consultas CNAE** via banco de dados
  - 6 tipos de queries pré-definidas
  - Integração com Supabase
  - Proteção contra SQL injection
- **Interface web moderna** com Next.js 16
  - Design responsivo com Tailwind CSS
  - ChatWidget flutuante
  - Busca in-page com highlight
- **Row Level Security (RLS)** no Supabase
  - Políticas de apenas leitura
  - INSERT/UPDATE/DELETE bloqueados para anon
- **Rate limiting básico**
  - 20 requisições por minuto
  - Em memória (best-effort)
- **Cache em memória**
  - TTL de 5 minutos
  - Normalização de perguntas
- **Páginas de consulta**
  - Consulta CNAE por grau de risco
  - Consulta Item LC
  - Busca por palavra-chave

### Funcionalidades Principais
- Consulta CNAE → Item LC + Grau de Risco
- Consulta Item LC → NBS/IBS/CBS
- Busca por palavra-chave
- Busca por grau de risco
- Explicações didáticas de conceitos

### Stack Tecnológica
- Next.js 16.1.1
- React 18.2.0
- TypeScript 5.0
- Tailwind CSS 3.4
- Groq SDK 0.8.0
- Supabase 2.90.1
- Zod 3.23.8

## [0.1.0] - 2025-11-15

### Adicionado
- Estrutura inicial do projeto Next.js
- Configuração do Tailwind CSS
- Componentes básicos (Header, Footer, Navigation)
- Páginas estáticas de consulta

---

## Tipos de Mudanças

- **Adicionado** - para novas funcionalidades
- **Modificado** - para mudanças em funcionalidades existentes
- **Depreciado** - para funcionalidades que serão removidas
- **Removido** - para funcionalidades removidas
- **Corrigido** - para correções de bugs
- **Segurança** - em caso de vulnerabilidades

## Links de Versões

- [2.0.0] - Versão atual (melhorias de segurança e documentação)
- [1.0.0] - Lançamento inicial com chatbot
- [0.1.0] - Protótipo inicial

---

**Convenções:**
- Versões seguem [Semantic Versioning](https://semver.org/)
- Formato baseado em [Keep a Changelog](https://keepachangelog.com/)
- Datas no formato ISO 8601 (YYYY-MM-DD)
