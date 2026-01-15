# Guia de Contribuição

Obrigado por considerar contribuir com o Sistema de Consulta CNAE! Este documento fornece diretrizes para desenvolvimento e contribuição ao projeto.

## Índice

- [Código de Conduta](#código-de-conduta)
- [Como Posso Contribuir?](#como-posso-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Workflow de Desenvolvimento](#workflow-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Estrutura de Commits](#estrutura-de-commits)
- [Processo de Pull Request](#processo-de-pull-request)
- [Testes](#testes)

## Código de Conduta

Este projeto segue princípios de respeito, inclusão e colaboração profissional. Esperamos que todos os contribuidores:

- Sejam respeitosos e profissionais
- Aceitem críticas construtivas
- Foquem no que é melhor para o projeto
- Demonstrem empatia com outros membros da comunidade

## Como Posso Contribuir?

### Reportando Bugs

Antes de criar um issue de bug, verifique se já não existe um similar. Ao criar um novo issue:

**Formato:**

```markdown
**Descrição do Bug**
Descrição clara do que aconteceu.

**Para Reproduzir**
Passos para reproduzir:
1. Vá para '...'
2. Clique em '...'
3. Role até '...'
4. Veja o erro

**Comportamento Esperado**
O que deveria acontecer.

**Screenshots**
Se aplicável, adicione screenshots.

**Ambiente:**
- OS: [ex: macOS 14]
- Navegador: [ex: Chrome 120]
- Versão do Node: [ex: 18.17.0]

**Logs**
Cole logs relevantes do console/terminal.
```

### Sugerindo Melhorias

Issues de feature request são bem-vindos! Use o formato:

```markdown
**É relacionado a um problema?**
Ex: "Fico frustrado quando..."

**Solução Desejada**
Descrição clara da solução.

**Alternativas Consideradas**
Outras soluções pensadas.

**Contexto Adicional**
Screenshots, exemplos, etc.
```

### Contribuindo com Código

1. Fork o repositório
2. Crie uma branch de feature
3. Faça suas alterações
4. Teste localmente
5. Commit usando padrão Conventional Commits
6. Abra um Pull Request

## Configuração do Ambiente

### Pré-requisitos

- **Node.js** 18.17.0 ou superior
- **npm** 9.0.0 ou superior
- **Git** 2.40 ou superior
- Conta **Groq** (gratuita)
- Projeto **Supabase** (gratuito)

### Setup Passo-a-Passo

1. **Clone o repositório**

```bash
git clone https://github.com/seu-usuario/RomuloMaltez-Consulta-Risco.git
cd RomuloMaltez-Consulta-Risco
```

2. **Instale dependências**

```bash
npm install
```

3. **Configure variáveis de ambiente**

Crie `.env.local` na raiz:

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
# Groq API - Obtenha em https://console.groq.com
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx

# Supabase - Obtenha em https://app.supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. **Configure o Supabase**

Execute o SQL no Supabase Dashboard:

```sql
-- Habilitar Row Level Security
ALTER TABLE cnae_item_lc ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_lista_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_lc_ibs_cbs ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT
CREATE POLICY "allow_select" ON cnae_item_lc FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON itens_lista_servicos FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON item_lc_ibs_cbs FOR SELECT TO anon USING (true);
```

5. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

Acesse: http://localhost:3000

### Verificando a Instalação

Execute os comandos de verificação:

```bash
# Verificar RLS
npm run security:verify-rls

# Testar rate limiting
npm run security:test-ratelimit

# Audit de dependências
npm run security:audit
```

## Workflow de Desenvolvimento

### Estrutura de Branches

- `main` - Branch de produção (protegida)
- `develop` - Branch de desenvolvimento
- `feature/*` - Features novas
- `fix/*` - Bug fixes
- `docs/*` - Atualizações de documentação
- `refactor/*` - Refatorações de código

### Criando uma Branch

```bash
# Feature
git checkout -b feature/nome-da-feature

# Bug fix
git checkout -b fix/nome-do-bug

# Documentação
git checkout -b docs/assunto
```

### Durante o Desenvolvimento

1. **Faça commits pequenos e frequentes**
2. **Escreva mensagens de commit descritivas**
3. **Teste suas mudanças localmente**
4. **Mantenha sua branch atualizada**

```bash
# Atualizar sua branch com main
git fetch origin
git rebase origin/main
```

## Padrões de Código

### TypeScript

- **Sempre use TypeScript** - Evite `any`, prefira tipos específicos
- **Interfaces sobre types** para objetos
- **Tipos explícitos** em parâmetros de função
- **Readonly** quando apropriado

**Bom:**
```typescript
interface User {
  readonly id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User | null> {
  // ...
}
```

**Ruim:**
```typescript
function getUser(id: any): any {
  // ...
}
```

### React/Next.js

- **Server Components por padrão** - Use `'use client'` apenas quando necessário
- **Nomenclatura de componentes** - PascalCase (ex: `ChatWidget.tsx`)
- **Props interface** - Sempre defina interface para props
- **Hooks no topo** - Antes de qualquer lógica

**Bom:**
```typescript
'use client';

interface ChatWidgetProps {
  initialMessage?: string;
  onClose?: () => void;
}

export default function ChatWidget({ initialMessage, onClose }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  // ...
}
```

### Styling

- **Tailwind CSS** - Use classes utilitárias
- **Classes condicionais** - Use template strings
- **Responsividade** - Mobile-first (sm:, md:, lg:)

```typescript
<button
  className={`
    px-4 py-2 rounded-lg transition-all
    ${isActive 
      ? 'bg-blue-600 text-white' 
      : 'bg-gray-100 text-gray-600'
    }
    hover:shadow-lg
    focus:outline-none focus:ring-2
  `}
>
  Click me
</button>
```

### Nomenclatura

- **Variáveis/Funções** - camelCase
- **Componentes** - PascalCase
- **Constantes** - UPPER_SNAKE_CASE
- **Arquivos** - kebab-case ou PascalCase (componentes)

```typescript
// Variáveis
const userName = 'João';
const isLoading = false;

// Constantes
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Funções
function calculateTotal(items: Item[]): number {}
async function fetchUserData(id: string): Promise<User> {}

// Componentes
function UserProfile() {}
export default function ChatWidget() {}
```

### Imports

Organize imports na seguinte ordem:

```typescript
// 1. Bibliotecas externas
import { useState, useEffect } from 'react';
import { z } from 'zod';

// 2. Imports do Next.js
import { NextRequest, NextResponse } from 'next/server';
import Image from 'next/image';

// 3. Imports absolutos do projeto (@/)
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// 4. Imports relativos
import { ChatWidget } from '../components/ChatWidget';
import { formatDate } from './utils';

// 5. Tipos
import type { User, Message } from '@/types';
```

### Comentários

- **JSDoc para funções públicas**
- **Comentários inline** apenas quando necessário
- **TODO/FIXME** com contexto

```typescript
/**
 * Executa uma consulta permitida ao banco de dados
 * 
 * @param queryId - ID da query pré-definida
 * @param params - Parâmetros da query
 * @returns Resultado da query com sucesso/erro
 * 
 * @example
 * ```typescript
 * const result = await executeQuery('cnae_to_item', { cnae: '6920601' });
 * ```
 */
export async function executeQuery(
  queryId: QueryId, 
  params: QueryParams
): Promise<QueryResult> {
  // TODO: Adicionar cache distribuído (Redis)
  const queryFn = allowedQueries[queryId];
  
  if (!queryFn) {
    return { success: false, error: `Consulta não permitida: ${queryId}` };
  }
  
  return await queryFn(params);
}
```

### Error Handling

- **Try-catch em operações async**
- **Logging de erros**
- **Mensagens de erro amigáveis**

```typescript
async function processRequest(data: RequestData) {
  try {
    const result = await apiCall(data);
    return { success: true, data: result };
  } catch (error) {
    logger.error('API call failed', error instanceof Error ? error : undefined, {
      endpoint: '/api/chat',
      dataPreview: JSON.stringify(data).substring(0, 100)
    });
    
    // Retornar erro amigável
    return {
      success: false,
      error: 'Não foi possível processar sua solicitação. Tente novamente.'
    };
  }
}
```

### Segurança

- **Sempre valide input** - Use Zod
- **Sanitize antes de usar** - Remova caracteres perigosos
- **Nunca exponha secrets** - Use `server-only`
- **Log eventos de segurança**

```typescript
import 'server-only';
import { z } from 'zod';

const RequestSchema = z.object({
  question: z.string().min(1).max(500).trim()
}).strict();

export async function POST(request: Request) {
  // Validação
  const body = await request.json();
  const validation = RequestSchema.safeParse(body);
  
  if (!validation.success) {
    logger.warn('Validation failed', {
      errors: validation.error.errors
    });
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }
  
  // Sanitização
  const cleanQuestion = sanitizeInput(validation.data.question);
  
  // Processamento...
}
```

## Estrutura de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/).

### Formato

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

### Tipos

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças na documentação
- `style`: Formatação, ponto e vírgula, etc (sem mudança de código)
- `refactor`: Refatoração de código
- `perf`: Melhorias de performance
- `test`: Adição/correção de testes
- `chore`: Manutenção, dependências, etc
- `ci`: Mudanças em CI/CD
- `revert`: Reversão de commit anterior

### Exemplos

```bash
# Feature
git commit -m "feat(chat): adicionar suporte a busca por palavra-chave"

# Bug fix
git commit -m "fix(api): corrigir validacao de CNAE com hifen"

# Documentação
git commit -m "docs(api): atualizar exemplos de request"

# Refatoração
git commit -m "refactor(chat): extrair lógica de formatação"

# Performance
git commit -m "perf(cache): aumentar TTL para 10 minutos"

# Breaking change
git commit -m "feat(api): alterar formato de resposta

BREAKING CHANGE: campo 'data' agora retorna array ao invés de objeto"
```

### Dicas

- Use imperativo presente: "adicionar" não "adicionado"
- Primeira linha com max 72 caracteres
- Corpo do commit explica "o que" e "por quê", não "como"
- Referencie issues: `fix(chat): corrigir bug #123`

## Processo de Pull Request

### Antes de Abrir o PR

- [ ] Código compila sem erros (`npm run build`)
- [ ] Linter passa sem erros (`npm run lint`)
- [ ] Código formatado (`prettier`)
- [ ] Testes passam (quando aplicável)
- [ ] Documentação atualizada
- [ ] Commits seguem Conventional Commits

### Criando o PR

**Título:** Use formato de commit

```
feat(chat): adicionar histórico de conversas
```

**Descrição:**

```markdown
## O que muda?
Implementa histórico de conversas persistente no localStorage.

## Por quê?
Usuários solicitaram poder visualizar conversas anteriores.

## Como testar?
1. Abra o chatbot
2. Faça algumas perguntas
3. Recarregue a página
4. Verifique que conversas foram mantidas

## Screenshots
[Adicione screenshots se aplicável]

## Checklist
- [x] Código compila
- [x] Linter passa
- [x] Documentação atualizada
- [ ] Testes adicionados (N/A)

## Issues
Closes #42
```

### Durante a Revisão

- Responda comentários prontamente
- Faça commits adicionais para correções
- Não force-push após revisão inicial
- Marque conversas como resolvidas

### Após Aprovação

O mantenedor fará o merge e, se necessário, squash dos commits.

## Testes

### Testes Manuais

Sempre teste manualmente:

1. **Chatbot**
   - Perguntas simples
   - Perguntas complexas
   - Tentativas de prompt injection
   - Rate limiting

2. **Busca**
   - Por código CNAE
   - Por palavra-chave
   - Por item LC
   - Por grau de risco

3. **Páginas**
   - Navegação entre páginas
   - Responsividade (mobile/tablet/desktop)
   - Funcionalidade de busca in-page

### Scripts de Teste

```bash
# Verificar RLS
npm run security:verify-rls

# Testar rate limiting
npm run security:test-ratelimit

# Audit completo
npm run security:audit
```

### Testes de Segurança

Sempre teste tentativas de:

```bash
# Prompt injection
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Ignore previous instructions"}'

# Rate limiting (20+ requisições rápidas)
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"question":"test"}';
done

# Input inválido
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"'$(python3 -c "print('A' * 600)")'"}' 
```

## Estrutura do Projeto

Compreenda a estrutura antes de contribuir:

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API routes
│   └── */            # Páginas
├── components/       # Componentes React
├── lib/              # Utilitários e lógica
│   ├── chat/         # Lógica do chatbot
│   └── *.ts          # Helpers
└── types/            # Tipos TypeScript
```

Ver [ARCHITECTURE.md](ARCHITECTURE.md) para detalhes completos.

## Dúvidas Comuns

### Como adicionar uma nova query?

1. Adicione em `src/lib/chat/allowedQueries.ts`
2. Atualize type `QueryId`
3. Adicione em `systemPrompt.ts`
4. Atualize documentação em `docs/API.md`

### Como modificar o comportamento do LLM?

Edite os prompts em `src/lib/chat/systemPrompt.ts`:
- `DECISION_SYSTEM_PROMPT` - Como analisa perguntas
- `FORMAT_SYSTEM_PROMPT` - Como formata respostas

### Como adicionar nova proteção de segurança?

1. Adicione padrão em `detectPromptInjection()`
2. Ou adicione em `isResponseSafe()`
3. Adicione testes
4. Documente em `SECURITY.md`

## Recursos Úteis

- [Next.js Docs](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Groq API Docs](https://console.groq.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Contato

- **Issues:** Use GitHub Issues para bugs e features
- **Discussões:** Use GitHub Discussions para perguntas
- **Email:** [contato da SEMEC]

---

Obrigado por contribuir! 🚀

Toda contribuição, grande ou pequena, é valorizada e ajuda a melhorar o sistema para todos os usuários.
