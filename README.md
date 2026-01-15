# Sistema de Consulta CNAE - SEMEC Porto Velho

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Groq AI](https://img.shields.io/badge/Groq-Llama%203.1-orange)](https://groq.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

Sistema web de consulta inteligente para classificação de atividades econômicas (CNAE) com assistente virtual baseado em IA, desenvolvido para a **Secretaria Municipal de Fazenda de Porto Velho**.

## 🚀 Funcionalidades

- 🤖 **Chatbot Inteligente** com IA (Groq Llama 3.1)
- 🔍 **Busca por CNAE** ou palavra-chave
- 📊 **Consulta NBS/IBS/CBS** (Reforma Tributária)
- 🎯 **Classificação por Grau de Risco** (Alto, Médio, Baixo)
- 🔐 **Sistema Seguro** com múltiplas camadas de proteção
- ⚡ **Rate Limiting** para prevenção de abuso

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Groq (gratuita)
- Projeto Supabase (gratuito)

## ⚡ Quick Start

```bash
# 1. Clone e instale
git clone [seu-repositorio]
cd RomuloMaltez:Consulta-Risco
npm install

# 2. Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 3. Execute em desenvolvimento
npm run dev
```

Acesse: http://localhost:3000/consulta-cnae

> **Nota:** A URL raiz (`/`) redireciona automaticamente para `/consulta-cnae`.

## 🔧 Configuração

### Variáveis de Ambiente

Crie `.env.local` na raiz:

```env
# Groq API (obrigatório) - Obtenha em https://console.groq.com
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx

# Supabase (obrigatórios) - Obtenha em https://app.supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Configurar Supabase

Execute o SQL no Supabase Dashboard (SQL Editor) para configurar segurança:

```sql
-- Habilitar Row Level Security (RLS)
ALTER TABLE cnae_item_lc ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_lista_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_lc_ibs_cbs ENABLE ROW LEVEL SECURITY;

-- Permitir apenas SELECT para usuários anônimos
CREATE POLICY "allow_select" ON cnae_item_lc FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON itens_lista_servicos FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON item_lc_ibs_cbs FOR SELECT TO anon USING (true);
```

## 📚 Documentação

- **[Arquitetura](docs/ARCHITECTURE.md)** - Diagrama técnico e componentes
- **[API](docs/API.md)** - Documentação completa da API REST
- **[Deploy](docs/DEPLOYMENT.md)** - Guia de deploy em produção (Vercel)
- **[Segurança](docs/SECURITY.md)** - Proteções e auditoria
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - FAQ e solução de problemas
- **[Contribuindo](docs/CONTRIBUTING.md)** - Guia para desenvolvedores

## 🏗️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 16, React 18, TypeScript, Tailwind CSS |
| **IA** | Groq SDK (Llama 3.1 8B Instant) |
| **Backend** | Next.js API Routes, Zod |
| **Banco de Dados** | Supabase (PostgreSQL) |
| **Segurança** | RLS, Rate Limiting, Prompt Injection Detection |
| **Deploy** | Vercel (recomendado) |

## 🔒 Segurança

O sistema implementa **3 camadas de segurança**:

1. **Detecção de entrada** - Prompt Injection Detection (PT/EN)
2. **System Prompts reforçados** - Delimitadores XML
3. **Validação de saída** - Response Safety Check

Rate Limiting: 20 requisições/minuto por IP

Ver [docs/SECURITY.md](docs/SECURITY.md) para detalhes completos.

## 📦 Deploy

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Configure as 3 variáveis de ambiente no dashboard da Vercel.

Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para guia completo.

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, leia [CONTRIBUTING.md](docs/CONTRIBUTING.md) antes de enviar um PR.

## 📝 Licença

Este projeto foi desenvolvido para a **SEMEC (Secretaria Municipal de Fazenda de Porto Velho)**.

## 🆘 Suporte

- 📖 **Documentação:** [/docs](docs/)
- 🐛 **Issues:** [GitHub Issues](../../issues)
- 💬 **Contato:** SEMEC Porto Velho

---

**Desenvolvido com ❤️ usando Next.js 16, React 18, Groq AI e Supabase**
