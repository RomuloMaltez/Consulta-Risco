# 🤖 Chatbot CNAE - Documentação

## 📋 Visão Geral

Este chatbot foi implementado para responder perguntas sobre CNAE (Classificação Nacional de Atividades Econômicas), Item LC, IBS e CBS usando o Google Gemini AI e Supabase.

## 🏗️ Arquitetura

```
Usuário → ChatWidget (UI) → API /api/chat → Gemini (roteamento) → Supabase → Resposta
```

### Componentes

1. **ChatWidget** (`src/components/ChatWidget/ChatWidget.tsx`)
   - Interface do usuário flutuante
   - Design moderno com Tailwind CSS
   - Gerenciamento de estado das mensagens

2. **API Endpoint** (`src/app/api/chat/route.ts`)
   - Endpoint POST `/api/chat`
   - Integração com Gemini 1.5 Flash
   - Rate limiting e cache
   - Roteamento de perguntas

3. **Consultas Permitidas** (`src/lib/chat/allowedQueries.ts`)
   - 4 tipos de consultas pré-definidas
   - Segurança: sem SQL arbitrário
   - Limitação de resultados

## 🔐 Segurança e Controle de Custo

### Consultas Permitidas

O sistema **não permite SQL arbitrário**. Apenas estas consultas são permitidas:

1. **`cnae_to_item`** - Consulta CNAE → Item LC + Grau de Risco
   - Exemplo: "CNAE 6920601 qual o item e grau de risco?"

2. **`cnae_details`** - Detalhes básicos de um CNAE
   - Exemplo: "O que é o CNAE 6920601?"

3. **`item_to_details`** - Item LC → Detalhes + NBS/IBS/CBS
   - Exemplo: "Item 17.12 tem qual descrição e NBS?"

4. **`search_text`** - Busca por texto livre
   - Exemplo: "Quais itens relacionados a contabilidade?"

### Limitações

- ✅ **Rate Limiting**: 20 requisições por minuto por IP
- ✅ **Cache**: 5 minutos para perguntas repetidas
- ✅ **Limite de caracteres**: Pergunta máximo 500 caracteres
- ✅ **Limite de resultados**: Máximo 10 resultados por consulta
- ✅ **Sandbox**: Gemini apenas roteia, não executa SQL

## 🚀 Configuração

### 1. Instalar Dependências

```bash
npm install
```

Isso instalará o `@google/generative-ai` (já adicionado ao package.json).

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua chave API do Gemini:

```env
GEMINI_API_KEY=sua_chave_api_aqui
```

**Como obter a chave do Gemini:**

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada

### 3. Executar o Projeto

```bash
npm run dev
```

O chatbot aparecerá como um botão flutuante no canto inferior direito de todas as páginas.

## 💡 Como Usar

### Perguntas Exemplo

1. **Consultar CNAE específico:**
   - "CNAE 6920601 qual o item e grau de risco?"
   - "O que é o CNAE 8599604?"

2. **Consultar Item LC:**
   - "Item 17.12 tem qual descrição?"
   - "Qual o NBS do item 1.01?"

3. **Busca por texto:**
   - "Quais itens relacionados a contabilidade?"
   - "Atividades de advocacia"

### Fluxo de Uso

1. Clique no botão flutuante azul (ícone de mensagem)
2. Digite sua pergunta ou clique em uma sugestão
3. Aguarde a resposta do bot
4. Continue a conversa!

## 🧪 Testes

### Testar Manualmente

Abra o navegador em `http://localhost:3000` e teste as perguntas exemplo acima.

### Testar API Diretamente

```bash
# Health check
curl http://localhost:3000/api/chat

# Enviar pergunta
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"CNAE 6920601 qual o grau de risco?"}'
```

## 📊 Estrutura de Resposta da API

```json
{
  "response": "Texto formatado da resposta...",
  "queryId": "cnae_to_item",
  "params": {
    "cnae": "6920601"
  },
  "success": true,
  "cached": false
}
```

## 🎨 Customização

### Alterar Cores do Chatbot

Edite `src/components/ChatWidget/ChatWidget.tsx`:

```tsx
// Linha ~43: Cor do botão flutuante
className="... bg-gradient-to-r from-blue-600 to-blue-700 ..."

// Linha ~60: Cor do header
className="bg-gradient-to-r from-blue-600 to-blue-700 ..."
```

### Adicionar Novas Consultas

1. Adicione nova função em `src/lib/chat/allowedQueries.ts`
2. Atualize o type `QueryId`
3. Atualize o prompt do Gemini em `src/app/api/chat/route.ts`

## 🐛 Troubleshooting

### "GEMINI_API_KEY não configurada"

- Certifique-se de que o arquivo `.env` existe
- Verifique se a variável está correta: `GEMINI_API_KEY=sua_chave`
- Reinicie o servidor (`npm run dev`)

### "Erro ao conectar ao Supabase"

- Verifique as credenciais em `src/lib/supabase.ts`
- Teste a conexão diretamente no navegador

### Rate Limit Atingido

- Aguarde 1 minuto antes de fazer novas requisições
- O limite é de 20 requisições por minuto por IP

## 📈 Monitoramento

### Logs no Console

O endpoint da API registra erros no console do servidor:

```bash
npm run dev
# Veja os logs em tempo real
```

### Métricas Importantes

- Taxa de cache hit (perguntas repetidas)
- Tempo de resposta
- Erros de rate limiting
- Falhas de parsing do Gemini

## 🔒 Segurança em Produção

### Recomendações

1. **Variáveis de Ambiente**: 
   - NUNCA commite o arquivo `.env`
   - Use variáveis de ambiente do provider (Vercel, etc.)

2. **Rate Limiting Robusto**:
   - Considere usar Redis para rate limiting distribuído
   - Implemente CAPTCHA para proteção adicional

3. **Supabase**:
   - Use Row Level Security (RLS)
   - Configure apenas leitura para a chave anon

4. **Monitoramento**:
   - Configure alertas para uso excessivo
   - Monitore custos da API do Gemini

## 📝 Notas de Desenvolvimento

### Tecnologias Utilizadas

- **Next.js 16** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Google Gemini 1.5 Flash** (AI)
- **Supabase** (Database)
- **Lucide React** (Ícones)

### Estrutura de Arquivos

```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Endpoint da API
│   └── layout.tsx                # Layout com ChatWidget
├── components/
│   └── ChatWidget/
│       └── ChatWidget.tsx        # Componente UI
└── lib/
    ├── chat/
    │   └── allowedQueries.ts     # Consultas permitidas
    └── supabase.ts               # Cliente Supabase
```

## 🚀 Deploy

### Vercel (Recomendado)

1. Faça push do código para GitHub
2. Conecte o repositório no Vercel
3. Adicione a variável de ambiente `GEMINI_API_KEY`
4. Deploy automático!

### Outras Plataformas

Configure a variável de ambiente `GEMINI_API_KEY` em:
- Netlify: Site settings → Environment variables
- Railway: Project → Variables
- AWS/Azure: Configure no serviço correspondente

## 📄 Licença

Este projeto faz parte do sistema de Consulta CNAE da SEMEC Porto Velho.

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique esta documentação
2. Consulte os logs do servidor
3. Teste a API diretamente com curl

---

**Desenvolvido com ❤️ para SEMEC Porto Velho**
